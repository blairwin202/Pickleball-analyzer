# PickleIQ — AI Pickleball Video Analyzer

Upload pickleball game footage and get:
- **DUPR-equivalent skill rating** (1.0–6.0 scale)
- **Personalized pro tips** with practice drills
- **Game breakdown** — shot quality, footwork, positioning, consistency

## Stack
- **Frontend**: Next.js 15 (PWA) · Tailwind CSS
- **Backend**: FastAPI (Python) video processing microservice
- **AI**: Claude claude-sonnet-4-6 (vision + text)
- **CV**: FFmpeg · YOLOv8 · MediaPipe · OpenCV
- **Database/Auth/Storage**: Supabase

## Quick Start

### 1. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the SQL editor
3. Create a Storage bucket named **`videos`** (private)
4. Add Storage RLS policy: authenticated users can upload/read `{user_id}/*`

### 2. Configure environment variables

**Web app** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VIDEO_PROCESSOR_URL=http://localhost:8000
VIDEO_PROCESSOR_SECRET=pick-any-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Video processor** (`services/video-processor/.env`):
```
ANTHROPIC_API_KEY=your_anthropic_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_SECRET=pick-any-secret  (must match VIDEO_PROCESSOR_SECRET above)
```

### 3. Run locally

**Terminal 1 — Next.js:**
```bash
cd apps/web
npm run dev
# → http://localhost:3000
```

**Terminal 2 — FastAPI:**
```bash
cd services/video-processor
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Deploy
- **Next.js** → [Vercel](https://vercel.com) (push to GitHub, import project)
- **FastAPI** → [Railway](https://railway.app) (create new project, add `services/video-processor`, set env vars)

## Project Structure
```
pickleball-analyzer/
├── apps/web/                   # Next.js frontend (Vercel)
│   ├── app/                    # App Router pages + API routes
│   ├── components/             # UI components
│   ├── hooks/                  # useUpload, useAnalysis
│   └── lib/supabase/           # Supabase client helpers
│
├── services/video-processor/   # FastAPI (Railway)
│   └── app/pipeline/
│       ├── extractor.py        # FFmpeg frame extraction
│       ├── detector.py         # YOLOv8 player/ball detection
│       ├── pose.py             # MediaPipe joint angles
│       ├── analyzer.py         # CV metrics + frame selection
│       ├── claude_client.py    # Claude Vision API calls
│       ├── scorer.py           # Rating algorithm
│       └── runner.py           # Pipeline orchestrator
│
└── supabase-schema.sql         # Database schema + RLS policies
```

## Estimated Cost (personal use, ~20 analyses/month)
| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Railway | Starter | $5 |
| Supabase | Free | $0 |
| Anthropic API | ~$0.10/analysis | ~$2 |
| **Total** | | **~$7/month** |
