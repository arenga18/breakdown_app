import json
import re
import openpyxl

json_path = "/Applications/Arenga/vscode/breakdown_app/scratch/breakdown_rows_14_198.json"
with open(json_path) as f:
    data = json.load(f)

rows = data['rows']
defined_names = data['defined_names']

# Map columns A to CF (1 to 84)
cols = [openpyxl.utils.get_column_letter(c) for c in range(1, 85)]

col_data = {}
for col in cols:
    col_data[col] = {
        'header': None,
        'formulas': set(),
        'examples': []
    }

for r in rows:
    r_num = r['row_number']
    row_type = r['columns'].get('C', {}).get('value')
    for col in cols:
        c_info = r['columns'].get(col)
        if c_info:
            if not col_data[col]['header'] and c_info['header']:
                col_data[col]['header'] = c_info['header']
            
            formula = c_info['formula']
            if formula:
                # Normalize row numbers
                norm = re.sub(rf'\b([A-Z]+){r_num}\b', r'\1[ROW]', formula)
                norm = re.sub(rf'\$([A-Z]+){r_num}\b', r'$\1[ROW]', norm)
                col_data[col]['formulas'].add(norm)
            
            val = c_info['value']
            if val is not None and len(col_data[col]['examples']) < 2:
                col_data[col]['examples'].append(val)

