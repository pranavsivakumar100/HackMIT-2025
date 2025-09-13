from __future__ import annotations
import json, time, urllib.request
from jose import jwt
from functools import lru_cache

JWKS_CACHE_SECONDS = 300

@lru_cache(maxsize=1)
def _jwks_cached(ts: int) -> dict:
    import os
    supabase_url = os.getenv('SUPABASE_URL', 'https://api.supabase.com')
    url = f'{supabase_url}/auth/v1/keys'
    with urllib.request.urlopen(url, timeout=5) as r:
        return json.loads(r.read())

def get_jwks() -> dict:
    return _jwks_cached(int(time.time()/JWKS_CACHE_SECONDS))

def verify_supabase_jwt(token: str) -> dict:
    jwks = get_jwks()
    header = jwt.get_unverified_header(token)
    kid = header.get('kid')
    key = None
    for k in jwks.get('keys', []):
        if k.get('kid') == kid:
            key = k
            break
    if not key:
        raise ValueError('Signing key not found')
    return jwt.decode(token, key, algorithms=[key.get('alg','RS256')], options={'verify_aud': False})
