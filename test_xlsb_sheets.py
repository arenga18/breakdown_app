from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
print("Opening xlsb workbook...")
with open_workbook(xlsb_path) as wb:
    print("Sheets available in XLSB:", wb.sheets)