# Manual definitions of columns for clean explanation
col_explanations = {
    'A': ('ID unik komponen di gudang stock', 'Mengecek ketersediaan komponen fisik di gudang menggunakan master database inventory.'),
    'B': ('Kategori komponen', 'Klasifikasi part (misal: pintu, laci, kab, alu, Kc) yang diambil otomatis dari Master DB Validation.'),
    'C': ('Tipe Row / Baris', 'Menentukan jenis baris (`Ref` untuk unit kabinet, `Set_up` untuk header modul, `prt` untuk komponen panel).'),
    'D': ('Klasifikasi Klas/Kode klas', 'Mengklasifikasi jenis komponen apakah Kaca Solid (ks) atau part biasa.'),
    'E': ('Tipologi Bahan (Tpk)', 'Dropdown tipologi detail bahan (misal A, B, A»).'),
    'F': ('Opsi Material (Opt)', 'Indikator opsi varian material (0 = standard, 1 = opsi kustom).'),
    'G': ('No. Indeks Referensi', 'Nomor urut modul yang dipetakan secara dinamis berdasarkan input di sheet Spek.'),
    'H': ('Nama Komponen', 'Deskripsi nama bagian kabinet (diisi manual oleh drafter atau bersumber dari modul template).'),
    'I': ('Proses Khusus', 'Keterangan pengerjaan khusus pada part tersebut (misal: alur LED, bevel, coak).'),
    'J': ('Panjang (P) mentah (mm)', 'Kalkulasi panjang potongan panel kayu, aluminium, atau kaca. Seringkali menggunakan deduksi toleransi gap.'),
    'K': ('Separator Teks "x"', 'Literal karakter pembatas visual "x".'),
    'L': ('Lebar (L) mentah (mm)', 'Kalkulasi lebar potongan panel. Sering mewarisi lebar dari baris setup di atasnya.'),
    'M': ('Separator Teks "x"', 'Literal karakter pembatas visual "x".'),
    'N': ('Tebal Aktual Selesai (T) (mm)', 'Tebal komposit akhir panel, dihitung dari tebal bahan dasar + tebal lapisan luar + tebal lapisan dalam.'),
    'O': ('Ukuran Gabungan (Teks)', 'Menggabungkan P x L x T menjadi satu baris teks ukuran bersih komponen untuk visualisasi.'),
    'P': ('Kuantitas Sub per set (Sub)', 'Jumlah komponen sejenis yang dibutuhkan untuk satu unit modul.'),
    'Q': ('Kuantitas Produksi Total (Jml)', 'Jumlah total komponen yang harus diproduksi (Sub dikalikan volume kabinet dari sheet Spek).'),
    'R': ('Bahan Dasar', 'Jenis bahan dasar panel kayu (misal: Ply, MDF, PB) di-lookup otomatis dari Master DB Validation.'),
    'S': ('Ketebalan Bahan Dasar (mm)', 'Tebal nominal bahan baku panel (sebelum dilapisi) bersumber dari DB Validation.'),
    'T': ('Lapisan Luar Bawaan', 'Jenis pelapis eksterior bawaan komponen dari DB Validation.'),
    'U': ('Lapisan Dalam Bawaan', 'Jenis pelapis interior bawaan komponen dari DB Validation.'),
    'V': ('Nama Lapisan Luar Aktif', 'Lapisan eksterior akhir yang terpilih setelah dicocokkan dengan finishing aktif proyek (misal: Aica, Duco).'),
    'W': ('Ketebalan Lapisan Luar (mm)', 'Ketebalan material pelapis luar (di-lookup dari tabel tebal lapisan di sheet Data Validation).'),
    'X': ('Nama Lapisan Dalam Aktif', 'Lapisan interior akhir yang terpilih (misal: Polos, Melaminto, Aica HPL).'),
    'Y': ('Ketebalan Lapisan Dalam (mm)', 'Ketebalan material pelapis dalam (di-lookup dari database lapisan).'),
    'Z': ('Flag Edging Panjang-1 (P1)', 'Indikator biner (1 jika sisi Panjang-1 diberi edging, 0 jika polos).'),
    'AA': ('Flag Edging Panjang-2 (P2)', 'Indikator biner untuk sisi Panjang-2.'),
    'AB': ('Flag Edging Lebar-1 (L1)', 'Indikator biner untuk sisi Lebar-1.'),
    'AC': ('Flag Edging Lebar-2 (L2)', 'Indikator biner untuk sisi Lebar-2.'),
    'AD': ('Nama Edging Panjang-1 (P1 (edg))', 'Nama profil edging atau aluminium profil yang digunakan pada sisi Panjang-1.'),
    'AE': ('Nama Edging Panjang-2 (P2 (edg))', 'Nama profil edging pada sisi Panjang-2.'),
    'AF': ('Nama Edging Lebar-1 (L1 (edg))', 'Nama profil edging pada sisi Lebar-1.'),
    'AG': ('Nama Edging Lebar-2 (L2 (edg))', 'Nama profil edging pada sisi Lebar-2.'),
    'AH': ('Kuantitas Profil 3', 'Kebutuhan profil kustom tipe 3 per part.'),
    'AI': ('Kuantitas Profil 2', 'Kebutuhan profil kustom tipe 2 per part.'),
    'AJ': ('Kuantitas Profil Standard', 'Kebutuhan profil standard per part.'),
    'AK': ('Siku Joint (fitting)', 'Kebutuhan siku penyambung logam per part.'),
    'AL': ('Screw Joint Frame (fitting)', 'Jumlah sekrup khusus joint frame aluminium per part.'),
    'AM': ('Door Mechanism (Dormec)', 'Flag penentu penggunaan mekanisme pintu/gas spring.'),
    'AN': ('Rel Laci (fitting)', 'Indikator tipe rel laci yang digunakan.'),
    'AO': ('Engsel Pintu (fitting)', 'Indikator tipe engsel pintu.'),
    'AP': ('Batangan Vertikal 1 (V)', 'Kebutuhan aksesoris batangan vertikal kustom.'),
    'AQ': ('Batangan Vertikal 2 (V2)', 'Kebutuhan aksesoris batangan vertikal tipe 2.'),
    'AR': ('Batangan Horizontal (H)', 'Kebutuhan aksesoris batangan horizontal kustom.'),
    'AS': ('Nama Barang Anodize', 'Jenis profil aluminium anodize atau fitting khusus yang dipasang.'),
    'AT': ('Panjang Potongan Fitting (mm)', 'Kalkulasi panjang potongan aksesoris anodize/fitting secara dinamis berdasarkan ukuran panel.'),
    'AU': ('Kuantitas Fitting Total', 'Kuantitas total aksesoris anodize yang dipotong (dikali volume produksi).'),
    'AV': ('Kolom Pemisah Kosong', 'Kolom kosong struktural pembatas.'),
    'AW': ('Kode Warna Gabungan (V lap)', 'Kode numerik 2-digit representasi kombinasi warna luar-dalam.'),
    'AX': ('Kode Edging Gabungan (V edg)', 'Kode numerik 4-digit representasi konfigurasi edging keliling.'),
    'AY': ('Deskripsi Lapisan Komposit', 'Deskripsi gabungan lapisan luar-dalam proyek (misal: Aica_1mk_Polos).'),
    'AZ': ('Deskripsi Edging Komposit', 'Deskripsi letak penempatan edging (misal: Edg_EAW_5216D1_Keliling).'),
    'BA': ('Deskripsi Ringkas Komponen', 'Teks pengenal ringkas gabungan no urut, nama part, dan lapisan.'),
    'BB': ('Nama Komponen Lengkap', 'Teks komposit lengkap untuk label produksi (berisi no urut, bahan, ketebalan, lapisan, edging, dan proses khusus).'),
    'BC': ('Kolom Pemisah Kosong', 'Kolom pembatas visual.'),
    'BD': ('Baut Minifix Bawaan', 'Kuantitas baut minifix default per part dari database master.'),
    'BE': ('Dowel Kayu Bawaan', 'Kuantitas dowel kayu default per part dari database master.'),
    'BF': ('Jumlah Siku per Panel', 'Jumlah siku penahan per panel.'),
    'BG': ('Jumlah Screw per Panel', 'Jumlah sekrup penahan per panel.'),
    'BH': ('Kuantitas Dormec Aktif', 'Jumlah total mekanisme pintu aktif (terkoneksi kuantitas produksi).'),
    'BI': ('Kuantitas Engsel Aktif', 'Jumlah engsel aktif, dihitung otomatis berdasarkan tinggi pintu kabinet.'),
    'BJ': ('Kuantitas Rel Laci Aktif', 'Jumlah total rel laci aktif (terkoneksi kuantitas produksi).'),
    'BK': ('Panjang Kotor Aktual (m)', 'Konversi panjang panel mentah + toleransi pemotongan CNC ke satuan meter.'),
    'BL': ('Lebar Kotor Aktual (m)', 'Konversi lebar panel + toleransi CNC ke satuan meter.'),
    'BM': ('Keliling Aktual Panel (2(P+L))', 'Keliling panel dalam meter, digunakan untuk estimasi kebutuhan edging gulungan.'),
    'BN': ('Luas Aktual Panel (PxL)', 'Luas kotor panel per lembar dalam satuan meter persegi (M²).'),
    'BO': ('Kode Bahan Dasar Logistik', 'Key logistik gabungan nama bahan & tebal (misal: Ply_18).'),
    'BP': ('Deskripsi Bahan Logistik', 'Deskripsi lengkap bahan dasar dan warna untuk pelacakan logistik.'),
    'BQ': ('Proporsi Harga per Panel', 'Estimasi persentase harga panel triplek lembaran standar (waste +10%).'),
    'BR': ('Kuantitas Anodize per Panel', 'Kebutuhan profil anodize standar per panel.'),
    'BS': ('Total Minifix Proyek', 'Kalkulasi total minifix proyek, dihitung dinamis berdasarkan lebar panel.'),
    'BT': ('Total Dowel Proyek', 'Kalkulasi total dowel kayu proyek, dihitung dinamis berdasarkan lebar panel.'),
    'BU': ('Total Siku Proyek', 'Kalkulasi total siku proyek.'),
    'BV': ('Total Sekrup Proyek', 'Kalkulasi total sekrup proyek.'),
    'BW': ('Luas Bersih Total (M²)', 'Total luas bersih panel (luas lembar x kuantitas total) dalam meter persegi.'),
    'BX': ('Volume Bersih Total (M³)', 'Total volume bersih panel (luas x tebal x kuantitas) dalam meter kubik.'),
    'BY': ('Tebal Edging P1 (T_P1) (mm)', 'Ketebalan fisik edging Panjang-1 di-lookup langsung dari sheet stock (master edging).'),
    'BZ': ('Tebal Edging P2 (T_P2) (mm)', 'Ketebalan fisik edging Panjang-2 dari sheet stock.'),
    'CA': ('Tebal Edging L1 (T_L1) (mm)', 'Ketebalan fisik edging Lebar-1 dari sheet stock.'),
    'CB': ('Tebal Edging L2 (T_L2) (mm)', 'Ketebalan fisik edging Lebar-2 dari sheet stock.'),
    'CC': ('Panjang Bersih CNC (P_cnc) (mm)', 'Panjang bersih panel kayu setelah dikurangi tebal edging L1 & L2 (panjang pemotongan gergaji CNC).'),
    'CD': ('Lebar Bersih CNC (L_cnc) (mm)', 'Lebar bersih panel kayu setelah dikurangi tebal edging P1 & P2.'),
    'CE': ('Ukuran CNC Gabungan (mm)', 'Teks komposit ukuran bersih pemotongan CNC untuk operator mesin.'),
    'CF': ('Format CSV Ekspor CNC', 'Gabungan field semi-kolon (;) untuk ekspor data pemotongan panel ke mesin CNC secara massal.')
}

