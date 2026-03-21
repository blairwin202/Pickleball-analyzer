import asyncio
from fastapi import APIRouter, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.pipeline.runner import run_pipeline
from app.config import settings

router = APIRouter()


class ProcessRequest(BaseModel):
    analysis_id: str
    video_storage_path: str
    user_id: str


@router.post("/process")
async def process_video(
    req: ProcessRequest,
    background_tasks: BackgroundTasks,
    x_secret: str = Header(default=""),
):
    if x_secret != settings.api_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    background_tasks.add_task(run_pipeline, req.analysis_id, req.video_storage_path, req.user_id)
    return {"status": "queued", "analysis_id": req.analysis_id}
