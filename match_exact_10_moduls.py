import json

with open('/Applications/Arenga/vscode/breakdown_app/parsed_breakdown.json') as f:
    cabinets = json.load(f)

# Categories we want to find:
# 1. Base Cabinet (FC) - e.g. FC-Ck001-sw2QK2Hk-00a
# 2. Hang Cabinet (HC) - e.g. HC-S002-sw2QK2■-000
# 3. Drawer Unit (FC Laci) - e.g. FC-Ch000-tdm112K29ab-sr0a
# 4. Pantry/Tall Cabinet (TC) - e.g. TC Disp-∩H→1'+1-sw1K20-pu0a
# 5. Sink Cabinet (FC Sink) - e.g. FC Sink-Ck000-sw2QK2Hk-00a
# 6. Corner Cabinet (FC Corner) - e.g. FC-»«000-sw4QHK22c-00b
# 7. Wardrobe Single (TC Wardrobe) - e.g. TC Cargo-S001'-sw1K28-cg0a
# 8. Wardrobe Double - e.g. TC Mw Ov-SD►3'+2-sw+2L2P0-00b
# 9. TV Console Unit (Low height) - e.g. FC-Ck000-Mv41K2Hk-00a
# 10. Open Display Shelf - e.g. Box Mati-ChHMD0-0003a-00a

target_keys = {
    '1_base': "FC-Ck001-sw2QK2Hk-00a",
    '2_hang': "HC-S002-sw2QK2■-000",
    '3_drawer': "FC-Ch000-tdm112K29ab-sr0a",
    '4_pantry': "TC Disp-∩H→1'+1-sw1K20-pu0a",
    '5_sink': "FC Sink-Ck000-sw2QK2Hk-00a",
    '6_corner': "FC-»«000-sw4QHK22c-00b",
    '7_wardrobe_s': "TC Cargo-S001'-sw1K28-cg0a",
    '8_wardrobe_d': "TC Mw Ov-SD►3'+2-sw+2L2P0-00b",
    '9_tv': "FC-Ck000-Mv41K2Hk-00a",
    '10_open': "Box Mati-ChHMD0-0003a-00a"
}

matches = {}
for key, search_code in target_keys.items():
    found = None
    for c in cabinets:
        if c['kabinet'] == search_code:
            found = c
            break
    if found:
        print(f"Matched {key} to {found['kabinet']} with {len(found['komponen'])} components")
        matches[key] = found
    else:
        # Fallback: search for substring
        candidates = [c for c in cabinets if search_code.split('-')[0] in c['kabinet']]
        if candidates:
            print(f"Fallback matched {key} to {candidates[0]['kabinet']} with {len(candidates[0]['komponen'])} components")
            matches[key] = candidates[0]
        else:
            print(f"No match found for {key} ({search_code})")
