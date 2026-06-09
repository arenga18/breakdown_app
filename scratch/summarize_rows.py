import json

json_path = "/Applications/Arenga/vscode/breakdown_app/scratch/breakdown_rows_14_198.json"
with open(json_path) as f:
    data = json.load(f)

rows = data['rows']
print(f"Total rows in extracted data: {len(rows)}")

# Print unique component names, types, and their rows
categories = {}
for r in rows:
    r_num = r['row_number']
    row_type = r['columns'].get('C', {}).get('value')
    komponen = r['columns'].get('H', {}).get('value')
    cat = r['columns'].get('B', {}).get('value')
    
    if row_type not in categories:
        categories[row_type] = []
    categories[row_type].append((r_num, komponen, cat))

print("\n--- Component Types Summary ---")
for r_type, items in categories.items():
    print(f"\nType: {r_type} ({len(items)} rows):")
    # Print first 5 and last 2 items
    if len(items) <= 7:
        for idx, item, cat in items:
            print(f"  Row {idx}: {item} (Cat: {cat})")
    else:
        for idx, item, cat in items[:5]:
            print(f"  Row {idx}: {item} (Cat: {cat})")
        print("  ...")
        for idx, item, cat in items[-2:]:
            print(f"  Row {idx}: {item} (Cat: {cat})")
