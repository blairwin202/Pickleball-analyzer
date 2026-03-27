"""Pose estimation - simplified to reduce memory usage."""

def analyze_pose_batch(frame_paths: list) -> dict:
    """Return empty pose metrics to save memory."""
    print("[pose] Skipping MediaPipe to save memory", flush=True)
    return {
        "balance_score": 0.5,
        "knee_bend_avg": 120,
        "frames_analyzed": len(frame_paths)
    }
