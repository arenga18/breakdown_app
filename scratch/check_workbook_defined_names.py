import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', read_only=False)

print("Workbook Defined Names:")
for name, dn in wb.defined_names.items():
    print(f"- {name}: {dn.value}")
