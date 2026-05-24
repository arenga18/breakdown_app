import xlrd
from pyxlsb import open_workbook

exact_codes = [
    'HC-BC600-F01-L01-I01',
    'WC-WC800-F02-L01-I01',
    'DU-DU450-F03-L02-I02',
    'TP-TP600-F01-L01-I01',
    'SC-SC900-F04-L01-I03',
    'CB-CB1000-F02-L01-I01',
    'WS-WS600-F05-L02-I02',
    'WD-WD1200-F05-L02-I02',
    'TV-TV1800-F06-L01-I01',
    'OD-OD600-F01-L02-I02'
]

print("=== Searching Kodifikasi 1ok.xls ===")
xls_path = '/Applications/Arenga/vscode/breakdown_app/Kodifikasi 1ok.xls'
wb_xls = xlrd.open_workbook(xls_path)
for sheet_name in wb_xls.sheet_names():
    sheet = wb_xls.sheet_by_name(sheet_name)
    for r in range(sheet.nrows):
        row_vals = [sheet.cell_value(r, c) for c in range(sheet.ncols)]
        row_str = " ".join([str(v) for v in row_vals if v])
        for code in exact_codes:
            if code in row_str:
                print(f"[{sheet_name}] Row {r} matches code '{code}': {row_vals[:10]}")

print("\n=== Searching master rekap 2025_Bom.xlsb ===")
xlsb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2025_Bom.xlsb'
with open_workbook(xlsb_path) as wb_xlsb:
    for sheet_name in wb_xlsb.sheets:
        with wb_xlsb.get_sheet(sheet_name) as sheet:
            for r_idx, row in enumerate(sheet.rows()):
                row_vals = [cell.v for cell in row]
                row_str = " ".join([str(v) for v in row_vals if v is not None])
                for code in exact_codes:
                    if code in row_str:
                        print(f"[{sheet_name}] Row {r_idx} matches code '{code}': {row_vals[:10]}")
