import openpyxl

wb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx'
wb = openpyxl.load_workbook(wb_path, data_only=False)
print("Sheets in 2026_Bom:", wb.sheetnames)

sheet = wb['Breakdown']
print("Successfully loaded sheet Breakdown")

# Let's inspect formulas in a few columns for rows 14-30
# Row 14, 15, 16, 17, etc.
cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'L', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY', 'BZ', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF']

print("Row 14 formulas:")
for col in cols:
    val = sheet[f'{col}14'].value
    if val and str(val).startswith('='):
        print(f"  Col {col}: {val}")

print("\nRow 15 formulas:")
for col in cols:
    val = sheet[f'{col}15'].value
    if val and str(val).startswith('='):
        print(f"  Col {col}: {val}")

print("\nRow 16 formulas:")
for col in cols:
    val = sheet[f'{col}16'].value
    if val and str(val).startswith('='):
        print(f"  Col {col}: {val}")
