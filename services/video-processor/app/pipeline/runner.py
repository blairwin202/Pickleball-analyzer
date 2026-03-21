"""
Main pipeline orchestrator - analyzes all 4 court positions.
"""
import os
import shutil
import traceback
from datetime import datetime, timezone

from app.db.supabase_client import update_analysis, insert_tip, download_video, delete_video
from app.pipeline.extractor import extract_frames, get_video_duration
from app.pipeline.detector import detect_players_and_ball, estimate_court_zones
from app.pipeline.pose import analyze_pose_batch
from app.pipeline.analyzer import compute_cv_metrics, select_key_frames
from app.pipeline.claude_client import analyze_all_players
from app.pipeline.scorer import calculate_rating

TMP_BASE = "/tmp/pickleball"


def run_pipeline(analysis_id: str, video_storage_path: str, user_id: str):
    work_dir = f"{TMP_BASE}/{analysis_id}"
    os.makedirs(work_dir, exist_ok=True)
    video_path = f"{work_dir}/input.mp4"

    try:
        _update(analysis_id, {"status": "processing", "processing_started_at": _now()})
        download_video(video_storage_path, video_path)

        duration = get_video_duration(video_path)
        _update(analysis_id, {"video_duration": int(duration)})

        frames_dir = f"{work_dir}/frames"
        frame_paths = extract_frames(video_path, frames_dir)

        if not frame_paths:
            raise ValueError("No frames extracted from video. Check video format.")

        player_detections = detect_players_and_ball(frame_paths)
        court_zones = estimate_court_zones(player_detections)
        pose_metrics = analyze_pose_batch(frame_paths)
        cv_metrics = compute_cv_metrics(frame_paths, player_detections, pose_metrics, court_zones)
        key_frames = select_key_frames(frame_paths, player_detections, n=4)

        print(f"[pipeline] Analyzing all 4 players...")
        player_results = analyze_all_players(key_frames, cv_metrics)

        # Use Player 1 (near-left) as the primary/default result
        primary = player_results.get("near-left", {})
        primary_analysis = primary.get("analysis", {})
        primary_tips = primary.get("tips", [])

        rating_result = calculate_rating(cv_metrics, primary_analysis)

        _update(analysis_id, {
            "status": "complete",
            "processing_completed_at": _now(),
            "rating": rating_result["rating"],
            "rating_confidence": rating_result["confidence"],
            "component_scores": rating_result["component_scores"],
            "shot_analysis": primary_analysis.get("shot_quality"),
            "footwork_analysis": primary_analysis.get("footwork"),
            "positioning_analysis": primary_analysis.get("positioning"),
            "strengths": primary_analysis.get("strengths", []),
            "weaknesses": primary_analysis.get("weaknesses", []),
            "raw_cv_metrics": cv_metrics,
            "player_results": player_results,
        })

        for tip in primary_tips:
            insert_tip({
                "analysis_id": analysis_id,
                "user_id": user_id,
                "title": tip.get("title", ""),
                "category": tip.get("category", "general"),
                "priority": tip.get("priority", "medium"),
                "tip_text": tip.get("tip", ""),
                "drill_text": tip.get("drill"),
            })

        try:
            delete_video(video_storage_path)
        except Exception:
            pass

    except Exception as e:
        tb = traceback.format_exc()
        print(f"[pipeline] ERROR for {analysis_id}: {tb}")
        _update(analysis_id, {
            "status": "failed",
            "error_message": str(e)[:500],
            "processing_completed_at": _now(),
        })

    finally:
        try:
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass


def _update(analysis_id: str, data: dict):
    update_analysis(analysis_id, data)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

