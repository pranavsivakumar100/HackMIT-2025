from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from .auth_jwt import verify_supabase_jwt

router = APIRouter()

class Me(BaseModel):
    sub: str
    email: Optional[str] = None

@router.get('/health')
async def health():
    return {"status": "ok"}

@router.get('/me', response_model=Me)
async def me(authorization: str = Header(default=None)):
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(' ', 1)[1]
    try:
        claims = verify_supabase_jwt(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    return Me(sub=claims.get('sub'), email=claims.get('email'))
