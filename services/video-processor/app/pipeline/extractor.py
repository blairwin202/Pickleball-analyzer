"""Extract frames from a video, prioritizing action frames."""
import subprocess
import os
from pathlib import Path

def extract_frames(video_path: str, output_dir: str) -> list:
    """
    Extract up to 40 frames evenly spread across the video.
    Uses higher resolution so Claude can see paddle angle and body rotation.
    """
    os.makedirs(output_dir, exist_ok=True)
    duration = get_video_duration(video_path)
    if duration <= 0:
        duration = 30
    max_frames = 40
    fps = max_frames / duration
    fps = max(0.2, min(fps, 4.0))
    output_pattern = os.path.join(output_dir, "frame_%04d.jpg")
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", f"fps={fps:.3f},scale=1280:720",
        "-q:v", "3",
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
