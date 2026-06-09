import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', read_only=True, data_only=False)
sheet = wb['BPB Setting']

print("Rows 1 to 15 in BPB Setting:")
for r in range(1, 16):
    vals = [sheet.cell(row=r, column=c).value for c in range(1, 8)]
    print(f"Row {r:02d}: {[v if v is not None else '' for v in vals]}")
