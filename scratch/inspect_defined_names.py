import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', read_only=False)
print("Defined names in workbook:")
for dn in wb.defined_names.definedName:
    print(f"- {dn.name}: {dn.value}")
