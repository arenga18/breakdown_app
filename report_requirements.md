# Spesifikasi Kebutuhan & Pemetaan Formula: Report BPB & BOM

Dokumen ini mendokumentasikan spesifikasi kebutuhan formula laporan Bahan Pembantu (BPB) dan Bill of Materials (BOM) dalam aplikasi Arenga, serta pemetaan logika spreadsheet Excel asli ke dalam fungsi komputasi JavaScript.

---

## 1. Pemetaan Kolom & Variabel Utama

Seluruh variabel dan rentang (range) ini merujuk secara langsung pada data kolom yang ditarik dari **lembar Breakdown (Breakdown Sheet)**. Untuk melakukan kalkulasi agregat material dan hardware, mesin kalkulasi (`bpbCalc.js` & `bomCalc.js`) memproses baris-baris komponen dari data breakdown menggunakan pemetaan variabel berikut:

| Nama Variabel Excel | Deskripsi / Kolom Asal (Sheet Breakdown) | JS Key (Breakdown Item) | Keterangan |
| :--- | :--- | :--- | :--- |
| **`jumlah_minifix`** | Total minifix per komponen | `item.hardware?.minifix` atau `item.q_minifix_total` | Berasal dari kolom **minifix@** (Kolom **BO** di Excel) |
| **`jumlah_dowel`** | Total dowel per komponen | `item.hardware?.dowel` atau `item.q_dowel_total` | Berasal dari kolom **dowel@** (Kolom **BP** di Excel) |
| **`_2PL`** | Keliling kotor komponen dalam meter | `item.keliling` | Hasil dari formula: $2 \times (P + L) / 1000$ |
| **`P`** | Panjang kotor komponen dalam meter | `item.p_gross` | Hasil dari formula: $P / 1000$ (Kolom **BK** di Excel) |
| **`L`** | Lebar kotor komponen dalam meter | `item.l_gross` | Hasil dari formula: $L / 1000$ (Kolom **BL** di Excel) |
| **`PI`** | Tipe Edging P1 | `item.edg_p1` | Berasal dari kolom **edg_p1** (Kolom **AD** di Excel) |
| **`PII`** | Tipe Edging P2 | `item.edg_p2` | Berasal dari kolom **edg_p2** (Kolom **AE** di Excel) |
| **`LI`** | Tipe Edging L1 | `item.edg_l1` | Berasal dari kolom **edg_l1** (Kolom **AF** di Excel) |
| **`LII`** | Tipe Edging L2 | `item.edg_l2` | Berasal dari kolom **edg_l2** (Kolom **AG** di Excel) |
| **`anodizeh`** | Profil Horizontal | `item.h` | Berasal dari kolom **h** (Kolom **AR** di Excel) |
| **`anodizev`** | Profil Vertikal 1 | `item.v` | Berasal dari kolom **v** (Kolom **AP** di Excel) |
| **`anodizev2`** | Profil Vertikal 2 | `item.v2` | Berasal dari kolom **v2** (Kolom **AQ** di Excel) |
| **`jumlah_pemakaian`** | Total kuantitas pemakaian komponen | `item.qty_total` | Hasil dari formula: `item.sub_val * item.jml_val` |
| **`tube_meter`** | Konstanta daya sebar lem silicone | *Constant value* (`12`) | 1 tube silicone diasumsikan dapat meng-cover 12 meter lari |

---

## 2. Pemetaan & Penerjemahan Rumus Excel ke JavaScript

Berikut adalah detail bagaimana rumus-rumus `SUMIF` dan `ROUNDUP` dari Excel diimplementasikan secara terprogram menggunakan JavaScript loop (`reduce`):

### A. Minifix & Dowel (Aksesoris Koneksi)
* **Rumus Excel**:
  ```excel
  =ROUNDUP((SUMIF(minifix, C13, jumlah_minifix) * 1.05), 0)
  =ROUNDUP((SUMIF(dowel, C14, jumlah_dowel) * 1.05), 0)
  ```
