import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', data_only=False)
sheet = wb['Data Validation']

print("Row | Col | Value | Formula")
print("-" * 50)
for r in range(8, 200):
    for col_idx, col_letter in enumerate(['W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC']):
        cell = sheet[f"{col_letter}{r}"]
        val = cell.value
        if val is not None and isinstance(val, str) and val.startswith("="):
            print(f"{r:3d} | {col_letter:3s} | {sheet['C' + str(r)].value} | {val}")
