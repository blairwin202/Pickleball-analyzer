path = r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\app\api\videos\upload-url\route.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
old = 'const videoPath = user.id + "/" + analysis.id + "/" + fileName;'
new = 'const safeFileName = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "_");\n  const videoPath = user.id + "/" + analysis.id + "/" + safeFileName;'
content = content.replace(old, new)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")