* **Logika JS**:
  Menghitung sum dari semua kuantitas minifix/dowel dari baris komponen breakdown yang aktif (dengan tambahan *wastage* 5% lalu dibulatkan ke atas):
  ```javascript
  const totalMinifix = processedData.reduce((sum, d) => sum + (Number(d.hardware?.minifix) || 0), 0);
  const qtyMinifix = Math.ceil(totalMinifix * 1.05);

  const totalDowel = processedData.reduce((sum, d) => sum + (Number(d.hardware?.dowel) || 0), 0);
  const qtyDowel = Math.ceil(totalDowel * 1.05);
  ```

### B. Silicone Glue (Sikaflex 221 & Max Bond)
* **Rumus Excel**:
  ```excel
  =ROUNDUP((SUMIF(profil_3, C17, _2PL) / tube_meter) + (SUMIF(profil_2, C17, P) / tube_meter), 0)
  ```
* **Logika JS**:
  Menghitung total pemakaian lem berdasarkan profil kaca/komponen yang membutuhkan silicone:
  1. Jika tipe profil pada kolom `profil3` mengandung nama lem $\rightarrow$ ambil nilai keliling (`_2PL`).
  2. Jika tipe profil pada kolom `profil2` mengandung nama lem $\rightarrow$ ambil nilai panjang kotor (`P`).
  3. Total akumulasi dibagi `12` (tube_meter) dan dibulatkan ke atas:
  ```javascript
  const sumProfil3 = processedData.reduce((sum, d) => {
    const dProf3 = String(d.profil3 || '').trim().toLowerCase();
    const matches = dProf3.includes('sikaflex') && rawName.toLowerCase().includes('sikaflex');
    return sum + (matches ? (Number(d.keliling) || 0) : 0);
  }, 0);

  const sumProfil2 = processedData.reduce((sum, d) => {
    const dProf2 = String(d.profil2 || '').trim().toLowerCase();
    const matches = dProf2.includes('sikaflex') && rawName.toLowerCase().includes('sikaflex');
    return sum + (matches ? (Number(d.p_gross) || 0) : 0);
  }, 0);

  const qtySilicone = Math.ceil((sumProfil3 / 12) + (sumProfil2 / 12));
  ```

### C. Lakban Kertas
* **Rumus Excel**:
  Menjumlahkan hasil kalkulasi tube Sikaflex dan Max Bond.
* **Logika JS**:
  ```javascript
  const sikaflexVal = calculatedQtyCacheByRowIdx[idxSikaflex] || 0;
  const maxbondVal = calculatedQtyCacheByRowIdx[idxMaxbond] || 0;
  const qtyLakban = Math.ceil(sikaflexVal + maxbondVal);
  ```

### D. Edging (Bahan Edging Sisi Komponen)
* **Rumus Excel**:
  ```excel
  =ROUNDUP(((SUMIF(PI, C35, P) + SUMIF(PII, C35, P) + SUMIF(LI, C35, L) + SUMIF(LII, C35, L)) / 1), 0)
  ```
  Di mana `PI` (Edging P1), `PII` (Edging P2) dijumlahkan panjangnya (`P`), dan `LI` (Edging L1), `LII` (Edging L2) dijumlahkan lebarnya (`L`).
* **Logika JS** (pada fungsi `getEdgingSum` / `getAnodizeLSum`):
  ```javascript
  processedData.reduce((sum, d) => {
    let dSum = 0;
    if (d.edg_p1 === resolvedName || d.edg_p1 === targetCode) dSum += (d.p / 1000) * d.qty_total;
    if (d.edg_p2 === resolvedName || d.edg_p2 === targetCode) dSum += (d.p / 1000) * d.qty_total;
    if (d.edg_l1 === resolvedName || d.edg_l1 === targetCode) dSum += (d.l / 1000) * d.qty_total;
    if (d.edg_l2 === resolvedName || d.edg_l2 === targetCode) dSum += (d.l / 1000) * d.qty_total;
    return sum + dSum;
  }, 0);
  ```

