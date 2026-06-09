---
name: excel-breakdown-formula
description: Referensi rumus Excel untuk sheet Breakdown material calculation. Gunakan ketika membutuhkan mapping rumus per kolom (A-CF), defined names, dan relasi antar sheet.
---

# Excel Breakdown Formula Reference Skill

Skill ini menyimpan mapping rumus Excel untuk sheet Breakdown di file `master rekap 2025_Bom.xlsb`.

## Struktur Header (Row 11)

Sheet `Breakdown` menggunakan baris 11 sebagai **header aktif**. Data mulai dari baris 14 ke bawah.

| Kolom | Header | Formula/Data Source |
|-------|--------|-------------------|
| A | id | Formula pelacak urutan/indentasi, berbasis tanda "…" |
| B | cat. | Formula inherit kategori dari row Ref parent |
| C | type | Manual: `Ref/Set_up/prt/kab/Pintu/Laci/Shelf/Kc` |
| D | kode | Manual/dropdown (KS/ks+/non KS) |
| E | Tpk | Manual/dropdown tipologi (A/B/A») |
| F | Opt | Angka opsi bahan (0 = default) |
| G | No | Nomor urut komponen |
| H | Komponen | Nama komponen (manual) |
| J | P (Panjang) | mm - manual atau inherit dari Set_up |
| L | L (Lebar) | mm - manual |
| N | T (Tebal) | mm - manual |
| O | Ukuran | Formula: `=J&" x "&L&" x "&N` |
| P | Sub | Sub-jumlah komponen |
| Q | Jml | Jumlah total: `=P*[ref jumlah kabinet]` |

## Mapping Rumus per Kolom

### Material & Lapisan (R-Y)

| Kolom | Formula | Data Validation Source |
|-------|---------|----------------------|
| R | Bahan utama | `tabprt` (Ply, MDF, PB, paper, AL) |
| S | Tebal bahan | `std_Tbahan_prt` ({6,9,12,15,18,24}) |
| T | L_fin (luar) | 0/1 |
| U | D (tebal dalam) | mm (misal 22 = solid HMR) |
| V | Lapisan Luar | `std_lapisan_luar_prt` |
| W | T_luar | 0/1 (jumlah sisi terlapis luar) |
| X | Lapisan Dalam | `std_lapisan_dalam_prt` |
| Y | T_dalam | Tebal lapisan dalam (mm) |

### Edging (Z-AC & AD-AG)

| Kolom | Formula | Keterangan |
|-------|---------|------------|
| Z | P1 (biner) | 1/0 = ada/tidak edging panjang 1 |
| AA | P2 (biner) | 1/0 |
| AB | L1 (biner) | 1/0 |
| AC | L2 (biner) | 1/0 |
| AD | P1 edg | `=IF(Z=1, INDEX(tabprt[edging], MATCH(V, tabprt[luar], 0)), " ")` |
| AE | P2 edg | Serupa AD, bisa pakai X (dalam) |
| AF | L1 edg | Serupa AD untuk sisi L1 |
| AG | L2 edg | Serupa AD untuk sisi L2 |

### Deskripsi (AY-AZ & BA-BB)

| Kolom | Formula | Keterangan |
|-------|---------|------------|
| AY | Deskripsi lapisan | `=IF(W=1, V&"_"&TEXT(T,"0")&"mk_"&X, "")` |
| AZ | Deskripsi edging | `=IF(Z+AA+AB+AC>0, IF(Z+AA+AB+AC=4, AD&"_Keliling", AD&"_"&[sisi-aktif]), " -")` |
| BA | Deskripsi Komponen | `=[No Urut]&") "&H&"_"&AY` |
| BB | Nama Komponen | `=[No]&") "&H&" "&BO&" - "&AY&" ; "&AZ` |

### Dimensi Aktual (BK-BX)

| Kolom | Formula | Defined Name |
|-------|---------|--------------|
| BK | P aktual (m) | `=ROUND((J + tol_p) / 1000, 4)` |
| BL | L aktual (m) | `=ROUND((L + tol_R) / 1000, 4)` |
| BM | 2(P+L) (m) | `=IF(C="prt", 2*(BK+BL), 0)` |
| BN | P×L (m²) | `=IF(C="prt", BK*BL, 0)` |
| BO | Bahan Dasar | `=R & "_" & S` |
| BP | Deskripsi Bahan | `=R & " " & S & " " & AY` |
| BW | M² total | `=BN * Q` |
| BX | M³ | `=BW * N / 1000` |

### Hardware Qty (BD-BJ)

| Kolom | Defined Name | Formula |
|-------|--------------|---------|
| BD | Minifix | `=IF(C="prt", Q * INDEX(tabprt, MATCH(H, tabprt[nama], 0), [col_minifix]), 0)` |
| BE | Dowel | Serupa BD via `std_dowel_prt` |
| BF | @siku | via `std_siku_prt` |
| BG | @screw | via `std_screw_prt` |
| BH | Dormec | via `std_engsel_prt` |
| BI | Engsel | via `std_engsel_prt` |
| BJ | Rel | via `std_rel_prt` |

### Kode Warna (AW-AX)

| Kolom | Formula | Keterangan |
|-------|---------|------------|
| AW | V lap | INDEX/MATCH dari tabel lapisan |
| AX | V edg | INDEX/MATCH dari tabel edging |
| Kode AX | Interpretasi |
| 3333 | Tidak ada edging |
| 4444 | Edging Keliling (semua 4 sisi) |
| 3233 | Edging 1 sisi panjang |
| 1333 | Edging sisi L1 saja |

### CNC Export (CF)

| Kolom | Format CSV |
|-------|------------|
| CF | `J;L;Q;BP;N;H;F;BY;BZ;CA;CB;[reserved];AZ;Y` |

## Defined Names Utama

### Tabel Referensi
- `tabprt` - Tabel utama part: material, edging, hardware
- `tabkab` - Tabel kategori kabinet
- `tabdf` - Tabel kode produksi

### Standard Defaults
- `std_bhn_prt` - Tabel harga bahan
- `std_Tbahan_prt` - {6,9,12,15,18,24}
- `std_lapisan_luar_prt` - Lapisan luar
- `std_lapisan_dalam_prt` - Lapisan dalam
- `std_minifix_prt`, `std_dowel_prt`, `std_siku_prt`, dll

### Toleransi
- `tol_p` - Toleransi panjang
- `tol_R` - Toleransi lebar

## Tipe Row Behavior

| Nilai C | Perilaku Khusus |
|---------|-----------------|
| `Ref` | Header kabinet, tidak punya material |
| `Set_up` | Header grup, ukuran utama kabinet |
| `prt` | Part panel dengan material + edging |
| `kab` | Kabinet sub-unit |
| `Pintu` | Part pintu |
| `Laci` | Part laci |
| `Shelf` | Part shelf |
| `Kc` | Part kaca |