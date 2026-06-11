import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', read_only=True, data_only=False)

def inspect_sheet(sheet_name, max_r=150):
    sheet = wb[sheet_name]
    print(f"\n=================== SHEET: {sheet_name} ===================")
    for r in range(1, max_r + 1):
        vals = []
        for c in range(1, 8):
            cell = sheet.cell(row=r, column=c)
            vals.append(cell.value)
        if any(v is not None for v in vals):
            print(f"Row {r:03d}: {vals}")

inspect_sheet('BPB Setting', max_r=120)
inspect_sheet('Bom', max_r=150)
wb.close()
