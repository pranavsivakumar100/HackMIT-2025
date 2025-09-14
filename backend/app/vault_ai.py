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


router = APIRouter(prefix="/vaults", tags=["vault-ai"])


class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None  # override default if provided
    max_chars: Optional[int] = 200_000
    include_filenames: Optional[bool] = True


class ChatResponse(BaseModel):
    answer: str
    used_chars: int
    included_files: List[str]


def _require_env(var: str) -> str:
    val = os.getenv(var)
    if not val:
        raise HTTPException(status_code=500, detail=f"Missing environment variable: {var}")
    return val


async def _fetch_vault_files(supabase_url: str, user_token: str, vault_id: str) -> List[dict]:
    headers = {
        "Authorization": f"Bearer {user_token}",
        "apikey": _require_env("SUPABASE_ANON_KEY"),
    }
    # Include extracted_text and text_extracted_at for caching
    url = f"{supabase_url.rstrip('/')}/rest/v1/files"
    params = {
        "select": "id,name,file_path,file_type,file_size,uploaded_at,extracted_text,text_extracted_at",
        "vault_id": f"eq.{vault_id}",
        "order": "uploaded_at.desc",
        "limit": "50",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, headers=headers, params=params)
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=f"Failed to list files: {r.text}")
        return r.json() or []


TEXT_MIME_PREFIXES = (
    "text/",
)
TEXT_MIME_ALLOWLIST = {
    "application/json",
    "application/xml", 
    "application/yaml",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


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
        elif (any(content_type.startswith(p) for p in TEXT_MIME_PREFIXES)
              or content_type.split(";")[0] in TEXT_MIME_ALLOWLIST):
            return data.decode("utf-8", errors="ignore")
        
        # Try UTF-8 decode as fallback
        else:
            try:
                return data.decode("utf-8", errors="ignore")
            except Exception:
                return None
                
    except Exception:
        return None


async def _fetch_file_text(supabase_url: str, user_token: str, bucket: str, path: str, expected_mime: Optional[str], filename: str) -> Optional[str]:
    headers = {
        "Authorization": f"Bearer {user_token}",
        "apikey": _require_env("SUPABASE_ANON_KEY"),
    }
    # Direct object download endpoint
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=headers)
        if r.status_code != 200:
            # Skip unreadable files silently
            return None
        
        content_type = expected_mime or r.headers.get("content-type", "")
        return _extract_text_from_content(r.content, content_type, filename)


async def _update_extracted_text(supabase_url: str, user_token: str, file_id: str, extracted_text: str) -> None:
    """Update the extracted text in the database for caching"""
    headers = {
        "Authorization": f"Bearer {user_token}",
        "apikey": _require_env("SUPABASE_ANON_KEY"),
        "Content-Type": "application/json",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/files"
    payload = {
        "extracted_text": extracted_text,
        "text_extracted_at": "now()"
    }
    async with httpx.AsyncClient(timeout=20) as client:
        # Update the specific file record
        await client.patch(
            url,
            headers=headers,
            params={"id": f"eq.{file_id}"},
            json=payload
        )


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


@router.post("/{vault_id}/chat", response_model=ChatResponse)
async def chat_with_vault(vault_id: str, body: ChatRequest, authorization: str = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    claims = verify_supabase_jwt(token)
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")

    supabase_url = _require_env("SUPABASE_URL")

    # 1) List files for the vault (RLS ensures access via has_vault_perm)
    files = await _fetch_vault_files(supabase_url, token, vault_id)

    # 2) Get text contents from cache or extract from files
    text_chunks: List[tuple[str, str]] = []
    for f in files:
        path = f.get("file_path") or ""
        name = f.get("name") or path.split("/")[-1]
        mime = f.get("file_type") or ""
        file_id = f.get("id")
        cached_text = f.get("extracted_text")
        
        if not path or not file_id:
            continue
            
        text = None
        
        # Use cached text if available
        if cached_text:
            text = cached_text
        else:
            # Extract text from file and cache it
            text = await _fetch_file_text(supabase_url, token, "vault-files", path, mime, name)
            if text:
                # Cache the extracted text in the database
                try:
                    await _update_extracted_text(supabase_url, token, file_id, text)
                except Exception:
                    # Don't fail if caching fails
                    pass
        
        if text and text.strip():
            text_chunks.append((name, text.strip()))

    max_chars = int(body.max_chars or 200_000)
    context, included_files, used_chars = _build_context(text_chunks, max_chars, bool(body.include_filenames))

    # 3) Build prompt and call OpenAI
    if OpenAI is None:
        raise HTTPException(status_code=500, detail="OpenAI SDK not installed on server")
    api_key = _require_env("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)

    model = body.model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    system = (
        "You are a helpful assistant. You are given a knowledge context composed of the user's vault files. "
        "Use only this context when relevant. If the context lacks information, say so clearly."
    )
    user_prompt = (
        f"User question:\n{body.message}\n\n"
        f"Context from vault files (may be truncated):\n{context}\n"
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        answer = resp.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")

    return ChatResponse(answer=answer.strip(), used_chars=used_chars, included_files=included_files)


