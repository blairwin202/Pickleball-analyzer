"""
MediaPipe pose estimation to extract joint angles and balance metrics.
"""
import numpy as np

try:
    import mediapipe as mp
    import cv2
    _pose = mp.solutions.pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
    MEDIAPIPE_AVAILABLE = True
except Exception:
    MEDIAPIPE_AVAILABLE = False
    _pose = None


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Compute angle at joint b given points a, b, c."""
    ba = a - b
    bc = c - b
    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0))))


def analyze_pose_batch(frame_paths: list[str]) -> dict:
    """
    Run MediaPipe pose on a sample of frames and return aggregate metrics.
    Returns dict with balance_score (0-1), knee_bend_avg, elbow_angle_avg.
    """
    if not MEDIAPIPE_AVAILABLE:
        return {"balance_score": 0.5, "knee_bend_avg": 130.0, "elbow_angle_avg": 100.0, "frames_analyzed": 0}

    balance_scores = []
    knee_bends = []
    elbow_angles = []

    # Sample every 3rd frame to save time
    sample = frame_paths[::3][:20]

    for path in sample:
        try:
            import cv2
            img = cv2.imread(path)
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            result = _pose.process(rgb)

            if not result.pose_landmarks:
                continue

            lm = result.pose_landmarks.landmark
            h, w = img.shape[:2]

            def pt(idx):
                l = lm[idx]
                return np.array([l.x * w, l.y * h])

            # Balance: hip-to-ankle vertical alignment
            l_hip = pt(23); r_hip = pt(24)
            l_ankle = pt(27); r_ankle = pt(28)
            hip_center_x = (l_hip[0] + r_hip[0]) / 2
            ankle_center_x = (l_ankle[0] + r_ankle[0]) / 2
            lateral_offset = abs(hip_center_x - ankle_center_x) / w
            balance_scores.append(max(0.0, 1.0 - lateral_offset * 4))

            # Knee bend angle (left knee: hip-knee-ankle)
            l_knee = pt(25)
            knee_angle = _angle(l_hip, l_knee, l_ankle)
            knee_bends.append(knee_angle)

            # Elbow angle (right arm: shoulder-elbow-wrist)
            r_shoulder = pt(12); r_elbow = pt(14); r_wrist = pt(16)
            elbow_angle = _angle(r_shoulder, r_elbow, r_wrist)
            elbow_angles.append(elbow_angle)

        except Exception:
            continue

    return {
        "balance_score": float(np.mean(balance_scores)) if balance_scores else 0.5,
        "knee_bend_avg": float(np.mean(knee_bends)) if knee_bends else 130.0,
        "elbow_angle_avg": float(np.mean(elbow_angles)) if elbow_angles else 100.0,
        "frames_analyzed": len(balance_scores),
    }
