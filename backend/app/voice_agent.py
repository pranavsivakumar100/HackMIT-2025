import os
import asyncio
import json
import websockets
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from .auth_jwt import verify_supabase_jwt

router = APIRouter()

class VoiceAgentJoinRequest(BaseModel):
    server_id: str
    channel_id: str
    user_message: str

class VoiceAgentJoinResponse(BaseModel):
    success: bool
    message: str
    agent_id: Optional[str] = None

# Store active voice agents
active_agents = {}

def _require_env(var: str) -> str:
    """Get required environment variable."""
    value = os.getenv(var)
    if not value:
        raise HTTPException(status_code=500, detail=f"{var} environment variable not set")
    return value

async def _create_daily_room_for_agent(channel_id: str, api_key: str) -> tuple[str, str]:
    """Create or get Daily room for the voice agent."""
    headers = {"Authorization": f"Bearer {api_key}"}
    room_name = f"{channel_id}-agent"
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Try fetching by name first
        r = await client.get(f"https://api.daily.co/v1/rooms/{room_name}", headers=headers)
        if r.status_code == 200:
            data = r.json()
            return data["name"], data["url"]

        # Create the room
        payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "exp": int(__import__('time').time()) + 60 * 60 * 24,  # 24 hours
                "enable_chat": False,
                "start_audio_off": False,  # Agent starts with audio on
                "enable_recording": False,
            },
        }
        r = await client.post("https://api.daily.co/v1/rooms", headers=headers, json=payload)
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Failed to create agent room: {r.text}")
        data = r.json()
        return data["name"], data["url"]

async def _create_agent_token(room_name: str, api_key: str) -> str:
    """Create a Daily meeting token for the voice agent."""
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "properties": {
            "room_name": room_name,
            "user_name": "Voice Agent",
            "is_owner": True,
            "enable_screenshare": False,
        }
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post("https://api.daily.co/v1/meeting-tokens", headers=headers, json=payload)
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Failed to create agent token: {r.text}")
        data = r.json()
        return data.get("token", "")

