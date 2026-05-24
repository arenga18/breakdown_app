from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Breakdown') as sheet:
        for r_idx, row in enumerate(sheet.rows()):
            if 7 <= r_idx <= 15:
                row_vals = [cell.v for cell in row]
                print(f"Row {r_idx}: {row_vals[:40]}")
