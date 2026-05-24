from pyxlsb import open_workbook

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
print("Opening XLSB...")
with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Breakdown') as sheet:
        print("Header Row 3:")
        header_row = list(sheet.rows())[3]
        header = [cell.v for cell in header_row]
        for c_idx, h in enumerate(header):
            if h is not None:
                print(f"Col {c_idx}: {h}")

        print("\n--- Printing Data Rows ---")
        count = 0
        for r_idx, row in enumerate(sheet.rows()):
            if r_idx < 4:
                continue
            row_vals = [cell.v for cell in row]
            
            # If row is empty, skip
            if all(v is None for v in row_vals):
                continue
                
            kabinet_code = row_vals[6] if len(row_vals) > 6 else None
            komp = row_vals[24] if len(row_vals) > 24 else None
            
            if komp:
                print(f"Row {r_idx} | Kabinet: {kabinet_code} | Komp: {komp} | P: {row_vals[25]} | L: {row_vals[26]} | T: {row_vals[27]} | Sub: {row_vals[28]} | Jml: {row_vals[29]} | L_F: {row_vals[30]} | D_F: {row_vals[31]} | P1: {row_vals[32]} | P2: {row_vals[33]} | L1: {row_vals[34]} | L2: {row_vals[35]} | Bhn: {row_vals[36]} | T_Bhn: {row_vals[37]}")
                count += 1
                if count >= 30:
                    break