class VoiceAgent:
    def __init__(self, channel_id: str, room_url: str, token: str):
        self.channel_id = channel_id
        self.room_url = room_url
        self.token = token
        self.openai_ws = None
        self.daily_ws = None
        self.is_active = False
        
    async def start(self):
        """Start the voice agent."""
        try:
            # Initialize OpenAI Realtime API connection
            openai_api_key = _require_env("OPENAI_API_KEY")
            
            # Connect to OpenAI Realtime API
            openai_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            self.openai_ws = await websockets.connect(openai_url, extra_headers=headers)
            
            # Configure the session
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": "You are a helpful voice assistant in a team voice channel. Keep your responses conversational and helpful. You can hear and respond to voice messages from team members.",
                    "voice": "alloy",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 200
                    }
                }
            }
            
            await self.openai_ws.send(json.dumps(session_config))
            
            self.is_active = True
            
            # Start listening for audio and handling responses
            await self._handle_realtime_communication()
            
        except Exception as e:
            print(f"Error starting voice agent: {e}")
            self.is_active = False
            raise
    
    async def _handle_realtime_communication(self):
        """Handle bidirectional communication between Daily.co and OpenAI."""
        try:
            while self.is_active:
                # Listen for messages from OpenAI
                if self.openai_ws:
                    try:
                        message = await asyncio.wait_for(self.openai_ws.recv(), timeout=0.1)
                        data = json.loads(message)
                        await self._handle_openai_message(data)
                    except asyncio.TimeoutError:
                        continue
                    except websockets.exceptions.ConnectionClosed:
                        print("OpenAI WebSocket connection closed")
                        break
                
                await asyncio.sleep(0.01)  # Small delay to prevent busy loop
                
        except Exception as e:
            print(f"Error in realtime communication: {e}")
        finally:
            await self.stop()
    
    async def _handle_openai_message(self, data: dict):
        """Handle messages from OpenAI Realtime API."""
        message_type = data.get("type")
        
        if message_type == "response.audio.delta":
            # Stream audio back to Daily.co
            audio_data = data.get("delta", "")
            # TODO: Send audio to Daily.co room
            # This would require Daily.co bot integration
            pass
        elif message_type == "response.done":
            # Response completed
            print("Voice agent response completed")
        elif message_type == "error":
            print(f"OpenAI error: {data}")
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to OpenAI."""
        if self.openai_ws and self.is_active:
            # Convert audio to base64 and send to OpenAI
            import base64
            audio_b64 = base64.b64encode(audio_data).decode()
            
            message = {
                "type": "input_audio_buffer.append",
                "audio": audio_b64
            }
            
            await self.openai_ws.send(json.dumps(message))
    
    async def stop(self):
        """Stop the voice agent."""
        self.is_active = False
        
        if self.openai_ws:
            await self.openai_ws.close()
            self.openai_ws = None
        
        if self.daily_ws:
            await self.daily_ws.close()
            self.daily_ws = None

@router.post("/voice/agent/join", response_model=VoiceAgentJoinResponse)
async def join_voice_agent(
    body: VoiceAgentJoinRequest, 
    authorization: str = Header(default=None)
):
    """Join a voice agent to the specified voice channel."""
    
    # Validate JWT
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    
    token = authorization.split(' ', 1)[1]
    try:
        claims = verify_supabase_jwt(token)
        user_id = claims.get('sub')
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    
    # Get required environment variables
    daily_api_key = _require_env("DAILY_API_KEY")
    openai_api_key = _require_env("OPENAI_API_KEY")
    
    try:
        # Check if agent is already active for this channel
        if body.channel_id in active_agents:
            return VoiceAgentJoinResponse(
                success=False,
                message="Voice agent is already active in this channel"
            )
        
        # For now, we'll simulate the voice agent joining
        # In a full implementation, this would integrate with Daily.co's bot framework
        
        # Store agent as "active" (simulated)
        active_agents[body.channel_id] = {
            "channel_id": body.channel_id,
            "user_id": user_id,
            "started_at": __import__('time').time(),
            "status": "active"
        }
        
        # Start background task to simulate agent responses
        asyncio.create_task(_simulate_voice_agent(body.channel_id, openai_api_key))
        
        return VoiceAgentJoinResponse(
            success=True,
            message="Voice agent joined successfully",
            agent_id=body.channel_id
        )
        
    except Exception as e:
        print(f"Error joining voice agent: {e}")
        return VoiceAgentJoinResponse(
            success=False,
            message=f"Failed to join voice agent: {str(e)}"
        )

async def _simulate_voice_agent(channel_id: str, openai_api_key: str):
    """Simulate voice agent presence (placeholder for full implementation)."""
    try:
        print(f"Voice agent simulation started for channel {channel_id}")
        
        # Add voice agent to presence tracking
        from supabase import create_client
        import os
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if supabase_url and supabase_key:
            supabase = create_client(supabase_url, supabase_key)
            
            # Add voice agent presence
            try:
                supabase.table('voice_presence').insert({
                    'channel_id': channel_id,
                    'user_id': 'voice-agent-bot',
                    'user_name': 'Voice Agent 🤖'
                }).execute()
                print(f"Added voice agent presence for channel {channel_id}")
            except Exception as e:
                print(f"Failed to add voice presence: {e}")
        
        # This is where we would:
        # 1. Connect to Daily.co room as a bot participant
        # 2. Stream audio to/from OpenAI Realtime API
        # 3. Handle voice interactions
        
        # For now, just keep the agent "active" for demonstration
        await asyncio.sleep(300)  # 5 minutes
        
        # Clean up presence
        if supabase_url and supabase_key:
            try:
                supabase.table('voice_presence').delete().eq('channel_id', channel_id).eq('user_id', 'voice-agent-bot').execute()
                print(f"Removed voice agent presence for channel {channel_id}")
            except Exception as e:
                print(f"Failed to remove voice presence: {e}")
        
        # Clean up
        if channel_id in active_agents:
            del active_agents[channel_id]
            print(f"Voice agent simulation ended for channel {channel_id}")
            
    except Exception as e:
        print(f"Voice agent simulation error: {e}")
        if channel_id in active_agents:
            del active_agents[channel_id]

@router.post("/voice/agent/leave/{channel_id}")
async def leave_voice_agent(
    channel_id: str,
    authorization: str = Header(default=None)
):
    """Remove voice agent from the specified channel."""
    
    # Validate JWT
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    
    token = authorization.split(' ', 1)[1]
    try:
        claims = verify_supabase_jwt(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    
    if channel_id in active_agents:
        agent = active_agents[channel_id]
        await agent.stop()
        del active_agents[channel_id]
        return {"success": True, "message": "Voice agent left successfully"}
    
    return {"success": False, "message": "No active voice agent in this channel"}

@router.get("/voice/agent/status/{channel_id}")
async def get_voice_agent_status(
    channel_id: str,
    authorization: str = Header(default=None)
):
    """Get status of voice agent in the specified channel."""
    
    # Validate JWT
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    
    token = authorization.split(' ', 1)[1]
    try:
        claims = verify_supabase_jwt(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    
    is_active = channel_id in active_agents and active_agents[channel_id].is_active
    
    return {
        "channel_id": channel_id,
        "is_active": is_active,
        "agent_count": len(active_agents)
    }
