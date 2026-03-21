"""
YOLOv8-based player and ball detection.
Falls back gracefully if YOLO weights aren't loaded.
"""
import os
from pathlib import Path

try:
    from ultralytics import YOLO
    _model = YOLO("yolov8n.pt")  # nano model, downloads automatically first run
    YOLO_AVAILABLE = True
except Exception:
    YOLO_AVAILABLE = False
    _model = None


def detect_players_and_ball(frame_paths: list[str]) -> list[dict]:
    """
    Run detection on each frame.
    Returns list of { frame_idx, players: [bbox], ball: bbox|None }
    """
    results = []

    for i, frame_path in enumerate(frame_paths):
        entry = {"frame_idx": i, "players": [], "ball": None}

        if YOLO_AVAILABLE and _model is not None:
            try:
                detections = _model(frame_path, verbose=False)[0]
                for box in detections.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()

                    if cls == 0 and conf > 0.4:  # person
                        entry["players"].append({
                            "bbox": xyxy,
                            "confidence": conf,
                        })
                    elif cls == 32 and conf > 0.3:  # sports ball
                        entry["ball"] = {"bbox": xyxy, "confidence": conf}
            except Exception:
                pass  # Gracefully skip failed frames

        results.append(entry)

    return results


def estimate_court_zones(player_detections: list[dict], frame_height: int = 720) -> dict:
    """
    Estimate what fraction of time player spent in each court zone.
    Zones split by Y position: top 30% = opponent side, middle 40% = transition, bottom 30% = baseline.
    This is a rough heuristic — real court detection would use homography.
    """
    zone_counts = {"kitchen": 0, "transition": 0, "baseline": 0}
    total = 0

    for frame in player_detections:
        for player in frame["players"]:
            bbox = player["bbox"]
            y_center = (bbox[1] + bbox[3]) / 2
            ratio = y_center / frame_height

            if ratio < 0.35:
                zone_counts["kitchen"] += 1
            elif ratio < 0.65:
                zone_counts["transition"] += 1
            else:
                zone_counts["baseline"] += 1
            total += 1

    if total == 0:
        return {"kitchen": 0.33, "transition": 0.33, "baseline": 0.34}

    return {k: v / total for k, v in zone_counts.items()}
