import json

with open('/Applications/Arenga/vscode/breakdown_app/scratch/bom_setting_full.json', 'r') as f:
    rows = json.load(f)

# Prune trailing empty rows (index 223 is the last non-empty row, so keep up to index 223, i.e., length 224)
pruned_rows = rows[:224]

with open('/Applications/Arenga/vscode/breakdown_app/src/utils/bom_setting_full.json', 'w') as f:
    json.dump(pruned_rows, f, indent=2)

print(f"Saved {len(pruned_rows)} rows to src/utils/bom_setting_full.json")
