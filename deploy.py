"""
deploy.py — Bundle Asset Management Litigation Monitor into a single portable HTML file.

Usage:
    python deploy.py

Output: dist/app.html  (single file, no external dependencies except Google Fonts + xlsx CDN)
"""
import os, re

# ── Paths ──────────────────────────────────────────────────────────
BASE    = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, 'dist')
os.makedirs(OUT_DIR, exist_ok=True)

def read(path):
    with open(os.path.join(BASE, path), encoding='utf-8') as f:
        return f.read()

# ── Read source files ──────────────────────────────────────────────
html = read('index.html')
css  = read('css/style.css')

js_order = [
    'js/utils.js',
    'js/engine.js',
    'js/main.js',
    'js/kpi.js',
    'js/forecast.js',
]
js_bundle = '\n\n'.join(read(p) for p in js_order)

# ── Inline CSS ─────────────────────────────────────────────────────
html = html.replace(
    '<link rel="stylesheet" href="css/style.css">',
    f'<style>\n{css}\n</style>'
)

# ── Remove individual <script src> tags ───────────────────────────
for p in js_order:
    fname = os.path.basename(p)
    html = re.sub(rf'<script src="js/{fname}"></script>\s*', '', html)

# ── Inject bundled JS before </body> ──────────────────────────────
html = html.replace(
    '</body>',
    f'\n<script>\n{js_bundle}\n</script>\n</body>'
)

# ── Write output ───────────────────────────────────────────────────
out_path = os.path.join(OUT_DIR, 'app.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = os.path.getsize(out_path) / 1024
print(f"✓  Built: dist/app.html  ({size_kb:.1f} KB)")
