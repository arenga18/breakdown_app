from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Breakdown') as sheet:
        print("Listing unique Ref cabinet codes in Breakdown sheet:")
        count = 0
        for r_idx, row in enumerate(sheet.rows()):
            row_vals = [cell.v for cell in row]
            if len(row_vals) > 6 and row_vals[2] == 'Ref':
                kabinet_code = row_vals[6]
                p = row_vals[8]
                l = row_vals[10]
                t = row_vals[12]
                print(f"Row {r_idx}: Code='{kabinet_code}', P={p}, L={l}, T={t}")
                count += 1
                if count >= 50:
                    break
