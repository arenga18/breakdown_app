import re
import json
from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
parts_data = []

# Open and parse the excel workbook
with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Data Validation') as sheet:
        for r_idx, row in enumerate(sheet.rows()):
            # Excel row 8 corresponds to 0-indexed r_idx = 7
            if 7 <= r_idx <= 347:
                row_vals = [cell.v for cell in row]
                
                # Check if name is present
                if len(row_vals) > 2 and row_vals[2]:
                    val = row_vals[3]
                    if isinstance(val, float) and val.is_integer():
                        val = int(val)
                    
                    t_val = row_vals[8]
                    if isinstance(t_val, float) and t_val.is_integer():
                        t_val = int(t_val)
                    
                    part = {
                        'cat': row_vals[0] if row_vals[0] else '',
                        'type': 'prt',
                        'name': str(row_vals[2]).strip(),
                        'val': val if val else '',
                        'code': row_vals[4] if row_vals[4] else '',
                        'jml': int(row_vals[6]) if isinstance(row_vals[6], (int, float)) else 1,
                        'bhn': row_vals[7] if row_vals[7] else '',
                        't': t_val if t_val else '',
                        'tipe_siku': row_vals[9] if row_vals[9] else '',
                        'tipe_screw': row_vals[10] if row_vals[10] else ''
                    }
                    parts_data.append(part)

print(f"Parsed {len(parts_data)} parts successfully.")

# Construct the JS parts representation
js_parts_lines = []
js_parts_lines.append("  parts: [")

def clean_val(v):
    if v is None:
        return "''"
    if isinstance(v, (int, float)):
        return str(v)
    s_val = str(v).replace("'", "\\'")
    return f"'{s_val}'"

for p in parts_data:
    js_parts_lines.append("    {")
    js_parts_lines.append(f"      cat: {clean_val(p['cat'])},")
    js_parts_lines.append(f"      type: 'prt',")
    js_parts_lines.append(f"      name: {clean_val(p['name'])},")
    js_parts_lines.append(f"      val: {clean_val(p['val'])},")
    js_parts_lines.append(f"      code: {clean_val(p['code'])},")
    js_parts_lines.append(f"      jml: {p['jml']},")
    js_parts_lines.append(f"      bhn: {clean_val(p['bhn'])},")
    js_parts_lines.append(f"      t: {clean_val(p['t'])},")
    js_parts_lines.append(f"      tipe_siku: {clean_val(p['tipe_siku'])},")
    js_parts_lines.append(f"      tipe_screw: {clean_val(p['tipe_screw'])},")
    js_parts_lines.append("    },")

js_parts_lines.append("  ],")
js_parts_str = "\n".join(js_parts_lines)

# Read the original initialState.js
with open('/Applications/Arenga/vscode/breakdown_app/src/initialState.js', 'r') as f:
    content = f.read()

# Locate the parts block and replace it
# Start: `parts: [`
# End: `],` followed by `breakdown:`
pattern = r'parts:\s*\[.*?\n\s*\],\s*\n\s*breakdown:'
match = re.search(pattern, content, re.DOTALL)
if match:
    replacement = js_parts_str + "\n  breakdown:"
    updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open('/Applications/Arenga/vscode/breakdown_app/src/initialState.js', 'w') as f:
        f.write(updated_content)
    print("Successfully replaced parts in initialState.js with the parsed Excel parts!")
else:
    print("ERROR: Could not locate parts block in initialState.js!")
