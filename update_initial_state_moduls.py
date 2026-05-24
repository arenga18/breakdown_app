import json
import re

# Load parsed cabinets
with open('/Applications/Arenga/vscode/breakdown_app/parsed_breakdown.json') as f:
    cabinets = json.load(f)

# Define the exact matched cabinet codes
target_keys = {
    1: ("FC-Ck001-sw2QK2Hk-00a", "Kitchen Base 600", "FC"),
    2: ("HC-S002-sw2QK2■-000", "Wall Cabinet 800", "HC"),
    3: ("FC-Ch000-tdm112K29ab-sr0a", "Drawer Unit 3-Tier", "FC"),
    4: ("TC Disp-∩H→1'+1-sw1K20-pu0a", "Pantry Unit High", "TC"),
    5: ("FC Sink-Ck000-sw2QK2Hk-00a", "Sink Cabinet 900", "FC"),
    6: ("FC-»«000-sw4QHK22c-00b", "Corner Base L", "FC"),
    7: ("TC Cargo-S001'-sw1K28-cg0a", "Wardrobe Single 600", "TC"),
    8: ("TC Mw Ov-SD►3'+2-sw+2L2P0-00b", "Wardrobe Double 1200", "TC"),
    9: ("FC-Ck000-Mv41K2Hk-00a", "TV Console Unit", "FC"),
    10: ("Box Mati-ChHMD0-0003a-00a", "Open Display Shelf", "FC")
}

# Load the original metadata to keep id, tgl, nip, etc.
# We will construct the 10 moduls
moduls_metadata = [
    {"id": 1, "tgl": '2024-05-10', "nip": 'EMP001', "tinggi": '850', "proyek": 'Project Citra Grand', "produk": 'Kitchen Base 600', "dunit": 'FC', "bbox": 'Standard Box', "fin": 'HB_41130', "plap": 'Luar Saja', "ibox": 'Polos', "stup": 'Soft Close', "jtutup": '2', "jnistutup": 'Pintu Ayun', "hndl": 'MH-02 Black Doff', "acc": 'None', "lmp": 'None', "plnt": 'Standard'},
    {"id": 2, "tgl": '2024-05-11', "nip": 'EMP002', "tinggi": '700', "proyek": 'Apartemen Green Bay', "produk": 'Wall Cabinet 800', "dunit": 'HC', "bbox": 'Standard Box', "fin": 'Aica', "plap": 'Luar Saja', "ibox": 'Polos', "stup": 'Soft Close', "jtutup": '2', "jnistutup": 'Pintu Ayun', "hndl": 'MH-04 Black', "acc": 'None', "lmp": 'LED Profile', "plnt": 'None'},
    {"id": 3, "tgl": '2024-05-12', "nip": 'EMP003', "tinggi": '850', "proyek": 'Villa Bali', "produk": 'Drawer Unit 3-Tier', "dunit": 'FC', "bbox": 'Standard Box', "fin": 'DSK_5450_SM', "plap": 'Luar Dalam', "ibox": 'HPL Same', "stup": 'Full Extension', "jtutup": '3', "jnistutup": 'Laci', "hndl": 'MH-07 Black', "acc": 'None', "lmp": 'None', "plnt": 'Standard'},
    {"id": 4, "tgl": '2024-05-13', "nip": 'EMP001', "tinggi": '2200', "proyek": 'Project Citra Grand', "produk": 'Pantry Unit High', "dunit": 'TC', "bbox": 'Standard Box', "fin": 'HB_41130', "plap": 'Luar Saja', "ibox": 'Polos', "stup": 'Soft Close', "jtutup": '2', "jnistutup": 'Pintu Ayun', "hndl": 'MH-02 Black Doff', "acc": 'Pantry Pullout', "lmp": 'None', "plnt": 'Standard'},
    {"id": 5, "tgl": '2024-05-14', "nip": 'EMP004', "tinggi": '850', "proyek": 'Office Renovation', "produk": 'Sink Cabinet 900', "dunit": 'FC', "bbox": 'Sink Box', "fin": 'SK_10455_UW', "plap": 'Luar Saja', "ibox": 'Silver Foil', "stup": 'Soft Close', "jtutup": '2', "jnistutup": 'Pintu Ayun', "hndl": 'MH-04 Black', "acc": 'Alumunium Tray', "lmp": 'None', "plnt": 'Alumunium'},
    {"id": 6, "tgl": '2024-05-15', "nip": 'EMP002', "tinggi": '850', "proyek": 'Apartemen Green Bay', "produk": 'Corner Base L', "dunit": 'FC', "bbox": 'L-Shape Box', "fin": 'Aica', "plap": 'Luar Saja', "ibox": 'Polos', "stup": 'Special Corner', "jtutup": '2', "jnistutup": 'Pintu Lipat', "hndl": 'MH-04 Black', "acc": 'Magic Corner', "lmp": 'None', "plnt": 'Standard'},
    {"id": 7, "tgl": '2024-05-16', "nip": 'EMP005', "tinggi": '2400', "proyek": 'Residance 8', "produk": 'Wardrobe Single 600', "dunit": 'TC', "bbox": 'Standard Box', "fin": 'GM_86', "plap": 'Luar Dalam', "ibox": 'HPL Same', "stup": 'Soft Close', "jtutup": '1', "jnistutup": 'Pintu Ayun', "hndl": 'MH-08 Black Gloss', "acc": 'Hanger Rod', "lmp": 'Sensor LED', "plnt": 'Standard'},
    {"id": 8, "tgl": '2024-05-17', "nip": 'EMP005', "tinggi": '2400', "proyek": 'Residance 8', "produk": 'Wardrobe Double 1200', "dunit": 'TC', "bbox": 'Standard Box', "fin": 'GM_86', "plap": 'Luar Dalam', "ibox": 'HPL Same', "stup": 'Sliding Door', "jtutup": '2', "jnistutup": 'Sliding', "hndl": 'Integrated', "acc": 'Drawer Set', "lmp": 'Internal LED', "plnt": 'Standard'},
    {"id": 9, "tgl": '2024-05-18', "nip": 'EMP006', "tinggi": '450', "proyek": 'Modern House', "produk": 'TV Console Unit', "dunit": 'FC', "bbox": 'Low Box', "fin": 'DXP_5342_XM', "plap": 'Luar Saja', "ibox": 'Polos', "stup": 'Push to Open', "jtutup": '4', "jnistutup": 'Laci/Drop Down', "hndl": 'No Handle', "acc": 'Cable Management', "lmp": 'Ambient Light', "plnt": 'Floating'},
    {"id": 10, "tgl": '2024-05-19', "nip": 'EMP007', "tinggi": '600', "proyek": 'Showroom Interior', "produk": 'Open Display Shelf', "dunit": 'FC', "bbox": 'Open Box', "fin": 'HB_41130', "plap": 'Luar Dalam', "ibox": 'HPL Same', "stup": 'Open', "jtutup": '0', "jnistutup": 'None', "hndl": 'None', "acc": 'None', "lmp": 'Spotlight', "plnt": 'None'}
]

