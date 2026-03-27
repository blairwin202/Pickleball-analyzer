"""
Claude Vision integration - analyzes all 4 court positions separately.
"""
import base64
import json
import re
import time

import anthropic
from app.config import settings

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-sonnet-4-5-20251001"

POSITIONS = [
    {"id": "near-left",  "label": "Player 1 (Near Left)"},
    {"id": "near-right", "label": "Player 2 (Near Right)"},
    {"id": "far-left",   "label": "Player 3 (Far Left)"},
    {"id": "far-right",  "label": "Player 4 (Far Right)"},
]

SYSTEM_A = """You are an expert pickleball coach and DUPR-certified analyst with 10+ years of experience.
Analyze player footage objectively. Focus on technique, not match outcome.
DUPR scale: 2.0=beginner, 2.5=novice, 3.0=recreational, 3.5=solid intermediate,
4.0=advanced, 4.5=strong advanced, 5.0=elite amateur, 5.5+=professional.
Always respond with ONLY valid JSON - no markdown, no explanation outside the JSON."""

PROMPT_A = """Analyze these {n} frames from a pickleball match focusing specifically on {position}.

Computer vision pre-analysis:
- Frames analyzed: {frames_analyzed}
- Court zone distribution: kitchen={kitchen:.0%}, transition={transition:.0%}, baseline={baseline:.0%}
- Player balance score (0-1): {balance_score:.2f}
- Knee bend average: {knee_bend:.0f} degrees

Focus your analysis on the player in the {position} position.

Respond with ONLY this JSON schema:
{{
  "estimated_dupr": <float 1.0-6.0>,
  "confidence": <"low"|"medium"|"high">,
  "confidence_reason": <string, max 60 words>,
  "shot_quality": {{
    "overall": <1-10>,
    "serve": <1-10 or null>,
    "dink": <1-10 or null>,
    "drive": <1-10 or null>,
    "volley": <1-10 or null>,
    "observations": <string, max 120 words>
  }},
  "footwork": {{
    "score": <1-10>,
    "split_step": <"never"|"rarely"|"sometimes"|"consistently">,
    "court_movement": <"poor"|"fair"|"good"|"excellent">,
    "recovery": <"poor"|"fair"|"good"|"excellent">,
    "observations": <string, max 80 words>
  }},
  "positioning": {{
    "score": <1-10>,
    "kitchen_line_awareness": <"poor"|"fair"|"good"|"excellent">,
    "transition_quality": <"poor"|"fair"|"good"|"excellent">,
    "observations": <string, max 80 words>
  }},
  "consistency": {{
    "score": <1-10>,
    "unforced_error_estimate": <"low"|"medium"|"high">,
    "observations": <string, max 60 words>
  }},
  "strengths": [<string>, <string>],
  "weaknesses": [<string>, <string>, <string>]
}}"""

PROMPT_B = """You are a pickleball coach writing improvement tips for a specific player.

Player: {position}
DUPR rating: {dupr}
Weaknesses: {weaknesses}
Footwork: {footwork_obs}
Positioning: {positioning_obs}
Shot technique: {shot_obs}

Write exactly 3 highly specific, actionable tips targeting THIS player's actual weaknesses.
Each tip must include a concrete drill.

Respond with ONLY this JSON:
{{
  "tips": [
    {{
      "title": <string, max 8 words>,
      "category": <"footwork"|"shot_technique"|"positioning"|"strategy"|"mental">,
      "priority": <"high"|"medium"|"low">,
      "tip": <string, max 100 words>,
      "drill": <string, max 70 words>
    }}
  ]
}}"""


def _extract_json(text):
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError(f"Could not parse JSON from Claude response: {text[:200]}")


def _encode_image(path):
    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode()
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}}


def analyze_all_players(frame_paths, cv_metrics):
    zones = cv_metrics.get("court_zones", {})
    pose = cv_metrics.get("pose_metrics", {})
    image_blocks = [_encode_image(p) for p in frame_paths]
    player_results = {}

    for pos in POSITIONS:
        print(f"[claude] Analyzing {pos['label']}...")
        time.sleep(3)
        try:
            text_block = {
                "type": "text",
                "text": PROMPT_A.format(
                    n=len(frame_paths),
                    position=pos["label"],
                    frames_analyzed=cv_metrics.get("frames_analyzed", 0),
                    kitchen=zones.get("kitchen", 0.33),
                    transition=zones.get("transition", 0.33),
                    baseline=zones.get("baseline", 0.34),
                    balance_score=pose.get("balance_score", 0.5),
                    knee_bend=pose.get("knee_bend_avg", 125),
                ),
            }
            response_a = _client.messages.create(
                model=MODEL,
                max_tokens=1500,
                system=SYSTEM_A,
                messages=[{"role": "user", "content": image_blocks + [text_block]}],
            )
            analysis = _extract_json(response_a.content[0].text)
            time.sleep(2)
            response_b = _client.messages.create(
                model=MODEL,
                max_tokens=900,
                messages=[{"role": "user", "content": PROMPT_B.format(
                    position=pos["label"],
                    dupr=analysis["estimated_dupr"],
                    weaknesses="; ".join(analysis.get("weaknesses", [])),
                    footwork_obs=analysis.get("footwork", {}).get("observations", ""),
                    positioning_obs=analysis.get("positioning", {}).get("observations", ""),
                    shot_obs=analysis.get("shot_quality", {}).get("observations", ""),
                )}],
            )
            tips = _extract_json(response_b.content[0].text)
            player_results[pos["id"]] = {
                "label": pos["label"],
                "analysis": analysis,
                "tips": tips.get("tips", []),
            }
        except Exception as e:
            print(f"[claude] CRITICAL ERROR: {e}", flush=True)
            player_results[pos["id"]] = {
                "label": pos["label"],
                "analysis": {"estimated_dupr": 3.0, "confidence": "low", "strengths": [], "weaknesses": []},
                "tips": [],
            }

    return player_results


def analyze_frames(frame_paths, cv_metrics):
    zones = cv_metrics.get("court_zones", {})
    pose = cv_metrics.get("pose_metrics", {})
    image_blocks = [_encode_image(p) for p in frame_paths]
    text_block = {
        "type": "text",
        "text": PROMPT_A.format(
            n=len(frame_paths),
            position="all players",
            frames_analyzed=cv_metrics.get("frames_analyzed", 0),
            kitchen=zones.get("kitchen", 0.33),
            transition=zones.get("transition", 0.33),
            baseline=zones.get("baseline", 0.34),
            balance_score=pose.get("balance_score", 0.5),
            knee_bend=pose.get("knee_bend_avg", 125),
        ),
    }
    response_a = _client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=SYSTEM_A,
        messages=[{"role": "user", "content": image_blocks + [text_block]}],
    )
    analysis = _extract_json(response_a.content[0].text)
    response_b = _client.messages.create(
        model=MODEL,
        max_tokens=900,
        messages=[{"role": "user", "content": PROMPT_B.format(
            position="player",
            dupr=analysis["estimated_dupr"],
            weaknesses="; ".join(analysis.get("weaknesses", [])),
            footwork_obs=analysis.get("footwork", {}).get("observations", ""),
            positioning_obs=analysis.get("positioning", {}).get("observations", ""),
            shot_obs=analysis.get("shot_quality", {}).get("observations", ""),
        )}],
    )
    tips = _extract_json(response_b.content[0].text)
    return {"analysis": analysis, "tips": tips.get("tips", [])}