# Now construct the markdown text to append
dictionary_md = """

---

## 6. Lengkap Kolom-by-Kolom Dictionary (Kolom A–CF)

Bagian ini memaparkan **seluruh** 84 kolom dari Kolom A hingga CF secara berurutan. Ini menjamin cakupan 100% dari semua rumus dan relasi logika yang digunakan drafter pada baris 14–198:

"""

for col in cols:
    header = col_data[col]['header'] or "(Kosong/Tanpa Header)"
    formulas = sorted(list(col_data[col]['formulas']))
    examples = col_data[col]['examples']
    
    explanation_title, explanation_detail = col_explanations.get(
        col, 
        ("Kolom Operasional", "Kolom pembantu perhitungan matematika internal atau separator visual.")
    )
    
    dictionary_md += f"### Column {col} — `{header}`\n"
    dictionary_md += f"* **Fungsi**: {explanation_title} — {explanation_detail}\n"
    
    if formulas:
        dictionary_md += "* **Pola Rumus Aktif**:\n"
        for form in formulas:
            # Escape asterisks or brackets in markdown
            escaped_form = form.replace("*", "\\*").replace("<", "&lt;").replace(">", "&gt;")
            dictionary_md += f"  ```excel\n  {form}\n  ```\n"
    else:
        dictionary_md += "* **Tipe Kolom**: Manual Input (diisi oleh drafter) atau Kolom Statis/Kosong.\n"
        
    if examples:
        dictionary_md += f"* **Contoh Nilai Terkalkulasi**: `{examples[0]}`"
        if len(examples) > 1:
            dictionary_md += f" atau `{examples[1]}`"
        dictionary_md += "\n"
        
    dictionary_md += "\n---\n\n"

