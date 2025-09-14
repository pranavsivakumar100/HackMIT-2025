from __future__ import annotations
import base64
import json, time, urllib.request, urllib.error
from jose import jwt
from functools import lru_cache
import os

JWKS_CACHE_SECONDS = 300

def _derive_supabase_url_from_anon(anon_key: str) -> str | None:
    try:
        parts = anon_key.split('.')
        if len(parts) < 2:
            return None
        payload_b64 = parts[1]
        padding = '=' * (-len(payload_b64) % 4)
        decoded = base64.urlsafe_b64decode(payload_b64 + padding)
        payload = json.loads(decoded)
        ref = payload.get('ref')
        if not ref:
            return None
        return f'https://{ref}.supabase.co'
    except Exception:
        return None

@lru_cache(maxsize=1)
def _jwks_cached(ts: int) -> dict:
    supabase_url = os.getenv('SUPABASE_URL')
    anon = os.getenv('SUPABASE_ANON_KEY', '')
    if not supabase_url and anon:
        derived = _derive_supabase_url_from_anon(anon)
        if derived:
            supabase_url = derived
    if not supabase_url:
        raise ValueError('SUPABASE_URL not configured and could not derive from SUPABASE_ANON_KEY')

    # Prefer the standard well-known JWKS path
    url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    req = urllib.request.Request(url)
    if anon:
        req.add_header('apikey', anon)
        req.add_header('Authorization', f'Bearer {anon}')
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise ValueError(f'Failed to fetch JWKS from {url}: HTTP {e.code} {e.reason}')
    except urllib.error.URLError as e:
        raise ValueError(f'Failed to reach JWKS endpoint {url}: {e.reason}')

def get_jwks() -> dict:
    return _jwks_cached(int(time.time()/JWKS_CACHE_SECONDS))

def _validate_via_user_endpoint(token: str) -> dict:
    """Fallback validation for projects without public JWKS (HS256 setups).
    Calls /auth/v1/user with the provided access token.
    Returns a minimal claims-like dict.
    """
    supabase_url = os.getenv('SUPABASE_URL')
    anon = os.getenv('SUPABASE_ANON_KEY', '')
    if not supabase_url:
        derived = _derive_supabase_url_from_anon(anon or '')
        if derived:
            supabase_url = derived
    if not supabase_url:
        raise ValueError('SUPABASE_URL not configured and could not derive from SUPABASE_ANON_KEY')

    url = f"{supabase_url.rstrip('/')}/auth/v1/user"
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    if anon:
        req.add_header('apikey', anon)
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            user = json.loads(r.read())
            # Map to claims-like structure
            return {
                'sub': user.get('id') or user.get('user', {}).get('id'),
                'email': user.get('email') or user.get('user', {}).get('email')
            }
    except urllib.error.HTTPError as e:
        raise ValueError(f'Fallback user validation failed: HTTP {e.code} {e.reason}')
    except urllib.error.URLError as e:
        raise ValueError(f'Fallback user validation failed: {e.reason}')

def verify_supabase_jwt(token: str) -> dict:
    jwks = get_jwks()
    keys = jwks.get('keys', [])
    if not keys:
        # No public keys exposed; use fallback
        return _validate_via_user_endpoint(token)

    header = jwt.get_unverified_header(token)
    kid = header.get('kid')
    key = None
    for k in keys:
        if k.get('kid') == kid:
            key = k
            break
    if not key:
        # Could be HS256 setup without kid; use fallback
        return _validate_via_user_endpoint(token)
    return jwt.decode(token, key, algorithms=[key.get('alg','RS256')], options={'verify_aud': False})
