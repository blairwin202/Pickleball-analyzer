import os

# ── FILE 1: extractor.py ──────────────────────────────────────────────────────
extractor = (
    '"""Extract frames from a video, prioritizing action frames."""\n'
    'import subprocess\n'
    'import os\n'
    'from pathlib import Path\n\n'
    'def extract_frames(video_path: str, output_dir: str) -> list:\n'
    '    """\n'
    '    Extract up to 40 frames evenly spread across the video.\n'
    '    Uses higher resolution so Claude can see paddle angle and body rotation.\n'
    '    """\n'
    '    os.makedirs(output_dir, exist_ok=True)\n'
    '    duration = get_video_duration(video_path)\n'
    '    if duration <= 0:\n'
    '        duration = 30\n'
    '    max_frames = 40\n'
    '    fps = max_frames / duration\n'
    '    fps = max(0.2, min(fps, 4.0))\n'
    '    output_pattern = os.path.join(output_dir, "frame_%04d.jpg")\n'
    '    cmd = [\n'
    '        "ffmpeg", "-i", video_path,\n'
    '        "-vf", f"fps={fps:.3f},scale=1280:720",\n'
    '        "-q:v", "3",\n'
    '        "-y",\n'
    '        output_pattern,\n'
    '    ]\n'
    '    result = subprocess.run(cmd, capture_output=True, text=True)\n'
    '    if result.returncode != 0:\n'
    '        raise RuntimeError(f"FFmpeg failed: {result.stderr[:500]}")\n'
    '    frames = sorted(Path(output_dir).glob("frame_*.jpg"))\n'
    '    print(f"[extractor] Extracted {len(frames)} frames from {duration:.1f}s video at {fps:.2f} FPS")\n'
    '    return [str(f) for f in frames]\n\n'
    'def get_video_duration(video_path: str) -> float:\n'
    '    """Return video duration in seconds using ffprobe."""\n'
    '    cmd = [\n'
    '        "ffprobe", "-v", "error",\n'
    '        "-show_entries", "format=duration",\n'
    '        "-of", "default=noprint_wrappers=1:nokey=1",\n'
    '        video_path,\n'
    '    ]\n'
    '    result = subprocess.run(cmd, capture_output=True, text=True)\n'
    '    try:\n'
    '        return float(result.stdout.strip())\n'
    '    except ValueError:\n'
    '        return 0.0\n'
)

# ── FILE 2: claude_client.py - rewrite SYSTEM_A and PROMPT_A ─────────────────
claude_path = r"C:\Users\blair\Documents\pickleball-analyzer\services\video-processor\app\pipeline\claude_client.py"
with open(claude_path, "r", encoding="utf-8") as f:
    claude = f.read()

old_system = '''SYSTEM_A = """You are an expert pickleball coach and DUPR-certified analyst with 10+ years of experience.
Analyze player footage objectively using the official USA Pickleball and DUPR skill band framework.
Assess players against observable behavioral criteria for each band - not by estimating a number.
Skill bands: 3.0-3.3=Developing Intermediate, 3.3-3.5=Solid Intermediate, 3.5-3.7=Advanced Intermediate,
3.7-3.9=Strong Intermediate, 3.9-4.1=Emerging Advanced, 4.1-4.3=Developing Advanced,
4.3-4.5=Solid Advanced, 4.5-4.7=Strong Advanced, 4.7-5.0=Elite Amateur/Pro.
Always respond with ONLY valid JSON - no markdown, no explanation outside the JSON."""'''

new_system = '''SYSTEM_A = """You are an expert pickleball coach and DUPR-certified analyst with 10+ years of competitive and coaching experience.
You are analyzing a SEQUENCE of frames from a pickleball match video. Look ACROSS ALL FRAMES together to assess player skill.
Focus on MOTION INDICATORS visible across frames: paddle swing path, body rotation, follow-through, ready position between shots, split step timing, and shot selection patterns.
DO NOT underrate players. Recreational players rarely appear in match footage - assume players are at least 3.5 unless you see clear fundamental errors.
Skill bands: 3.0-3.3=Developing Intermediate, 3.3-3.5=Solid Intermediate, 3.5-3.7=Advanced Intermediate,
3.7-3.9=Strong Intermediate, 3.9-4.1=Emerging Advanced, 4.1-4.3=Developing Advanced,
4.3-4.5=Solid Advanced, 4.5-4.7=Strong Advanced, 4.7-5.0=Elite Amateur/Pro.
Always respond with ONLY valid JSON - no markdown, no explanation outside the JSON."""'''

