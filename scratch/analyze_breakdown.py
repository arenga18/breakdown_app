import json
import re

json_path = "/Applications/Arenga/vscode/breakdown_app/scratch/breakdown_rows_14_198.json"
with open(json_path) as f:
    data = json.load(f)

defined_names = data['defined_names']
rows = data['rows']

print(f"Loaded {len(rows)} rows from JSON.")
print(f"Loaded {len(defined_names)} defined names.")

# 1. Analyze unique formulas per column
col_formulas = {}
col_headers = {}

# We'll normalize formulas by removing row numbers to group similar ones
def normalize_formula(formula, r_num):
    if not formula:
        return ""
    # Replace references to the current row with a placeholder like [ROW]
    # e.g., $H197 -> $H[ROW], J197 -> J[ROW]
    norm = re.sub(rf'\b([A-Z]+){r_num}\b', r'\1[ROW]', formula)
    norm = re.sub(rf'\$([A-Z]+){r_num}\b', r'$\1[ROW]', norm)
    # Also handle surrounding row numbers
    norm = re.sub(rf'\b([A-Z]+)({r_num-1})\b', r'\1[ROW-1]', norm)
    norm = re.sub(rf'\b([A-Z]+)({r_num+1})\b', r'\1[ROW+1]', norm)
    return norm

for r in rows:
    r_num = r['row_number']
    for col_let, col_info in r['columns'].items():
        header = col_info['header']
        col_headers[col_let] = header
        formula = col_info['formula']
        if formula:
            norm = normalize_formula(formula, r_num)
            if col_let not in col_formulas:
                col_formulas[col_let] = {}
            col_formulas[col_let][norm] = col_formulas[col_let].get(norm, 0) + 1

print("\n--- Unique Formulas per Column (Normalized) ---")
for col_let in sorted(col_formulas.keys()):
    header = col_headers[col_let]
    print(f"\nCol {col_let} ({header}):")
    for norm, count in sorted(col_formulas[col_let].items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  Pattern: {norm} (used {count} times)")

# 2. Extract defined names referenced in formulas
referenced_dns = set()
# Words in formulas that aren't sheet names or standard Excel functions
excel_funcs = {'IF', 'IFERROR', 'INDEX', 'MATCH', 'CONCATENATE', 'VLOOKUP', 'TEXT', 'ROUND', 'AND', 'OR', 'NOT', 'SUM', 'SUMPRODUCT', 'SUMIF', 'COUNTIF', 'LEN', 'LEFT', 'RIGHT', 'MID', 'ABS'}

for r in rows:
    for col_info in r['columns'].values():
        formula = col_info['formula']
        if formula:
            # Find all words (alphanumeric and underscores)
            words = re.findall(r'\b[A-Za-z_][A-Za-z0-9_]*\b', formula)
            for w in words:
                if w in defined_names and w not in excel_funcs:
                    referenced_dns.add(w)

print("\n--- Defined Names Referenced in rows 14-198 Formulas ---")
dns_by_sheet = {}
for dns in sorted(referenced_dns):
    dest = defined_names[dns]
    print(f"  {dns} -> {dest}")
    
    # Analyze which sheet this refers to
    match = re.match(r"^'?([^'!]+)'?!", dest)
    if match:
        sheet_ref = match.group(1)
        if sheet_ref not in dns_by_sheet:
            dns_by_sheet[sheet_ref] = []
        dns_by_sheet[sheet_ref].append((dns, dest))
    else:
        if "NoSheet" not in dns_by_sheet:
            dns_by_sheet["NoSheet"] = []
        dns_by_sheet["NoSheet"].append((dns, dest))

print("\n--- Linkages by Reference Sheet ---")
for sheet, dns_list in dns_by_sheet.items():
    print(f"\nSheet: '{sheet}' ({len(dns_list)} defined names):")
    for name, dest in dns_list:
        print(f"  - {name} -> {dest}")
