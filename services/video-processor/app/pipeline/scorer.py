"""
Rating algorithm: blend CV metrics (40%) + Claude scores (60%) into DUPR 1.0â€“6.0.
"""


def calculate_rating(cv_metrics: dict, claude_analysis: dict) -> dict:
    """
    Returns { rating: float, confidence: str, component_scores: dict }
    """
    # --- CV-derived composite (each component 0-1) ---
    cv_composite = (
        cv_metrics.get("positioning_score", 0.5) * 0.35
        + cv_metrics.get("footwork_score", 0.5) * 0.35
        + cv_metrics.get("consistency_score", 0.5) * 0.30
    )

    # --- Claude composite (normalize 1-10 scores to 0-1) ---
    shot_q = claude_analysis.get("shot_quality", {}).get("overall", 5) / 10.0
    footwork = claude_analysis.get("footwork", {}).get("score", 5) / 10.0
    positioning = claude_analysis.get("positioning", {}).get("score", 5) / 10.0
    consistency = claude_analysis.get("consistency", {}).get("score", 5) / 10.0

    claude_composite = (
        shot_q * 0.40
        + footwork * 0.25
        + positioning * 0.20
        + consistency * 0.15
    )

    # --- Blend: 60% Claude, 40% CV ---
    blended = claude_composite * 0.60 + cv_composite * 0.40

    # --- Map 0-1 â†’ DUPR 1.0-6.0 (slight exponential curve) ---
    raw_dupr = 1.0 + (blended ** 0.85) * 5.0

    # --- Anchor to Claude's direct DUPR estimate (don't drift > 0.5) ---
    claude_dupr = float(claude_analysis.get("estimated_dupr", 3.0))
    final_dupr = max(claude_dupr - 1.0, min(claude_dupr + 1.0, raw_dupr))

    # Round to nearest 0.25
    final_dupr = round(final_dupr * 4) / 4
    final_dupr = max(1.0, min(6.0, final_dupr))

    # Blended component scores (0-10 scale for display)
    component_scores = {
        "shot_quality": round(shot_q * 10, 1),
        "footwork": round((cv_metrics.get("footwork_score", 0.5) * 0.4 + footwork * 0.6) * 10, 1),
        "positioning": round((cv_metrics.get("positioning_score", 0.5) * 0.4 + positioning * 0.6) * 10, 1),
        "consistency": round((cv_metrics.get("consistency_score", 0.5) * 0.4 + consistency * 0.6) * 10, 1),
    }

    return {
        "rating": final_dupr,
        "confidence": claude_analysis.get("confidence", "medium"),
        "component_scores": component_scores,
    }

