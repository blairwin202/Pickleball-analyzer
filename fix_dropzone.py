path = r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\components\upload\VideoDropzone.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];',
    'const ACCEPTED = ["video/mp4", "video/webm"];'
)
content = content.replace(
    'if (!ACCEPTED.includes(file.type)) return "Please upload a video file (MP4, MOV, AVI, or WebM).";',
    'if (!ACCEPTED.includes(file.type)) return "Please upload an MP4 file. iPhone users: open your video in Photos, tap Share, then Save as MP4.";'
)
content = content.replace(
    'MP4, MOV, AVI, or WebM', 'MP4 or WebM'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")