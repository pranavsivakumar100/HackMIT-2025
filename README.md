# HackMIT 2025 - Dropbox in the Big 2025

A collaborative AI platform built for HackMIT 2025.

## Project Structure

- **Backend**: FastAPI with JWT authentication
- **Frontend**: React + Vite with Supabase integration

## Prerequisites
- Node 18+ (Node 20+ recommended for Vite 7)
- Python 3.10+

## Quick Start

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./run.sh
```

### Frontend Setup
```bash
cd frontend
cp env.example .env.local   # fill with your Supabase credentials
npm install
npm run dev
```

## Features
- JWT-based authentication
- Supabase integration
- Real-time collaboration
- Modern React UI

## Docker Setup (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Quick Start with Docker
```bash
# Clone the repository
git clone <your-repo-url>
cd HackMIT-2025

# Copy environment files and fill in your values
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# Start both services
docker-compose up

# Access your app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup (Alternative)
If you prefer to run without Docker, follow the Quick Start section above.

## Deployment

### Railway (Easiest for HackMIT)
1. Install Railway CLI: `npm install -g @railway/cli`
2. Deploy backend: `cd backend && railway up`
3. Deploy frontend: `cd frontend && railway up`

### Other Platforms
- **Vercel**: Great for frontend, supports full-stack
- **Render**: Free tier available, supports both services
- **Heroku**: Classic choice, easy deployment
- **DigitalOcean App Platform**: Simple container deployment

## Environment Variables

You'll need to create these accounts and get credentials:

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy your Project URL and anon public key

### 2. Environment Files
Fill in these values in your `.env` files:

**Backend (.env):**
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET_KEY=your-super-secret-jwt-key
```

**Frontend (.env.local):**
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE=http://localhost:8000
```