### E. Aluminium Profiles (Anodize/Bahan Batangan Alu)
* **Rumus Excel**:
  ```excel
  =ROUNDUP(((SUMIF(anodizev, C78, P) + (SUMIF(anodizev2, C78, P) + SUMIF(anodizeh, C78, L))) / 2.8), 0)
  ```
  Di mana `anodizev` (Profil Vertikal 1), `anodizev2` (Profil Vertikal 2) dijumlahkan panjangnya (`P`), dan `anodizeh` (Profil Horizontal) dijumlahkan lebarnya (`L`), lalu dibagi panjang standar batangan aluminium `2.8` meter.
* **Logika JS** (pada fungsi `getAnodizeBarSum`):
  ```javascript
  processedData.reduce((sum, d) => {
    let dSum = 0;
    if (d.v === resolvedName || d.v === targetCode) dSum += (d.p / 1000) * d.qty_total;
    if (d.v2 === resolvedName || d.v2 === targetCode) dSum += (d.p / 1000) * d.qty_total;
    if (d.h === resolvedName || d.h === targetCode) dSum += (d.l / 1000) * d.qty_total;
    return sum + dSum;
  }, 0);
  ```

---

## 3. Pemetaan Kebutuhan & Formula: Report Rekap (Stok & Rekap)

Halaman **BOM (Stok & Rekap)** menyajikan rekapitulasi kebutuhan material manufaktur secara agregat berdasarkan data dari lembar Breakdown. Berikut adalah logika kalkulasi dan asal data yang digunakan:

### A. Rekap Panel & Papan Dasar (Plywood)
* **Tujuan**: Menghitung jumlah lembar plywood/papan dasar yang dibutuhkan berdasarkan total luas kotor komponen.
* **Sumber Data**: `item.bhn` (Bahan), `item.t_bhn` (Tebal), dan `item.area_gross` (Luas kotor komponen dalam m²).
* **Rumus**:
  $$\text{Total Luas } (m^2) = \sum \text{area\_gross (per Kelompok Bahan \& Tebal)}$$
  $$\text{Kebutuhan (Lembar)} = \lceil \text{Total Luas} / 2.9768 \rceil$$
  *Catatan: Nilai $2.9768$ merupakan luas kotor standar dari satu lembar papan ($1.22\text{ m} \times 2.44\text{ m}$). `area_gross` sudah memperhitungkan toleransi mesin CNC (`tol_p` dan `tol_l`).*

### B. Rekap Lapisan Finishing (HPL Sheets)
* **Tujuan**: Menghitung kebutuhan lembar HPL untuk lapisan luar dan dalam komponen.
* **Sumber Data**: `item.lap_luar` (Finishing luar), `item.lap_dalam` (Finishing dalam), `item.p_gross` (Panjang), `item.l_gross` (Lebar), dan `item.qty_total` (Jumlah total komponen).
* **Rumus**:
  $$\text{Luas Komponen } (m^2) = \frac{P_{\text{gross}}}{1000} \times \frac{L_{\text{gross}}}{1000} \times \text{qty\_total}$$
  * Jika `lap_luar` / `lap_dalam` tidak bernilai `"Polos"` atau `"-"`, maka luas komponen tersebut diakumulasikan ke varian HPL terkait.
  $$\text{Kebutuhan HPL (Lembar)} = \lceil (\text{Total Luas HPL} / 2.9768) \times 1.15 \rceil$$
  *Catatan: Ditambahkan waste margin sebesar 15% ($\times 1.15$) untuk antisipasi sisa potongan.*

