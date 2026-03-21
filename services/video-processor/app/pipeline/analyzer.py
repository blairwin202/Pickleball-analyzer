"""
Compute CV-derived metrics from detection and pose results.
These feed into the rating algorithm alongside Claude's scores.
"""
import numpy as np
from app.pipeline.pose import analyze_pose_batch
from app.pipeline.detector import estimate_court_zones


def compute_cv_metrics(
    frame_paths: list[str],
    player_detections: list[dict],
    pose_metrics: dict,
    court_zones: dict,
) -> dict:
    """
    Combine all CV signals into a normalized metrics dict for scorer.py.
    All values are 0.0 - 1.0 unless noted.
    """
    # --- Positioning: how much time in kitchen/transition vs baseline ---
    # In pickleball, being at the NVZ line is optimal. Reward kitchen + transition.
    positioning_score = court_zones.get("kitchen", 0) * 0.6 + court_zones.get("transition", 0) * 0.4

    # --- Footwork: based on pose balance + knee bend (athletic stance) ---
    balance = pose_metrics.get("balance_score", 0.5)
    knee_bend = pose_metrics.get("knee_bend_avg", 130.0)
    # Athletic knee bend is ~110-140 degrees; penalize > 155 (straight legs) or < 90 (too crouched)
    knee_score = 1.0 - min(abs(knee_bend - 125) / 40.0, 1.0)
    footwork_score = balance * 0.6 + knee_score * 0.4

    # --- Consistency: variance in player bounding box size across frames ---
    # High variance = inconsistent position/movement
    bbox_heights = []
    for frame in player_detections:
        for p in frame["players"]:
            bbox = p["bbox"]
            bbox_heights.append(bbox[3] - bbox[1])

    if len(bbox_heights) > 5:
        cv_variance = float(np.std(bbox_heights) / (np.mean(bbox_heights) + 1e-6))
        consistency_score = max(0.0, 1.0 - cv_variance)
    else:
        consistency_score = 0.5

    # --- Player detection rate (proxy for video quality / player visibility) ---
    frames_with_player = sum(1 for f in player_detections if f["players"])
    detection_rate = frames_with_player / max(len(player_detections), 1)

    return {
        "positioning_score": round(positioning_score, 3),
        "footwork_score": round(footwork_score, 3),
        "consistency_score": round(consistency_score, 3),
        "detection_rate": round(detection_rate, 3),
        "court_zones": court_zones,
        "pose_metrics": pose_metrics,
        "frames_analyzed": len(frame_paths),
    }


def select_key_frames(frame_paths: list[str], player_detections: list[dict], n: int = 10) -> list[str]:
    """
    Select n representative frames for sending to Claude Vision.
    Strategy: pick frames where players are clearly detected + spread across video.
    """
    if len(frame_paths) <= n:
        return frame_paths

    # Prefer frames with detected players
    frames_with_players = [
        (i, p) for i, p in enumerate(player_detections) if p["players"]
    ]

    if len(frames_with_players) >= n:
        # Evenly spaced from frames that have players
        step = len(frames_with_players) // n
        selected_indices = [frames_with_players[i * step][0] for i in range(n)]
    else:
        # Fall back to evenly spaced from all frames
        step = len(frame_paths) // n
        selected_indices = [i * step for i in range(n)]

    return [frame_paths[i] for i in sorted(set(selected_indices))]
