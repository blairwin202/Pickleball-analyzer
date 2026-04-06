import asyncio
import traceback
from fastapi import APIRouter, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.pipeline.runner import run_pipeline
from app.config import settings

router = APIRouter()

class ProcessRequest(BaseModel):
    analysis_id: str
    video_storage_path: str
    user_id: str

def run_pipeline_safe(analysis_id: str, video_storage_path: str, user_id: str):
    from app.main import currently_processing
    if analysis_id in currently_processing:
        print(f"[process] Skipping {analysis_id} - already processing", flush=True)
        return
    currently_processing.add(analysis_id)
    try:
        print(f"[process] Starting pipeline for {analysis_id}", flush=True)
        run_pipeline(analysis_id, video_storage_path, user_id)
        print(f"[process] Pipeline complete for {analysis_id}", flush=True)
    except Exception as e:
        print(f"[process] FATAL ERROR for {analysis_id}: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
    finally:
        currently_processing.discard(analysis_id)

@router.post("/process")
async def process_video(
    req: ProcessRequest,
    background_tasks: BackgroundTasks,
    x_secret: str = Header(default=""),
):
    if x_secret != settings.api_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
    print(f"[process] Received request for {req.analysis_id}", flush=True)
    background_tasks.add_task(run_pipeline_safe, req.analysis_id, req.video_storage_path, req.user_id)
    return {"status": "queued", "analysis_id": req.analysis_id}
