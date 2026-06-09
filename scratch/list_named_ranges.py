import openpyxl

wb_path = '/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx'
wb = openpyxl.load_workbook(wb_path, read_only=True)

for name in ['descf', 'desce', 'descfr']:
    defn = wb.defined_names.get(name)
    if defn:
        print(f"Name: {name}, Dest: {defn.value if hasattr(defn, 'value') else defn}")
    else:
        print(f"Name: {name} NOT FOUND")
