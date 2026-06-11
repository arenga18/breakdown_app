import openpyxl

wb = openpyxl.load_workbook('/Applications/Arenga/vscode/breakdown_app/master rekap 2026_Bom.xlsx', read_only=True)

targets = [
    'anodizeh', 'anodizev', 'anodizev2',
    'PI', 'PII', 'LI', 'LII',
    'minifix', 'dowel', 'RelI', 'Rel', 'EI', 'E',
    'profil_3', 'profil_2', 'profil', 'siku_joint', 'Screw_Join_fr',
    'jumlah_minifix', 'jumlah_dowel', '_2PL', 'P', 'L', 'jumlah_pemakaian'
]

print("=== TARGET DEFINED NAMES ===")
for target in targets:
    defn = wb.defined_names.get(target)
    if defn:
        print(f"{target}: {defn.value if hasattr(defn, 'value') else defn}")
    else:
        print(f"{target}: NOT FOUND")

wb.close()
