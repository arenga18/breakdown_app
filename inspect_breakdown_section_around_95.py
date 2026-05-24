from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Breakdown') as sheet:
        for r_idx, row in enumerate(sheet.rows()):
            if 80 <= r_idx <= 115:
                row_vals = [cell.v for cell in row]
                # Clean trailing None values
                while row_vals and row_vals[-1] is None:
                    row_vals.pop()
                if row_vals:
                    print(f"Row {r_idx}: {row_vals[:20]}")
