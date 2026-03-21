"""Extract frames from a video, capped at 30 frames max for any length video."""
import subprocess
import os
from pathlib import Path

def extract_frames(video_path: str, output_dir: str) -> list:
    """
    Extract up to 30 frames evenly spread across the video duration.
    Works for videos of any length from 10 seconds to 5+ minutes.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Get duration first
    duration = get_video_duration(video_path)
    if duration <= 0:
        duration = 30  # fallback

    # Calculate FPS to get max 30 frames
    max_frames = 30
    fps = max_frames / duration
    fps = max(0.1, min(fps, 2.0))  # between 0.1 and 2 FPS

    output_pattern = os.path.join(output_dir, "frame_%04d.jpg")
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", f"fps={fps:.3f},scale=640:360",
        "-q:v", "5",
        "-y",
        output_pattern,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[:500]}")

    frames = sorted(Path(output_dir).glob("frame_*.jpg"))
    print(f"[extractor] Extracted {len(frames)} frames from {duration:.1f}s video at {fps:.2f} FPS")
    return [str(f) for f in frames]

def get_video_duration(video_path: str) -> float:
    """Return video duration in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0
