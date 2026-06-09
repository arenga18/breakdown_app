import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', read_only=True)
print("Sheets in workbook:")
for name in wb.sheetnames:
    print("-", name)
