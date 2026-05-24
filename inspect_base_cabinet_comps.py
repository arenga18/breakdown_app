import json

with open('/Applications/Arenga/vscode/breakdown_app/parsed_breakdown.json') as f:
    cabinets = json.load(f)

for c in cabinets:
    if c['kabinet'] == 'FC-Ck001-sw2QK2Hk-00a':
        print(f"Cabinet: {c['kabinet']} (Row {c['row']})")
        print(f"Main P: {c['p']}, L: {c['l']}, T: {c['t']}")
        print(f"Number of components: {len(c['komponen'])}")
        for idx, comp in enumerate(c['komponen']):
            print(f"\nComponent {idx+1}:")
            for k, v in comp.items():
                if v is not None and v != "":
                    print(f"  {k}: {v}")
        break
