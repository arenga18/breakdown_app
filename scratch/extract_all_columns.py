import json
import openpyxl

json_path = "/Applications/Arenga/vscode/breakdown_app/scratch/breakdown_rows_14_198.json"
with open(json_path) as f:
    data = json.load(f)

rows = data['rows']
defined_names = data['defined_names']

# We want to identify the headers and formulas for every column from A to CF
# Let's map column letters to their values
cols = [openpyxl.utils.get_column_letter(c) for c in range(1, 85)] # A to CF (CF is 84)

col_info_map = {}

for col in cols:
    col_info_map[col] = {
        'header': None,
        'formulas': set(),
        'example_values': []
    }

for r in rows:
    r_num = r['row_number']
    row_type = r['columns'].get('C', {}).get('value')
    for col in cols:
        col_data = r['columns'].get(col)
        if col_data:
            if not col_info_map[col]['header'] and col_data['header']:
                col_info_map[col]['header'] = col_data['header']
            
            val = col_data['value']
            formula = col_data['formula']
            
            if formula:
                col_info_map[col]['formulas'].add(formula)
            
            if val is not None and len(col_info_map[col]['example_values']) < 3:
                col_info_map[col]['example_values'].append((r_num, row_type, val))

# Write a neat summary to a text file for our analysis
out_path = "/Applications/Arenga/vscode/breakdown_app/scratch/all_columns_summary.txt"
with open(out_path, "w") as f:
    f.write("=== COMPLETE COLUMN A-CF DISSECTION ===\n\n")
    for col in cols:
        info = col_info_map[col]
        header = info['header'] or "(no header)"
        f.write(f"Column {col} ({header}):\n")
        
        if info['formulas']:
            f.write("  Formulas used:\n")
            for form in sorted(list(info['formulas'])):
                f.write(f"    - {form}\n")
        else:
            f.write("  No formula (manual input or empty)\n")
            
        if info['example_values']:
            f.write("  Examples:\n")
            for r_num, row_type, val in info['example_values']:
                f.write(f"    - Row {r_num} ({row_type}): {val}\n")
        f.write("\n")

print("dissection completed! Saved to scratch/all_columns_summary.txt")
