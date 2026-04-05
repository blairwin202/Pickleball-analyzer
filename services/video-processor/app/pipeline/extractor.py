import subprocess
import os
from pathlib import Path

def convert_to_mp4(input_path: str, output_path: str) -> str:
    print(f"[extractor] Converting {Path(input_path).suffix} to mp4...")
    cmd = [
        "ffmpeg", "-i", input_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-y",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg conversion failed: {result.stderr[:500]}")
    print("[extractor] Conversion complete")
    return output_path

def extract_frames(video_path: str, output_dir: str) -> list:
    os.makedirs(output_dir, exist_ok=True)
    suffix = Path(video_path).suffix.lower()
    if suffix != ".mp4":
        mp4_path = str(Path(video_path).with_suffix(".mp4"))
        video_path = convert_to_mp4(video_path, mp4_path)
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