### C. Rekap Edging Linear
* **Tujuan**: Menghitung total panjang edging terpasang dalam meter lari ($M^1$) beserta toleransi pengerjaan.
* **Sumber Data**: `item.edg_p1`, `item.edg_p2`, `item.edg_l1`, `item.edg_l2` (Tipe edging), `item.p_gross` (Panjang), `item.l_gross` (Lebar), dan `item.qty_total`.
* **Rumus**:
  * Akumulasi panjang sisi Panjang ($P1/P2$):
    $$\text{Panjang Edging Panjang } (m) = \sum \left( \frac{P_{\text{gross}}}{1000} \times \text{qty\_total} \right) \quad \text{(jika tipe edging aktif)}$$
  * Akumulasi panjang sisi Lebar ($L1/L2$):
    $$\text{Panjang Edging Lebar } (m) = \sum \left( \frac{L_{\text{gross}}}{1000} \times \text{qty\_total} \right) \quad \text{(jika tipe edging aktif)}$$
  $$\text{Total Kebutuhan Edging } (M^1) = \lceil \text{Total Panjang Akumulasi} \times 1.1 \rceil$$
  *Catatan: Ditambahkan margin trimming pengerjaan sebesar 10% ($\times 1.1$).*

### D. Rekap Aksesoris & Hardware Agregat
* **Tujuan**: Mengakumulasikan kuantitas unit hardware utama yang terpasang pada seluruh komponen.
* **Sumber Data**: `item.hardware` (`minifix`, `dowel`, `engsel`, `rel`, `dormec`, `siku`).
* **Kategori & Nama Barang Stok**:
  * **Minifix** $\rightarrow$ `MINIFIX HETTICH` (total akumulasi dari `item.hardware.minifix`)
  * **Dowel** $\rightarrow$ `DOWEL KAYU 4X8` (total akumulasi dari `item.hardware.dowel`)
  * **Engsel** $\rightarrow$ Sesuai definisi `spec.vals.engsel1` (atau fallback `ENGSEL CLIP TOP`)
  * **Rel Laci** $\rightarrow$ Sesuai definisi `spec.vals.rel1` (atau fallback `REL TANDEM BLUM`)
  * **Dormec** $\rightarrow$ `DORMEC / AVENTOS`
  * **Siku L** $\rightarrow$ `PLAT BESI SIKU 2 MM`

### E. Rekap Bahan Penolong (Consumables)
* **Tujuan**: Mengestimasi kebutuhan bahan bantu/penolong berdasarkan kuantitas hardware dan total edging terpasang.
* **Rumus Logika**:
  * **SCREW JF 4X6** (pcs):
    $$\text{Jumlah Screw} = (\text{Total Engsel} \times 4) + (\text{Total Siku} \times 4)$$
  * **LEM KUNING / FOX** (kaleng):
    $$\text{Jumlah Lem} = \lceil \text{Total Panjang Edging (M}^1) / 50 \rceil \quad \text{(1 kaleng per 50m edging)}$$
  * **SILICONE SIKAFLEX 221** (tube):
    $$\text{Jumlah Silicone} = \lceil \text{Jumlah Komponen} / 50 \rceil \quad \text{(1 tube per 50 komponen)}$$
  * **LAKBAN KERTAS** (roll):
    $$\text{Jumlah Lakban} = \lceil \text{Jumlah Komponen} / 50 \rceil \quad \text{(1 roll per 50 komponen)}$$

---

## 4. Catatan Penting
Semua formula kalkulasi di atas dijalankan secara otomatis saat memuat halaman **Project > Report** (untuk seluruh tab laporan: **BPB**, **BOM Sheet**, dan **BOM (Stok & Rekap)**). Data stok gudang yang ditampilkan akan secara real-time dicocokkan dengan tabel master stock berdasarkan kemiripan nama (stock matcher). User dapat melakukan *override* data pada tabel BPB & BOM Sheet dengan memasukkan angka secara manual atau menulis rumus kustom baru yang diawali dengan tanda sama dengan (`=`).
