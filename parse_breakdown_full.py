from pyxlsb import open_workbook
import json

xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
cabinets = []
current_cabinet = None

# Columns map (0-based)
# 1: cat
# 2: type
# 3: kode
# 4: tpk
# 5: no
# 6: komp (or cabinet code for Ref)
# 7: proses
# 8: p
# 10: l
# 12: t
# 14: sub
# 15: jml
# 16: bhn
# 17: t_bhn
# 18: l_fin (L_F)
# 19: d_fin (D_F)
# 20: luar
# 21: luar_t
# 22: dalam
# 23: dalam_t
# 24: p1
# 25: p2
# 26: l1
# 27: l2
# 28: edg_p1
# 29: edg_p2
# 30: edg_l1
# 31: edg_l2

with open_workbook(xlsb_path) as wb:
    with wb.get_sheet('Breakdown') as sheet:
        for r_idx, row in enumerate(sheet.rows()):
            if r_idx < 11: # Skip header rows
                continue
            row_vals = [cell.v for cell in row]
            
            # Pad row_vals to length 40
            if len(row_vals) < 40:
                row_vals += [None] * (40 - len(row_vals))
                
            if all(v is None for v in row_vals):
                continue
                
            row_type = row_vals[2]
            
            if row_type == 'Ref':
                # Start of a new cabinet
                kabinet_code = row_vals[6]
                p = row_vals[8]
                l = row_vals[10]
                t = row_vals[12]
                
                # Check if it has a valid code
                if kabinet_code:
                    current_cabinet = {
                        'kabinet': kabinet_code,
                        'p': p,
                        'l': l,
                        't': t,
                        'row': r_idx,
                        'komponen': []
                    }
                    cabinets.append(current_cabinet)
            elif row_type in ['prt', 'Set_up', 'kab', 'Pintu', 'Laci', 'Shelf', 'Kc'] or (row_type is not None and isinstance(row_type, str) and row_type.strip() in ['prt', 'Set_up']):
                if current_cabinet is not None:
                    # Clean and add component
                    comp = {
                        'cat': row_vals[1],
                        'type': row_type,
                        'kode': row_vals[3],
                        'tpk': row_vals[4],
                        'no': row_vals[5],
                        'komp': row_vals[6],
                        'proses': row_vals[7],
                        'p': row_vals[8],
                        'l': row_vals[10],
                        't': row_vals[12],
                        'sub': row_vals[14],
                        'jml': row_vals[15],
                        'bhn': row_vals[16],
                        't_bhn': row_vals[17],
                        'l_fin': row_vals[18],
                        'd_fin': row_vals[19],
                        'lap_luar': row_vals[20],
                        'lap_dalam': row_vals[22],
                        'p1': row_vals[24],
                        'p2': row_vals[25],
                        'l1': row_vals[26],
                        'l2': row_vals[27],
                        'edg_p1': row_vals[28],
                        'edg_p2': row_vals[29],
                        'edg_l1': row_vals[30],
                        'edg_l2': row_vals[31]
                    }
                    current_cabinet['komponen'].append(comp)

# Save to a JSON file
with open('/Applications/Arenga/vscode/breakdown_app/parsed_breakdown.json', 'w') as f:
    json.dump(cabinets, f, indent=2)

print(f"Successfully parsed {len(cabinets)} cabinets and wrote to parsed_breakdown.json!")
