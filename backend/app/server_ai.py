from __future__ import annotations
import os
import io
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from .auth_jwt import verify_supabase_jwt

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore

try:
    import PyPDF2
    from docx import Document
except Exception:
    PyPDF2 = None
    Document = None


router = APIRouter(prefix="/servers", tags=["server-ai"])


class ServerChatRequest(BaseModel):
    message: str
    channel_id: str
    model: Optional[str] = None
    max_chars: Optional[int] = 150_000
    include_filenames: Optional[bool] = True


class ServerChatResponse(BaseModel):
    answer: str
    used_chars: int
    included_files: List[str]


def _require_env(var: str) -> str:
    val = os.getenv(var)
    if not val:
        raise HTTPException(status_code=500, detail=f"Missing environment variable: {var}")
    return val


async def _fetch_server_files(supabase_url: str, user_token: str, server_id: str) -> List[dict]:
    headers = {
        "Authorization": f"Bearer {user_token}",
        "apikey": _require_env("SUPABASE_ANON_KEY"),
    }
    # Get server files from server_files table
    url = f"{supabase_url.rstrip('/')}/rest/v1/server_files"
    params = {
        "select": "id,name,size,file_path,file_type,created_at,uploaded_by",
        "server_id": f"eq.{server_id}",
        "order": "created_at.desc",
        "limit": "30",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, headers=headers, params=params)
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=f"Failed to list server files: {r.text}")
        return r.json() or []


def _extract_text_from_content(data: bytes, content_type: str, filename: str) -> Optional[str]:
    """Extract text from file content based on MIME type and filename"""
    try:
        # PDF files
        if content_type == "application/pdf" or filename.lower().endswith('.pdf'):
            if PyPDF2 is None:
                return None
            try:
                reader = PyPDF2.PdfReader(io.BytesIO(data))
                text_parts = []
                for page in reader.pages:
                    text_parts.append(page.extract_text())
                return "\n".join(text_parts)
            except Exception:
                return None
        
        # Word documents (.docx)
        elif (content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
              or filename.lower().endswith('.docx')):
            if Document is None:
                return None
            try:
                doc = Document(io.BytesIO(data))
                text_parts = []
                for paragraph in doc.paragraphs:
                    text_parts.append(paragraph.text)
                return "\n".join(text_parts)
            except Exception:
                return None
        
        # Plain text and other text formats
        elif content_type.startswith("text/") or content_type in [
            "application/json", "application/xml", "application/yaml"
        ]:
            return data.decode("utf-8", errors="ignore")
        
        # Try UTF-8 decode as fallback
        else:
            try:
                return data.decode("utf-8", errors="ignore")
            except Exception:
                return None
                
    except Exception:
        return None


async def _fetch_server_file_text(supabase_url: str, user_token: str, bucket: str, path: str, content_type: str, filename: str) -> Optional[str]:
    headers = {
        "Authorization": f"Bearer {user_token}",
        "apikey": _require_env("SUPABASE_ANON_KEY"),
    }
    # Direct object download endpoint for server files
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=headers)
        if r.status_code != 200:
            return None
        
        return _extract_text_from_content(r.content, content_type or "", filename)


def _build_context(big_chunks: List[tuple[str, str]], max_chars: int, include_filenames: bool) -> tuple[str, List[str], int]:
    included: List[str] = []
    pieces: List[str] = []
    remaining = max_chars
    for fname, text in big_chunks:
        if not text:
            continue
        header = f"\n\n===== FILE: {fname} =====\n" if include_filenames else "\n\n"
        need = len(header) + len(text)
        if need > remaining:
            # Truncate text to fit
            take = max(0, remaining - len(header))
            if take <= 0:
                break
            pieces.append(header)
            pieces.append(text[:take])
            included.append(fname + " (truncated)")
            remaining = 0
            break
        pieces.append(header)
        pieces.append(text)
        included.append(fname)
        remaining -= need
        if remaining <= 0:
            break
    combined = "".join(pieces).strip()
    return combined, included, max_chars - remaining


@router.post("/{server_id}/chat", response_model=ServerChatResponse)
async def chat_with_server(server_id: str, body: ServerChatRequest, authorization: str = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    claims = verify_supabase_jwt(token)
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")

    supabase_url = _require_env("SUPABASE_URL")

    # 1) Verify user has access to this server via channel membership
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": _require_env("SUPABASE_ANON_KEY"),
    }
    
    # Check if user is a server member through the channel
    channel_check_url = f"{supabase_url.rstrip('/')}/rest/v1/channels"
    channel_params = {
        "select": "server_id",
        "id": f"eq.{body.channel_id}",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(channel_check_url, headers=headers, params=channel_params)
        if r.status_code != 200:
            raise HTTPException(status_code=403, detail="Cannot access channel")
        channels = r.json()
        if not channels or channels[0].get("server_id") != server_id:
            raise HTTPException(status_code=403, detail="Channel not in server")

    # 2) List server files
    server_files = await _fetch_server_files(supabase_url, token, server_id)

    # 3) Extract text from server files
    text_chunks: List[tuple[str, str]] = []
    for f in server_files:
        file_path = f.get("file_path") or ""
        name = f.get("name") or file_path.split("/")[-1] if file_path else "unknown"
        file_type = f.get("file_type") or ""
        
        if not file_path:
            continue
            
        # For server files, the path is typically server-files/{server_id}/{filename}
        text = await _fetch_server_file_text(supabase_url, token, "server-files", file_path, file_type, name)
        if text and text.strip():
            text_chunks.append((name, text.strip()))

    max_chars = int(body.max_chars or 150_000)
    context, included_files, used_chars = _build_context(text_chunks, max_chars, bool(body.include_filenames))

    # 4) Build prompt and call OpenAI
    if OpenAI is None:
        raise HTTPException(status_code=500, detail="OpenAI SDK not installed on server")
    api_key = _require_env("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)

    model = body.model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    system = (
        "You are Claude, a helpful AI assistant in a team server. You can see files shared in the server's cloud storage. "
        "Answer questions based on the provided context from server files. Be conversational and helpful. "
        "If you don't have enough context, say so clearly."
    )
    
    # Clean the message of @Claude mentions
    clean_message = body.message.replace("@Claude", "").replace("@claude", "").strip()
    
    user_prompt = f"Question: {clean_message}"
    if context:
        user_prompt += f"\n\nContext from server files:\n{context}"

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        answer = resp.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")

    return ServerChatResponse(answer=answer.strip(), used_chars=used_chars, included_files=included_files)
