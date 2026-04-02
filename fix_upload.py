path = r"C:\Users\blair\Documents\pickleball-analyzer\apps\web\components\upload\UploadProgress.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(" \u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u201d \%", " \u2014 \%")
content = content.replace("(5\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009c7 min)", "(5\u20137 min)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
