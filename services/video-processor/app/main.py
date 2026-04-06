import asyncio
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import process, health
from app.pipeline.runner import run_pipeline
from app.db.supabase_client import update_analysis
from app.config import settings
import os

app = FastAPI(title="Pickleball Video Processor", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router)
app.include_router(process.router)

currently_processing = set()

async def poll_pending_analyses():
    """Poll Supabase every 30 seconds for pending analyses and process them."""
    from supabase import create_client
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not supabase_key:
        print("[poller] Missing Supabase credentials - polling disabled", flush=True)
        return
    client = create_client(supabase_url, supabase_key)
    print("[poller] Started - checking every 30 seconds for pending analyses", flush=True)
    while True:
        try:
            res = client.from_("analyses")\
                .select("id, video_path, user_id")\
                .eq("status", "pending")\
                .order("created_at", desc=False)\
                .limit(3)\
                .execute()
            pending = res.data or []
            if pending:
                print(f"[poller] Found {len(pending)} pending analyses", flush=True)
            for item in pending:
                aid = item["id"]
                if aid in currently_processing:
                    continue
                print(f"[poller] Triggering pipeline for {aid}", flush=True)
                loop = asyncio.get_event_loop()
                loop.run_in_executor(None, run_pipeline_safe, aid, item["video_path"], item["user_id"])
        except Exception as e:
            print(f"[poller] Error: {e}", flush=True)
        await asyncio.sleep(30)

def run_pipeline_safe(analysis_id, video_path, user_id):
    try:
        if analysis_id in currently_processing:
            print(f"[poller] Skipping {analysis_id} - already processing", flush=True)
            return
        currently_processing.add(analysis_id)
        print(f"[poller] Running pipeline for {analysis_id}", flush=True)
        run_pipeline(analysis_id, video_path, user_id)
        print(f"[poller] Pipeline complete for {analysis_id}", flush=True)
    except Exception as e:
        print(f"[poller] Pipeline failed for {analysis_id}: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
    finally:
        currently_processing.discard(analysis_id)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(poll_pending_analyses())
    print("[startup] Polling loop started", flush=True)
