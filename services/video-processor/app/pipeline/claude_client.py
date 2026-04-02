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
import os
MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

POSITIONS = [
    {"id": "near-left",  "label": "Player 1 (Near Left)"},
    {"id": "near-right", "label": "Player 2 (Near Right)"},
    {"id": "far-left",   "label": "Player 3 (Far Left)"},
    {"id": "far-right",  "label": "Player 4 (Far Right)"},
]

SYSTEM_A = """You are an expert pickleball coach and DUPR-certified analyst with 10+ years of experience.
Analyze player footage objectively using the official USA Pickleball and DUPR skill band framework.
Assess players against observable behavioral criteria for each band - not by estimating a number.
Skill bands: 3.0-3.3=Developing Intermediate, 3.3-3.5=Solid Intermediate, 3.5-3.7=Advanced Intermediate,
3.7-3.9=Strong Intermediate, 3.9-4.1=Emerging Advanced, 4.1-4.3=Developing Advanced,
4.3-4.5=Solid Advanced, 4.5-4.7=Strong Advanced, 4.7-5.0=Elite Amateur/Pro.
Always respond with ONLY valid JSON - no markdown, no explanation outside the JSON."""

PROMPT_A = """Analyze these {n} frames from a pickleball match focusing specifically on {position}.

Computer vision pre-analysis:
- Frames analyzed: {frames_analyzed}
- Court zone distribution: kitchen={kitchen:.0%}, transition={transition:.0%}, baseline={baseline:.0%}
- Player balance score (0-1): {balance_score:.2f}
- Knee bend average: {knee_bend:.0f} degrees

Focus your analysis on the player in the {position} position.

Use the skill band rubric below to assess which band this player belongs in based on OBSERVABLE behaviors visible in the frames.

SKILL BAND RUBRIC:
3.0-3.3 (Developing Intermediate): Basic court positioning sometimes correct; gets to kitchen line inconsistently; dink rallies 3-4 shots; serves and returns in play but lack depth; no third shot drop attempt.
3.3-3.5 (Solid Intermediate): Consistently moves to kitchen after return; sustains dink rallies 5-8 shots; beginning to distinguish hard vs soft game; serves with some direction and depth; occasionally attempts third shot drop.
3.5-3.7 (Advanced Intermediate): Reliably at kitchen line; uses soft game intentionally; third shot drop attempted regularly; reads opponent positioning; some stacking awareness.
3.7-3.9 (Strong Intermediate): Consistent third shot drop; controls dink placement cross-court vs down-the-line; good split-step and ready position; beginning to attack with purpose; resets hard balls into kitchen.
3.9-4.1 (Emerging Advanced): Identifies and attacks opponent weaknesses; moves as a team with partner; consistent kitchen play under pressure; executes speed-ups and resets; rarely makes unforced errors.
4.1-4.3 (Developing Advanced): Superior shot placement; anticipates play before it happens; consistent across all shot types; strong transition game; good use of power vs patience.
4.3-4.5 (Solid Advanced): Executes ATP and ERNE attempts; uses deception and surprise shots; dominates at kitchen line; exceptional hand speed; controls tempo of play.
4.5-4.7 (Strong Advanced): Near-zero unforced errors; all shots executed under pressure; varies strategy mid-match; strong mental game; tournament-level consistency.
4.7-5.0 (Elite Amateur/Pro): Dominant at every court position; elite speed, agility and anticipation; teaching-level court IQ; competitive at regional/national level.

Respond with ONLY this JSON schema:
{{
  "skill_band": <string, e.g. "3.5-3.7">,
  "skill_band_label": <string, e.g. "Advanced Intermediate">,
  "confidence": <"low"|"medium"|"high">,
  "confidence_reason": <string, max 60 words>,
  "band_skills_demonstrated": [<string>, <string>, <string>],
  "band_skills_missing": [<string>, <string>, <string>],
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
    print(f'[claude] Encoding {len(frame_paths)} frames', flush=True)
    import os
    for p in frame_paths:
        print(f'[claude] Frame exists: {p} = {os.path.exists(p)}', flush=True)
    try:
        image_blocks = [_encode_image(p) for p in frame_paths]
        print(f'[claude] Successfully encoded {len(image_blocks)} images', flush=True)
    except Exception as img_err:
        print(f'[claude] IMAGE ENCODING ERROR: {img_err}', flush=True)
        return {}
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
                    dupr=analysis.get("skill_band", "3.5-3.7"),
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
                "analysis": {"skill_band": "3.0-3.3", "skill_band_label": "Developing Intermediate", "confidence": "low", "strengths": [], "weaknesses": []},
                "tips": [],
            }

    return player_results


def analyze_frames(frame_paths, cv_metrics):
    zones = cv_metrics.get("court_zones", {})
    pose = cv_metrics.get("pose_metrics", {})
    print(f'[claude] Encoding {len(frame_paths)} frames', flush=True)
    import os
    for p in frame_paths:
        print(f'[claude] Frame exists: {p} = {os.path.exists(p)}', flush=True)
    try:
        image_blocks = [_encode_image(p) for p in frame_paths]
        print(f'[claude] Successfully encoded {len(image_blocks)} images', flush=True)
    except Exception as img_err:
        print(f'[claude] IMAGE ENCODING ERROR: {img_err}', flush=True)
        return {}
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
            dupr=analysis.get("skill_band", "3.5-3.7"),
            weaknesses="; ".join(analysis.get("weaknesses", [])),
            footwork_obs=analysis.get("footwork", {}).get("observations", ""),
            positioning_obs=analysis.get("positioning", {}).get("observations", ""),
            shot_obs=analysis.get("shot_quality", {}).get("observations", ""),
        )}],
    )
    tips = _extract_json(response_b.content[0].text)
    return {"analysis": analysis, "tips": tips.get("tips", [])}






