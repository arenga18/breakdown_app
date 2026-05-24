from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
with open_workbook(xlsb_path) as wb:
    print("Searching Breakdown sheet...")
    with wb.get_sheet('Breakdown') as sheet:
        found_rows = 0
        for r_idx, row in enumerate(sheet.rows()):
            row_vals = [cell.v for cell in row]
            row_str = " ".join([str(v) for v in row_vals if v is not None])
            if "Dinding Samping" in row_str or "Dasar" in row_str or "Top Rail" in row_str:
                print(f"Row {r_idx}: {row_vals[:20]}")
                found_rows += 1
                if found_rows >= 20:
                    break
                    
    print("\nSearching KS sheet...")
    if 'KS' in wb.sheets:
        with wb.get_sheet('KS') as sheet:
            found_rows = 0
            for r_idx, row in enumerate(sheet.rows()):
                row_vals = [cell.v for cell in row]
                row_str = " ".join([str(v) for v in row_vals if v is not None])
                if "Dinding Samping" in row_str or "Dasar" in row_str or "Top Rail" in row_str:
                    print(f"Row {r_idx}: {row_vals[:20]}")
                    found_rows += 1
                    if found_rows >= 20:
                        break
