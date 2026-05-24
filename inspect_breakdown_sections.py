from pyxlsb import open_workbook
import re

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Breakdown') as sheet:
        print("Checking first 300 rows for possible cabinet headers...")
        for r_idx, row in enumerate(sheet.rows()):
            row_vals = [cell.v for cell in row]
            
            # Look for cells that contain cabinet codes or module names
            # Row index 0 to 300
            if r_idx < 300:
                # print any row that has a non-null first element or something that has cabinet code
                row_str = " | ".join([str(v) for v in row_vals[:15] if v is not None])
                if len(row_str) > 0:
                    # check if any cell looks like modular code e.g. HC-BC...
                    has_cabinet = False
                    for v in row_vals[:15]:
                        if v and isinstance(v, str) and ('HC-' in v or 'WC-' in v or 'DU-' in v or 'TP-' in v or 'SC-' in v or 'CB-' in v or 'WS-' in v or 'WD-' in v or 'TV-' in v or 'OD-' in v):
                            has_cabinet = True
                    if has_cabinet or "Komponen" in row_str or "Bahan" in row_str or r_idx < 15:
                        print(f"Row {r_idx}: {row_vals[:15]}")