new_moduls_data = []
for idx, meta in enumerate(moduls_metadata):
    mid = meta['id']
    code, name, dunit_code = target_keys[mid]
    
    # Find matching cabinet
    cab = None
    for c in cabinets:
        if c['kabinet'] == code:
            cab = c
            break
            
    if cab:
        # Construct updated modul object
        updated_modul = {
            **meta,
            'kabinet': cab['kabinet'],
            'dunit': dunit_code,
            'p': int(cab['p']) if cab['p'] else 0,
            'l': int(cab['l']) if cab['l'] else 0,
            't': int(cab['t']) if cab['t'] else 0,
            'jml': 1,
            'komponen': cab['komponen']
        }
        new_moduls_data.append(updated_modul)
    else:
        print(f"ERROR: Could not find parsed cabinet for {code}!")

# Construct the JS string representation
def clean_val(v):
    if v is None:
        return "''"
    if isinstance(v, (int, float)):
        return str(v)
    # escape single quotes
    s_val = str(v).replace("'", "\\'")
    return f"'{s_val}'"

def serialize_component(comp):
    lines = []
    lines.append("        {")
    for k, v in comp.items():
        val_str = clean_val(v)
        lines.append(f"          {k}: {val_str},")
    # Add dummy/missing fields if necessary for ease of spreadsheet calc
    # Let's ensure these have q_engsel, q_rel, q_dormec, q_minifix, q_dowel, isParent
    if 'q_engsel' not in comp:
        lines.append("          q_engsel: 0, q_rel: 0, q_dormec: 0, q_minifix: 0, q_dowel: 0,")
    lines.append("        }")
    return "\n".join(lines)

def serialize_modul(mod):
    lines = []
    lines.append("    {")
    for k, v in mod.items():
        if k == 'komponen':
            lines.append("      komponen: [")
            comp_strs = [serialize_component(c) for c in v]
            lines.append(",\n".join(comp_strs))
            lines.append("      ]")
        else:
            val_str = clean_val(v)
            lines.append(f"      {k}: {val_str},")
    lines.append("    }")
    return "\n".join(lines)

js_moduls_str = "  moduls: [\n" + ",\n".join([serialize_modul(m) for m in new_moduls_data]) + "\n  ],"

# Read original initialState.js
with open('/Applications/Arenga/vscode/breakdown_app/src/initialState.js', 'r') as f:
    content = f.read()

# Locate moduls section
# Start of moduls array is marked by `moduls: [`
# End of moduls array is followed by `subModuls: [`
pattern = r'moduls:\s*\[.*?\n\s*\],\s*\n\s*subModuls:'
match = re.search(pattern, content, re.DOTALL)
if match:
    # Replace it!
    replacement = js_moduls_str + "\n  subModuls:"
    updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open('/Applications/Arenga/vscode/breakdown_app/src/initialState.js', 'w') as f:
        f.write(updated_content)
    print("Successfully updated initialState.js moduls with fully populated XLSB data!")
else:
    print("ERROR: Could not locate moduls: [ ... ] subModuls: in initialState.js!")
