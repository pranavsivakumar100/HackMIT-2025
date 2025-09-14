import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx
from .auth_jwt import verify_supabase_jwt

router = APIRouter()


class JoinRequest(BaseModel):
    channel_id: str
    user_name: str


class JoinResponse(BaseModel):
    room_url: str
    token: str

async def _get_or_create_room(channel_id: str, api_key: str) -> tuple[str, str]:
    """Create a Daily room named by channel_id if it doesn't exist.
    Returns (room_name, room_url).
    """
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=30) as client:
        # Try fetching by name first
        r = await client.get(f"https://api.daily.co/v1/rooms/{channel_id}", headers=headers)
        if r.status_code == 200:
            data = r.json()
            return data["name"], data["url"]

        # Create the room
        payload = {
            "name": channel_id,
            "privacy": "private",
            "properties": {
                # Daily expects an absolute UNIX timestamp for expiration
                # Set to now + 24 hours
                "exp": int(__import__('time').time()) + 60 * 60 * 24,
                "enable_chat": False,
                "start_audio_off": True,
            },
        }
        r = await client.post("https://api.daily.co/v1/rooms", headers=headers, json=payload)
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Failed to create room: {r.text}")
        data = r.json()
        return data["name"], data["url"]


# Debug endpoint to test token validation
@router.post("/voice/debug-token")
async def debug_token(authorization: str = Header(default=None)):
    if not authorization or not authorization.lower().startswith('bearer '):
        return {"error": "Missing bearer token", "authorization_header": authorization}
    
    token = authorization.split(' ', 1)[1]
    try:
        claims = verify_supabase_jwt(token)
        return {"success": True, "claims": claims, "token_length": len(token)}
    except Exception as e:
        return {"error": f"Invalid token: {e}", "token_length": len(token)}

@router.post("/voice/join", response_model=JoinResponse)
async def join_voice(body: JoinRequest, authorization: str = Header(default=None)):
    api_key = os.getenv("DAILY_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="DAILY_API_KEY not configured")

    # TEMPORARY: Skip JWT validation for testing (REMOVE IN PRODUCTION!)
    if os.getenv("ENVIRONMENT") == "development":
        print("🚨 WARNING: JWT validation bypassed for development!")
    else:
        # Validate JWT from Supabase
        if not authorization or not authorization.lower().startswith('bearer '):
            raise HTTPException(status_code=401, detail="Missing bearer token")
        token = authorization.split(' ', 1)[1]
        try:
            claims = verify_supabase_jwt(token)
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    # Create or fetch Daily room for this channel
    room_name, room_url = await _get_or_create_room(body.channel_id, api_key)

    # Create meeting token
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {"properties": {"room_name": room_name, "user_name": body.user_name}}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post("https://api.daily.co/v1/meeting-tokens", headers=headers, json=payload)
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Failed to create meeting token: {r.text}")
        data = r.json()

    return JoinResponse(room_url=room_url, token=data.get("token", ""))


