import json
import re

json_path = "/Applications/Arenga/vscode/breakdown_app/scratch/breakdown_rows_14_198.json"
with open(json_path) as f:
    data = json.load(f)

rows = data['rows']
defined_names = data['defined_names']

cols_to_check = [
    'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV',
    'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BY', 'BZ', 'CA', 'CB', 'CC', 'CD', 'CE'
]

print("=== REMAINING COLUMNS FORMULAS ===")
for col in cols_to_check:
    formulas = set()
    header = None
    examples = []
    
    for r in rows:
        r_num = r['row_number']
        c_data = r['columns'].get(col)
        if c_data:
            if not header and c_data['header']:
                header = c_data['header']
            formula = c_data['formula']
            if formula:
                # Normalize row numbers
                norm = re.sub(rf'\b([A-Z]+){r_num}\b', r'\1[ROW]', formula)
                norm = re.sub(rf'\$([A-Z]+){r_num}\b', r'$\1[ROW]', norm)
                formulas.add(norm)
            val = c_data['value']
            if val is not None and len(examples) < 2:
                examples.append(val)
                
    print(f"\nColumn {col} ({header}):")
    if formulas:
        for f in sorted(list(formulas)):
            print(f"  Formula: {f}")
    else:
        print("  No formula (manual or empty)")
    print(f"  Examples: {examples}")
