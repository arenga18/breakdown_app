import json

with open('/Applications/Arenga/vscode/breakdown_app/parsed_breakdown.json') as f:
    cabinets = json.load(f)

print(f"Total parsed cabinets: {len(cabinets)}")

# Let's search for some representative cabinets
# We want:
# 1. Base Cabinet (FC) of width 600
# 2. Wall Cabinet (HC) of width 800
# 3. Drawer Unit (FC with drawers)
# 4. Pantry Unit (TC/High cabinet)
# 5. Sink Cabinet (FC Sink) of width 900
# 6. Corner Base (FC Corner / Corner cabinet)
# 7. Wardrobe Single (TC Wardrobe)
# 8. Wardrobe Double (TC Wardrobe)
# 9. TV Console Unit
# 10. Open Display Shelf (HC / FC Open)

def search_cabinets(query, limit=5):
    results = []
    for c in cabinets:
        if query.lower() in c['kabinet'].lower():
            results.append(c)
    return results[:limit]

# Let's search for base cabinet (FC)
print("\n--- Base Cabinet (FC) Examples ---")
for r in search_cabinets('FC-'):
    print(f"Code: {r['kabinet']}, P: {r['p']}, L: {r['l']}, T: {r['t']}, Comps: {len(r['komponen'])}")

print("\n--- Wall/Hang Cabinet (HC) Examples ---")
for r in search_cabinets('HC-'):
    print(f"Code: {r['kabinet']}, P: {r['p']}, L: {r['l']}, T: {r['t']}, Comps: {len(r['komponen'])}")

print("\n--- Sink Cabinet Examples ---")
for r in search_cabinets('Sink'):
    print(f"Code: {r['kabinet']}, P: {r['p']}, L: {r['l']}, T: {r['t']}, Comps: {len(r['komponen'])}")

print("\n--- Drawer Examples ---")
for r in search_cabinets('Laci'):
    print(f"Code: {r['kabinet']}, P: {r['p']}, L: {r['l']}, T: {r['t']}, Comps: {len(r['komponen'])}")

print("\n--- Corner Examples ---")
for r in search_cabinets('Corner'):
    print(f"Code: {r['kabinet']}, P: {r['p']}, L: {r['l']}, T: {r['t']}, Comps: {len(r['komponen'])}")