old_prompt = '''PROMPT_A = """Analyze these {n} frames from a pickleball match focusing specifically on {position}.

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
4.7-5.0 (Elite Amateur/Pro): Dominant at every court position; elite speed, agility and anticipation; teaching-level court IQ; competitive at regional/national level.'''

new_prompt = '''PROMPT_A = """You are analyzing {n} sequential frames from a pickleball match video. These frames show MOTION across time - study them together as a sequence, not as individual snapshots.

Player to assess: {position}

Computer vision data:
- Court zone time: kitchen={kitchen:.0%}, transition={transition:.0%}, baseline={baseline:.0%}
- Balance score (0-1): {balance_score:.2f}
- Knee bend avg: {knee_bend:.0f} degrees

WHAT TO LOOK FOR ACROSS THE FRAME SEQUENCE:
1. SERVE & RETURN: Baseline stance, trophy position, contact point, follow-through direction, depth of return
2. DRIVES & GROUNDSTROKES: Shoulder rotation, paddle takeback, swing path, wrist snap at contact, weight transfer
3. DINKS: Soft hands, paddle face angle, cross-court vs down-line placement, reset ability under pressure
4. VOLLEYS: Ready position, compact swing, punch vs block, reaction time between frames
5. COURT MOVEMENT: Split step visible between shots, lateral shuffle, recovery positioning after each shot
6. THIRD SHOT DROP: Attempt visible? Soft arc trajectory? Landing near kitchen line?
7. KITCHEN PLAY: Time at NVZ line, hand speed in exchanges, ERNE or ATP positioning

IMPORTANT CALIBRATION:
- Players in organized match footage are almost never below 3.3
- Good athletic stance + kitchen presence = minimum 3.5
- Consistent dinking + third shot attempts = 3.7+
- Purposeful shot placement + resets under pressure = 4.0+
- Speed-ups, ERNEs, deception = 4.3+
- If you can see clean mechanics across multiple frames, rate accordingly - do not default low

SKILL BAND RUBRIC:
3.0-3.3 (Developing Intermediate): Basic court positioning sometimes correct; gets to kitchen line inconsistently; dink rallies 3-4 shots; serves and returns in play but lack depth; no third shot drop attempt.
3.3-3.5 (Solid Intermediate): Consistently moves to kitchen after return; sustains dink rallies 5-8 shots; beginning to distinguish hard vs soft game; serves with some direction and depth; occasionally attempts third shot drop.
3.5-3.7 (Advanced Intermediate): Reliably at kitchen line; uses soft game intentionally; third shot drop attempted regularly; reads opponent positioning; some stacking awareness.
3.7-3.9 (Strong Intermediate): Consistent third shot drop; controls dink placement cross-court vs down-the-line; good split-step and ready position; beginning to attack with purpose; resets hard balls into kitchen.
3.9-4.1 (Emerging Advanced): Identifies and attacks opponent weaknesses; moves as a team with partner; consistent kitchen play under pressure; executes speed-ups and resets; rarely makes unforced errors.
4.1-4.3 (Developing Advanced): Superior shot placement; anticipates play before it happens; consistent across all shot types; strong transition game; good use of power vs patience.
4.3-4.5 (Solid Advanced): Executes ATP and ERNE attempts; uses deception and surprise shots; dominates at kitchen line; exceptional hand speed; controls tempo of play.
4.5-4.7 (Strong Advanced): Near-zero unforced errors; all shots executed under pressure; varies strategy mid-match; strong mental game; tournament-level consistency.
4.7-5.0 (Elite Amateur/Pro): Dominant at every court position; elite speed, agility and anticipation; teaching-level court IQ; competitive at regional/national level.'''

claude = claude.replace(old_system, new_system)
claude = claude.replace(old_prompt, new_prompt)

with open(claude_path, "w", encoding="utf-8") as f:
    f.write(claude)
print("claude_client.py updated!")

# Write extractor
extractor_path = r"C:\Users\blair\Documents\pickleball-analyzer\services\video-processor\app\pipeline\extractor.py"
with open(extractor_path, "w", encoding="utf-8") as f:
    f.write(extractor)
print("extractor.py updated!")
print("ALL DONE")