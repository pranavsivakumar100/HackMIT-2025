# Voice Agent Implementation

## Overview
The voice agent allows users to summon an AI assistant into their voice channels using `@Voice join` commands. The agent uses OpenAI's Realtime API for real-time voice interactions.

## How It Works

### Frontend (`AuthView.tsx`)
1. **Message Detection**: Detects `@Voice join` mentions in text channels
2. **Validation**: Checks if user is currently in a voice channel
3. **Backend Communication**: Calls `/voice/agent/join` endpoint
4. **UI Feedback**: Shows status messages during the process

### Backend (`voice_agent.py`)
1. **Authentication**: Validates Supabase JWT tokens
2. **Daily.co Integration**: Creates/manages Daily.co rooms for voice agents
3. **OpenAI Realtime API**: Establishes WebSocket connection to OpenAI
4. **Voice Processing**: Handles bidirectional audio streaming

## Key Features

### ✅ Implemented
- `@Voice join` command detection
- Backend endpoint structure
- OpenAI Realtime API connection setup
- Daily.co room management for agents
- Basic error handling and user feedback

### 🚧 Partially Implemented
- Audio streaming between Daily.co and OpenAI (structure in place)
- Voice agent lifecycle management
- WebSocket message handling

### ❌ Not Yet Implemented
- **Daily.co Bot SDK Integration**: Need to integrate Daily.co's bot SDK to actually join the voice channel
- **Audio Pipeline**: Bidirectional audio streaming between users and OpenAI
- **Voice Activity Detection**: Proper handling of when users speak
- **Agent Presence**: Visual indication of voice agent in the channel
- **Audio Processing**: Converting between different audio formats
- **Cleanup**: Proper cleanup when users leave voice channels

## Required Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key
DAILY_API_KEY=your_daily_api_key
```

## Usage Flow
1. User joins a voice channel
2. User types `@Voice join` in any text channel
3. System validates user is in voice channel
4. Backend creates Daily.co room for agent
5. Agent connects to OpenAI Realtime API
6. Agent joins the voice channel (when fully implemented)
7. Users can talk directly to the AI

## Technical Architecture

### Components
- **Frontend**: React component handling user interactions
- **Backend**: FastAPI endpoints managing agent lifecycle
- **OpenAI Realtime API**: Real-time voice processing
- **Daily.co**: WebRTC infrastructure for voice channels
- **Supabase**: Authentication and presence tracking

### Data Flow
```
User Voice → Daily.co → Voice Agent → OpenAI Realtime API → Voice Agent → Daily.co → User
```

## Next Steps for Full Implementation

### 1. Daily.co Bot Integration
Need to implement actual Daily.co bot that can:
- Join voice channels
- Receive audio streams from users
- Send audio responses back

### 2. Audio Processing Pipeline
- Convert Daily.co audio to OpenAI format (PCM16)
- Handle real-time audio streaming
- Manage buffering and latency

### 3. Enhanced User Experience
- Show voice agent in voice channel participant list
- Add voice agent controls (mute, disconnect)
- Visual indicators when agent is listening/speaking

### 4. Error Handling
- Handle network disconnections
- Manage OpenAI API rate limits
- Graceful degradation when services are unavailable

## Testing the Current Implementation

1. Join a voice channel
2. Type `@Voice join` in a text channel
3. Should see confirmation message that agent is attempting to join
4. Check backend logs for OpenAI connection status

**Note**: The agent won't actually appear in the voice channel yet - that requires Daily.co bot integration which is the next major implementation step.

## OpenAI Realtime API Configuration

The agent is configured with:
- **Model**: `gpt-4o-realtime-preview-2024-10-01`
- **Voice**: `alloy`
- **Audio Format**: PCM16 (for compatibility with Daily.co)
- **Turn Detection**: Server-side voice activity detection
- **Instructions**: Helpful team voice assistant personality

## Architecture Decisions

### Why OpenAI Realtime API?
- Native voice-to-voice processing (no separate TTS/STT needed)
- Low latency for real-time conversations
- Built-in voice activity detection
- High-quality conversational AI

### Why Daily.co?
- Already integrated in the application
- Robust WebRTC infrastructure
- Bot SDK for programmatic participation
- Scalable voice channel management

### Future Enhancements
- Multiple voice models/personalities
- Voice agent training on server context
- Integration with file contents (like text @Claude)
- Voice commands for server actions
