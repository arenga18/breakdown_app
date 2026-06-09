"""
Migrate minifix/dowel columns from Excel Data Validation sheet into partsData.js.
Merges by matching part name (case-insensitive, trimmed).
"""
import json, re, sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("pip install openpyxl")
    sys.exit(1)

# Read Excel
wb = openpyxl.load_workbook('master rekap 2026_Bom.xlsx', data_only=True, read_only=True)
ws = wb['Data Validation']

# Build lookup: normalized name → (minifix, dowel)
xl_map = {}
for row in ws.iter_rows(min_row=7, values_only=True):
    name = row[2]  # C = Name
    minifix = row[10]  # K = minifix
    dowel = row[11]   # L = dowel
    if name and (minifix is not None or dowel is not None):
        key = str(name).strip().lower()
        xl_map[key] = (str(minifix) if minifix else '', str(dowel) if dowel else '')

print(f"Loaded {len(xl_map)} entries from Excel")

# Read partsData.js
src = Path('src/partsData.js').read_text(encoding='utf-8')

# Extract the JSON array (between export const parts = [ and ];
m = re.search(r'export const parts\s*=\s*(\[.*?\]);', src, re.DOTALL)
if not m:
    print("ERROR: could not find parts array in partsData.js")
    sys.exit(1)

parts = json.loads(m.group(1))
matched = 0
added = 0

for p in parts:
    key = p.get('name', '').strip().lower()
    xl = xl_map.get(key)
    if xl:
        minifix_val, dowel_val = xl
        if minifix_val and not p.get('minifix'):
            p['minifix'] = minifix_val
            added += 1
        if dowel_val and not p.get('dowel'):
            p['dowel'] = dowel_val
            added += 1
        matched += 1

# Re-serialize with 2-space indent
new_json = json.dumps(parts, indent=2, ensure_ascii=False)
new_src = f"export const parts = {new_json};\n"
Path('src/partsData.js').write_text(new_src, encoding='utf-8')

print(f"Matched {matched}/{len(parts)} parts, added minifix/dowel to {added} fields")