# Read current file breakdown_formula_analysis.md
artifact_path = "/Users/user/.gemini/antigravity-ide/brain/6ba6f360-3f0a-46b3-90cc-ed4edf2bec36/breakdown_formula_analysis.md"
with open(artifact_path, "r") as f:
    current_content = f.read()

# We will replace Section 5 and onwards or simply append if not exists
# Let's check where Section 5 is
section_5_pos = current_content.find("## 5. Ringkasan Kamus Defined Names Terkait")
if section_5_pos != -1:
    # Keep up to the end of Section 5, but remove everything else, then append our complete dictionary
    # Let's find if there's any content after section 5 that we want to keep
    # Section 5 has a table which ends. We can just truncate the file at section_5_pos, 
    # reconstruct Section 5 table, and then append our Column Dictionary!
    truncated_content = current_content[:section_5_pos]
else:
    truncated_content = current_content

# Re-append Section 5 and our new complete Column Dictionary
final_content = truncated_content + """## 5. Ringkasan Kamus Defined Names Terkait

Berikut adalah rangkuman range penting yang digunakan sebagai jembatan data dalam formula di atas:

| Nama Defined | Alamat Range Aktual | Fungsi Utama |
| :--- | :--- | :--- |
| **`ref`** | `Spek!$D$177:$D$571` | Daftar kode referensi kabinet di sheet Spek |
| **`no_ref`** | `Spek!$E$177:$E$571` | Daftar kuantitas/volume kabinet di sheet Spek |
| **`Prt`** | `'Data Validation'!$C$8:$C$384` | List nama komponen master di DB |
| **`cprt`** | `'Data Validation'!$A$8:$A$384` | List kategori komponen (pintu, alu, Kc, dll) |
| **`KS`** | `'Data Validation'!$E$8:$E$384` | Klasifikasi kode produksi komponen |
| **`std_bhn_prt`** | `'Data Validation'!$I$8:$I$384` | Default bahan baku per part (Ply, MDF, dll) |
| **`std_Tbahan_prt`**| `'Data Validation'!$J$8:$J$384` | Default tebal bahan baku (6, 9, 12, 18, 24 mm) |
| **`std_edg_P1_prt`**| `'Data Validation'!$Y$8:$Y$384` | Biner status edging sisi Panjang-1 (0 atau 1) |
| **`tbl_edg`** | `stock!$E$1933:$E$2302` | Ketebalan edging fisik di master stock |
| **`Edg`** | `stock!$D$1933:$D$2302` | Nama material edging di master stock |
| **`BARANG`** | `stock!$D$4:$D$2304` | Nama barang inventaris gudang |
| **`ID`** | `stock!$C$4:$C$2676` | ID barcode barang inventaris |
| **`tol_p`** | `'Data Validation'!$D$1196` | Nilai toleransi CNC (Panjang) = 40 mm |
| **`trim`** | `'Data Validation'!$D$1172` | Toleransi pemotongan celah pintu |
""" + dictionary_md

with open(artifact_path, "w") as f:
    f.write(final_content)

print("Artifact successfully updated with all columns from A to CF!")
