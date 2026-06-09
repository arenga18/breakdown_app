import json
import re

json_path = "/Applications/Arenga/vscode/breakdown_app/scratch/breakdown_rows_14_198.json"
with open(json_path) as f:
    data = json.load(f)

rows = data['rows']
cols = ['AP', 'AQ', 'AR', 'AS', 'AT', 'AU']

for col in cols:
    formulas = set()
    header = None
    
    for r in rows:
        r_num = r['row_number']
        c_data = r['columns'].get(col)
        if c_data:
            if not header and c_data['header']:
                header = c_data['header']
            formula = c_data['formula']
            if formula:
                norm = re.sub(rf'\b([A-Z]+){r_num}\b', r'\1[ROW]', formula)
                norm = re.sub(rf'\$([A-Z]+){r_num}\b', r'$\1[ROW]', norm)
                formulas.add(norm)
                
    print(f"Col {col} ({header}):")
    if formulas:
        for f in sorted(list(formulas))[:3]: # print first 3 unique normalized formulas
            print(f"  - {f}")
    else:
        print("  - (no formula)")
