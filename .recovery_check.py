from pathlib import Path
import re, json
root = Path(r"C:\inraynexus\inlaynex2.0")
vite = (root/"vite.config.ts").read_text(encoding="utf-8")
pkg = json.loads((root/"package.json").read_text(encoding="utf-8"))
const = (root/"src/core/constants.ts").read_text(encoding="utf-8")
dist_head = (root/"dist/inlaynexus2.0.js").read_text(encoding="utf-8", errors="replace")[:500]
m = re.search(r"PLUGIN_VERSION = '([^']+)'", vite)
print("vite PLUGIN_VERSION", m.group(1) if m else None)
print("package", pkg["version"])
print("constants fallback", re.search(r": '([^']+)'", const).group(1) if re.search(r": '([^']+)'", const) else None)
print("dist head snippet:", dist_head.split("\n")[0:5])
for ver in ["2.2.9","2.2.10","2.2.11","2.2.12","2.2.13"]:
    print(f"changelog {ver}", f"<strong>{ver}</strong>" in vite)
print("foldersCollapsed", "foldersCollapsed" in vite)
print("gen_options", "gen_options" in vite)
# If version is 2.2.13 but no 2.2.13 changelog/chrome-hide, roll back to 2.2.12
has_213_changelog = "<strong>2.2.13</strong>" in vite
print("has_213_changelog", has_213_changelog)
