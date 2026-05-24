# Rangkuman Alur Rumus — Sheet `Breakdown`
### File: `master rekap 2025_Bom.xlsb` · Contoh: Row 14–16 (Kolom A–CF)

---

## 1. Struktur Header (Row 11)

Sheet `Breakdown` menggunakan baris 11 sebagai **header aktif**. Baris 1–10 adalah area banner/meta. Baris 12 adalah sub-header tambahan (BY–CB). Data mulai dari baris 14 ke bawah.

```
Row 11 — Header Kolom:
 A  : id           B  : cat.         C  : type          D  : kode
 E  : Tpk          F  : Opt          G  : No             H  : Komponen
 I  : Proses Khusus J : P (Panjang)  K  : x             L  : L (Lebar)
 M  : x            N  : T (Tebal)    O  : Ukuran         P  : Sub
 Q  : Jml          R  : Bahan        S  : T Bahan        T  : L (Lp Luar)
 U  : D (Tebal Dlm) V : Luar         W  : T (T Luar)    X  : Dalam
 Y  : T (T Dalam)  Z  : P1           AA : P2             AB : L1
 AC : L2
 --- Edging ---
 AD : P1 (edg)    AE : P2 (edg)    AF : L1 (edg)     AG : L2 (edg)
 --- Hardware ---
 AH : Profil 3    AI : Profil 2    AJ : Profil        AK : Siku joint
 AL : Screw Jf   AM : Door mec    AN : Rel            AO : Engsel
 --- Bon Anodize ---
 AP : V (batangan) AQ : V2         AR : H
 AS : Nama barang  AT : Panjang    AU : Jumlah
 AV : x           AW : V lap       AX : V edg
 --- Deskripsi ---
 AY : Deskripsi lapisan            AZ : Deskripsi edging
 BA : Deskripsi Komponen           BB : Nama Komponen
 BC : x
 --- Hardware Qty ---
 BD : Minifix     BE : Dowel       BF : @siku         BG : @screw
 BH : Dormec      BI : Engsel      BJ : Rel
 --- Dimensi Aktual ---
 BK : P           BL : L           BM : 2(P+L)        BN : (PxL)
 BO : Bahan Dasar  BP : Deskripsi Bahan
 BQ : /panel (harga per panel)
 BR : jumlah anodize @
 BS : minifix @   BT : dowel @     BU : jml siku      BV : jml screw
 BW : M²          BX : M³
 --- Edging Tebal ---
 BY : T_P1        BZ : T_P2        CA : T_L1          CB : T_L2
 --- CNC ---
 CC : P_cnc       CD : L_cnc       CE : ukuran CNC
 CF : CSV Format
```

---

## 2. Tipe Row (Kolom C — `type`)

Kolom **C** menentukan jenis baris dan seluruh perilaku row:

| Nilai C | Arti | Keterangan |
|---------|------|------------|
| `Ref` | Header kabinet | Baris judul kabinet, biasanya tidak punya material |
| `Set_up` | Setup/header grup | Row 14: header grup "Back Panel Rangka" — menyimpan data ukuran utama |
| `prt` | Part/komponen | Row 15, 16: panel individual dengan material, lapisan, edging |
| `kab` | Kabinet sub-unit | Unit dalam kabinet |
| `Pintu` | Pintu | Part khusus pintu |
| `Laci` | Laci | Part khusus laci |
| `Shelf` | Ambalan | Part khusus shelf |
| `Kc` | Kaca | Part kaca |

---

## 3. Data Contoh — Row 14–16

### Row 14 — `Set_up` (Header Grup)

| Kolom | Nilai | Keterangan |
|-------|-------|------------|
| A | `…` | ID (formula, menampilkan nomor urut / tanda indentasi) |
| B | `…` | Kategori (formula, inherit dari parent) |
| C | `Set_up` | **Tipe baris** — header grup |
| D | `[ks]` | Kode produksi |
| E | `A` | Tipologi (Tpk) |
| F | `` | Opt (opsi bahan, kosong = default) |
| G | `•` | No. komponen (tanda header) |
| H | `Back Panel Rangka (rakit tukang)` | **Nama Komponen** — diisi manual |
| J | `2000` | Panjang (P) — ukuran utama kabinet |
| L | `209` | Lebar (L) |
| N | `75` | Tebal (T) |
| O | `2000 x 209 x 75` | Ukuran gabungan (formula `=J&" x "&L&" x "&N`) |
| Q | `1` | Jumlah |
| AX | `3333` | Kode lapisan (V edg) |
| AZ | ` -` | Deskripsi edging (kosong/dash) |
| BA | `0) Back Panel Rangka (rakit tukang) 2000` | Deskripsi komponen (formula) |
| BB | `0A) Back Panel Rangka (rakit tukang)` | Nama komponen (formula) |
| BK | `2.04` | P aktual (m) |
| BL | `0.249` | L aktual (m) |
| BM | `0` | 2(P+L) — 0 karena Set_up |
| BQ | `0.245` | Harga/panel |
| BS | `2` | Qty minifix |
| BT | `4` | Qty dowel |
| BW | `0.418` | M² (= BK × BL) |
| BX | `0.03135` | M³ (= BW × N/1000) |
| CE | ` x  x 75` | Ukuran CNC |
| CF | ` ` | CSV format (kosong untuk Set_up) |

---

### Row 15 — `prt` (Part KS dengan Lapisan + Edging)

| Kolom | Nilai | Keterangan |
|-------|-------|------------|
| C | `prt` | Tipe: part biasa |
| D | `KS` | Kode: KS (Kaca Solid?) |
| E | `A»` | Tpk (tipologi) |
| F | `0` | Opt (0 = default/no option) |
| G | `...` | No. (sub-komponen) |
| H | `Back Panel Rangka` | Nama komponen |
| J | `2000` | P = 2000 mm (inherit dari Set_up row 14) |
| L | `209` | L = 209 mm |
| N | `19` | T = 19 mm (ketebalan aktual panel ini) |
| O | `2000 x 209 x 19` | Ukuran (formula) |
| P | `1` | Sub (nomor sub) |
| Q | `1` | Jml (jumlah) |
| R | `Ply` | **Bahan** → diisi via Data Validation |
| S | `18` | T Bahan = 18 mm |
| T | `1` | L lapisan Luar |
| U | `0` | D lapisan (tebal luar) |
| V | `WY_5216_D(V)` | **Lapisan Luar** → Data Validation dari `tabprt` |
| W | `1` | T lapisan Luar |
| X | `Polos` | **Lapisan Dalam** → Data Validation dari `tabprt` |
| Y | `0` | T lapisan Dalam |
| Z | `1` | P1 (edging sisi panjang 1) |
| AA | `1` | P2 (edging sisi panjang 2) |
| AB | `1` | L1 (edging sisi lebar 1) |
| AC | `1` | L2 (edging sisi lebar 2) |
| AD | `Edg_EAW_5216D1` | Edging P1 → formula INDEX/MATCH dari `tabprt` |
| AE | `Edg_EAW_5216D1` | Edging P2 |
| AF | `Edg_EAW_5216D1` | Edging L1 |
| AG | `Edg_EAW_5216D1` | Edging L2 |
| AW | `13` | V lap (kode warna lapisan) |
| AX | `4444` | V edg (kode edging) |
| AY | `WY_5216_D(V)_1mk_Polos` | Deskripsi lapisan (formula concat) |
| AZ | `Edg_EAW_5216D1_Keliling` | Deskripsi edging (formula) |
| BA | `403)Back Panel Rangka_WY_5216_D(V)_1mk_Polos` | Deskripsi komponen |
| BB | `403)Back Panel Rangka Ply 18mm - WY_5216_D(V)_1mk_Polos ; Edg_EAW_5216D1_Keliling` | Nama komponen lengkap |
| BK | `2.04` | P aktual (m) |
| BL | `0.249` | L aktual (m) |
| BM | `4.578` | 2(P+L) = 2×(2.04+0.249) |
| BN | `0.418` | P×L = 2.04×0.249 |
| BO | `Ply_18` | Bahan Dasar (formula dari R & S) |
| BP | `Ply 18 WY_5216_D(V)_1mk_Polos` | Deskripsi Bahan (formula) |
| BQ | `0.2451` | Harga/panel |
| BW | `0.418` | M² |
| BX | `0.007942` | M³ (= BW × 19/1000) |

---

### Row 16 — `prt` (Part KS dengan Lapisan Berbeda + Edging Melanor)

| Kolom | Nilai | Keterangan |
|-------|-------|------------|
| H | `Rangka back panel` | Nama komponen |
| J | `2430` | P = 2430 mm (beda dari row 15) |
| L | `55` | L = 55 mm |
| N | `18.5` | T = 18.5 mm |
| R | `Ply` | Bahan |
| S | `18` | T Bahan |
| U | `22` | D lapisan |
| V | `Polos` | Lapisan Luar |
| X | `Aica` | **Lapisan Dalam** = Aica (laminasi HPL) |
| Y | `0.5` | T lapisan Dalam = 0.5 mm |
| AE | `Melanor` | Edging P2 = Melanor |
| AW | `37` | V lap |
| AX | `3233` | V edg |
| AY | `Aica_1mk_Polos` | Deskripsi lapisan |
| AZ | `Melanor_1sisi_pjg` | Deskripsi edging |
| BK | `4.94` | P aktual |
| BL | `0.19` | L aktual |
| BM | `10.26` | 2(P+L) |
| BN | `0.2673` | P×L |
| BZ | `0.5` | T_P2 = tebal edging P2 (Melanor = 0.5 mm) |
| CF | `2430;55;2;Ply 18 Aica_1mk_Polos;18,5;Rangka back panel;-1; ;; ;; ;;Melanor;0,5` | **CSV Format** (format ekspor CNC) |

---

## 4. Alur Rumus Per Kelompok Kolom

### 4.1 Kolom A–C : Identitas & Tipe

```
A (id)   = formula pelacak urutan/indentasi, berbasis tanda "…"
B (cat.) = formula inherit kategori dari row Ref parent (pintu / kabinet / dll)
C (type) = diisi manual (Ref / Set_up / prt / kab / Pintu / Laci)
```

---

### 4.2 Kolom D–H : Kode, Tipologi, Nama

```
D (kode)     = diisi manual atau dropdown (KS / KS+ / non KS / dll)
E (Tpk)      = diisi manual / dropdown tipologi (A / B / A» dll)
F (Opt)      = angka opsi bahan (0 = default; 1 = opsi alternatif)
G (No)       = nomor urut komponen dalam grup (formula atau manual)
H (Komponen) = nama komponen (diisi manual)
I (Proses Khusus) = keterangan proses khusus (manual)
```

---

### 4.3 Kolom J–O : Dimensi Komponen

```
J  (P)      = Panjang (mm) — diisi manual atau inherit dari Set_up
L  (L)      = Lebar   (mm)
N  (T)      = Tebal   (mm)
O  (Ukuran) = formula: =J&" x "&L&" x "&N
              → contoh: "2000 x 209 x 19"
K, M        = literal "x" (separator teks)
```

---

### 4.4 Kolom P–Q : Sub & Jumlah

```
P (Sub)  = sub-jumlah komponen dalam satu set
Q (Jml)  = jumlah total (biasanya = P × Jml_kabinet)
           formula: =P*[ref jumlah kabinet dari Spek sheet]
```

---

### 4.5 Kolom R–Y : Material & Lapisan

```
R (Bahan)   = jenis material utama:
              Data Validation → LIST dari Defined Name: tabprt
              Opsi: Ply / MDF / PB / paper / AL / dll

S (T Bahan) = tebal nominal bahan (mm):
              Data Validation → LIST dari Defined Name: std_Tbahan_prt
              (biasanya: 6 / 9 / 12 / 15 / 18 / 24)

T (L_fin)   = tebal lapisan Luar (biasanya 0 atau 1)
U (D)       = tebal lapisan Dalam (mm, misal 22 = solid HMR)

V (Luar)    = nama lapisan LUAR:
              Data Validation → LIST dari Defined Name: std_lapisan_luar_prt
              → tabel: tabprt (sheet Breakdown / tabel tersembunyi)
              Contoh: WY_5216_D(V) / Polos / Duco / Aica / HPL...

W (T_luar)  = jumlah sisi yang terlapis di luar (0/1)

X (Dalam)   = nama lapisan DALAM:
              Data Validation → LIST dari Defined Name: std_lapisan_dalam_prt
              Contoh: Polos / Aica / Duco / HPL...

Y (T_dalam) = tebal lapisan dalam (mm, misal 0.5 untuk Aica / Melanor)
```

---

### 4.6 Kolom Z–AC : Edging Side (Biner — ada/tidak)

```
Z  (P1) = 1/0 → apakah sisi Panjang-1 di-edging
AA (P2) = 1/0 → apakah sisi Panjang-2 di-edging
AB (L1) = 1/0 → apakah sisi Lebar-1 di-edging
AC (L2) = 1/0 → apakah sisi Lebar-2 di-edging
```

> Data Validation untuk Z–AC: **LIST** `{0,1}` atau **nama defined** biner

---

### 4.7 Kolom AD–AG : Nama Edging per Sisi

```
AD (P1 edg) = formula INDEX/MATCH:
  =IF(Z=1,
      INDEX(tabprt[kolom_edging], MATCH(V, tabprt[kolom_luar], 0)),
      " ")
  → mencari edging yang sesuai dengan lapisan luar V
  → Contoh: V="WY_5216_D(V)" → AD="Edg_EAW_5216D1"
  → Contoh: V="Polos" → AD=" " (kosong/spasi)
  → Contoh: AE="Melanor" (untuk P2 dengan X="Aica")

AE (P2 edg) = serupa AD, berbasis lapisan yang berbeda (bisa Dalam jika sisi P2 expose)
AF (L1 edg) = serupa AD untuk sisi L1
AG (L2 edg) = serupa AD untuk sisi L2
```

> **Tabel lookup**: Defined Name **`tabprt`** → range di sheet `Breakdown` (hidden/named range)
> yang memetakan: `[Lapisan Luar] → [Kode Edging]`

---

### 4.8 Kolom AH–AJ : Profil

```
AH (Profil 3) = qty profil tipe 3 — formula/manual
AI (Profil 2) = qty profil tipe 2
AJ (Profil)   = qty profil standard
              → referensi: Defined Names: prof / profil / prof_pintu_1 / prof_pintu_2 / dll
```

---

### 4.9 Kolom AK–AO : Hardware

```
AK (Siku joint) = qty siku joint
                  → Defined Name: siku_joint → konstanta qty per joint
AL (Screw Jf)   = qty screw joint frame
                  → Defined Name: screw_jf → konstanta
AM (Door mec)   = door mechanism (Dormec)
AN (Rel)        = qty rel laci
                  → Defined Name: Rel / rel_pantry / rel_wrd
AO (Engsel)     = qty engsel
                  → Defined Name: engsel (tersedia beberapa tipe)
```

---

### 4.10 Kolom AP–AU : Bon Anodize

```
AP (V batangan)  = formula qty batangan anodize vertikal
AQ (V2)          = qty batangan anodize vertikal tipe 2
AR (H)           = qty batangan anodize horizontal
AS (Nama barang) = formula: nama barang anodize (dari lookup)
                   → Defined Name: std_anodize_per_ukuran
AT (Panjang)     = panjang potongan anodize (mm)
AU (Jumlah)      = jumlah total batangan
```

---

### 4.11 Kolom AW–AX : Kode Warna

```
AW (V lap) = kode numerik lapisan (lookup ke tabel warna/lapisan)
             Contoh: "13" = kode untuk WY_5216_D(V)
                     "37" = kode untuk Aica_1mk_Polos
             Formula: INDEX/MATCH dari tabel lapisan (tabprt atau Spek)

AX (V edg) = kode numerik edging
             Contoh: "4444" = Edg_EAW_5216D1 (keliling)
                     "3333" = tidak ada edging
                     "3233" = Melanor_1sisi_pjg
             Formula: INDEX/MATCH dari tabel edging
```

---

### 4.12 Kolom AY–AZ : Deskripsi Lapisan & Edging

```
AY (Deskripsi lapisan) = formula CONCAT/TEXT:
  =IF(W=1, V&"_"&TEXT(T,"0")&"mk_"&X, "")
  → contoh: "WY_5216_D(V)_1mk_Polos"
  → "Aica_1mk_Polos"

AZ (Deskripsi edging) = formula:
  =IF(Z+AA+AB+AC>0,
      IF(Z+AA+AB+AC=4, AD&"_Keliling",
         AD&"_"&[sisi-sisi yang aktif]),
      " -")
  → contoh: "Edg_EAW_5216D1_Keliling" (semua 4 sisi)
  → "Melanor_1sisi_pjg" (hanya P2)
```

---

### 4.13 Kolom BA–BB : Deskripsi & Nama Komponen

```
BA (Deskripsi Komponen) = formula CONCAT:
  =[No Urut]&") "&H&"_"&AY
  → contoh: "403)Back Panel Rangka_WY_5216_D(V)_1mk_Polos"
  → "414)Rangka back panel_Aica_1mk_Polos"

BB (Nama Komponen) = formula CONCAT panjang:
  =[No Urut]&") "&H&" "&BO&" - "&AY&" ; "&AZ&"  "
  → contoh: "403)Back Panel Rangka Ply 18mm - WY_5216_D(V)_1mk_Polos ; Edg_EAW_5216D1_Keliling"
```

---

### 4.14 Kolom BD–BJ : Qty Hardware per Panel

```
BD (Minifix) = formula:
  =IF(C="prt", Q * INDEX(tabprt, MATCH(H, tabprt[nama], 0), [col_minifix]), 0)
  → OR: =Q * std_minifix_prt
  → Contoh row15: 0 (jenis ini tidak pakai minifix)

BE (Dowel)   = serupa BD, mengacu std_dowel_prt

BF (@siku)   = qty siku per panel
               → Defined Name: std_siku_prt

BG (@screw)  = qty screw
               → Defined Name: std_screw_prt

BH (Dormec)  = qty door mechanism
               → Defined Name: std_engsel_prt (atau terpisah)

BI (Engsel)  = qty engsel
               → Defined Name: std_engsel_prt

BJ (Rel)     = qty rel
               → Defined Name: std_rel_prt
```

---

### 4.15 Kolom BK–BN : Dimensi Aktual (meter)

```
BK (P aktual) = formula konversi mm → m dengan toleransi:
  =ROUND((J - tol_p) / 1000, 4)
  → row15: (2000+40)/1000 = 2.04 m  ← termasuk tambahan CNC
  → Defined Name tol_p: toleransi panjang

BL (L aktual) = serupa BK untuk lebar
  =ROUND((L - tol_R) / 1000, 4)
  → row15: (209+40)/1000 = 0.249 m
  → Defined Name tol_R: toleransi lebar

BM (2(P+L))  = formula:
  =IF(C="Set_up", 0, 2*(BK+BL))
  → row15: 2*(2.04+0.249) = 4.578
  → dipakai untuk hitung keliling edging

BN (P×L)     = formula:
  =IF(C="Set_up", 0, BK*BL)
  → row15: 2.04*0.249 = 0.418
  → dipakai untuk hitung luas (m²)
```

> **Defined Names terkait**: `tol_p`, `tol_R`, `tol`

---

### 4.16 Kolom BO–BP : Bahan Dasar & Deskripsi Bahan

```
BO (Bahan Dasar) = formula CONCAT:
  =IF(C="Set_up", "_",
      R & "_" & S)
  → row15: "Ply_18"
  → row16: "Ply_18"
  → dipakai sebagai key lookup ke tabel harga bahan

BP (Deskripsi Bahan) = formula:
  =IF(C="Set_up", "  ",
      R & " " & S & " " & AY)
  → row15: "Ply 18 WY_5216_D(V)_1mk_Polos"
  → row16: "Ply 18 Aica_1mk_Polos"
```

---

### 4.17 Kolom BQ : Harga Per Panel

```
BQ (/panel) = formula INDEX/MATCH ke tabel harga:
  =INDEX(std_bhn_prt[harga],
         MATCH(BO, std_bhn_prt[kode_bahan], 0))
  → mencari harga material berdasarkan BO (kode bahan)
  → Defined Name: std_bhn_prt → range tabel harga bahan di sheet tersembunyi
  → row15: 0.2451... = Rp/m² (atau konstanta)

  Alternatif berdasarkan paket:
  =INDEX(paket_ply_polos, ...) atau
  =INDEX(paket_ply_aica, ...)
  → tergantung kombinasi R+V+X
```

---

### 4.18 Kolom BR–BV : Qty Hardware Total

```
BR (jumlah anodize @) = formula jumlah total anodize
BS (minifix @)  = jumlah minifix total = BD * Q
BT (dowel @)    = jumlah dowel total = BE * Q
BU (jml siku)   = jumlah siku total = BF * Q
BV (jml screw)  = jumlah screw total = BG * Q
```

---

### 4.19 Kolom BW–BX : Luas & Volume

```
BW (M²) = formula luas:
  =IF(C="Set_up", BK*BL,
      BN * Q)
  → row15: 0.418 m² (= 2.04 × 0.249 × 1)
  → digunakan untuk rekapitulasi bahan di sheet rekap full

BX (M³) = formula volume:
  =BW * N / 1000
  → row15: 0.418 × 19/1000 = 0.007942 m³
  → row14: 0.418 × 75/1000 = 0.03135 m³
```

---

### 4.20 Kolom BY–CB : Tebal Edging per Sisi

```
BY (T_P1) = tebal edging sisi P1 (mm)
  =IF(Z=1, INDEX(tabprt_edg[tebal], MATCH(AD, tabprt_edg[nama], 0)), "")
  → nilai tipikal: 0.5 (melanor), 2 (PVC), 1 (ABS)

BZ (T_P2) = tebal edging sisi P2
  → row16: 0.5 (Melanor)

CA (T_L1) = tebal edging sisi L1
CB (T_L2) = tebal edging sisi L2
```

> **Defined Names terkait**: `tbl_edg` → tabel edging dengan kolom nama + tebal

---

### 4.21 Kolom CC–CE : Dimensi CNC

```
CC (P_cnc) = panjang untuk CNC (mm):
  =IF(C="prt", J + [offset CNC], "")
  → biasanya J dengan tambahan allowance

CD (L_cnc) = lebar untuk CNC (mm):
  =IF(C="prt", L + [offset CNC], "")

CE (ukuran CNC) = formula TEXT concat:
  =" x " & IF(CC="","",CC) & " x " & N
  → row14: " x  x 75"   (Set_up — P & L kosong)
  → row15: " x  x 19"
  → row16: " x  x 18,5"
```

---

### 4.22 Kolom CF : CSV Format (Ekspor CNC)

```
CF (CSV Format) = formula gabungan untuk ekspor ke mesin CNC:
  =IF(C<>"prt", " ",
      J & ";" & L & ";" & Q & ";" &
      BP & ";" & N & ";" & H & ";" &
      F & ";" & BY & ";" & BZ & ";" &
      CA & ";" & CB & ";" & BZ & ";" &
      AZ & ";" & Y)

Contoh row16:
  "2430;55;2;Ply 18 Aica_1mk_Polos;18,5;Rangka back panel;-1; ;; ;; ;;Melanor;0,5"

Breakdown field CSV:
  [0] J    = 2430       → Panjang
  [1] L    = 55         → Lebar
  [2] Q    = 2          → Jumlah
  [3] BP   = Ply 18 Aica_1mk_Polos  → Deskripsi bahan
  [4] N    = 18,5       → Tebal
  [5] H    = Rangka back panel → Nama komponen
  [6] F    = -1         → Opsi (-1 = ada opsi)
  [7] BY   =            → Tebal edging P1 (kosong)
  [8] BZ   =            → Tebal edging P2 (kosong dalam array index)
  [9] CA   =            → Tebal edging L1
  [10] CB  =            → Tebal edging L2
  [11]     =            → (reserved)
  [12] AZ  = Melanor    → Deskripsi edging
  [13] Y   = 0,5        → Tebal lapisan dalam
```

---

## 5. Relasi Antar Sheet

```
┌──────────────┐    INDEX/MATCH     ┌───────────────────┐
│   Breakdown  │ ←───────────────── │  Data Validation  │
│  (sheet utama│    tabel material,  │  (master daftar   │
│   perhit.)   │    edging, hardware │   kabinet & parts)│
└──────┬───────┘                    └───────────────────┘
       │                                      ▲
       │ referensi nilai                       │ sumber DV
       ▼                                      │
┌──────────────┐                    ┌──────────────────┐
│    Spek      │                    │   Defined Names   │
│ (header      │                    │  (tabprt, tabkab, │
│  proyek,     │                    │  std_*, paket_*,  │
│  nama_proyek,│                    │  tbl_edg, dll)    │
│  no_kontrak) │                    └──────────────────┘
└──────────────┘
       │
       ▼
┌──────────────┐    SUMPRODUCT/SUMIF  ┌─────────────────┐
│  rekap full  │ ←──────────────────  │    Breakdown    │
│ (rekapitulasi│    BW, BX, BD, BE    │  (BW=M², BX=M³) │
│  bahan)      │    per material type │                 │
└──────────────┘                      └─────────────────┘
       │
       ▼
┌──────────────┐                    ┌─────────────────┐
│     Bom      │                    │  Cutting Bom /  │
│ (Bill of     │                    │  Cutting KS /   │
│  Material)   │                    │  Cutting NonKS  │
└──────────────┘                    └─────────────────┘
```

---

## 6. Data Validation — Sumber per Kolom

| Kolom | Header | Tipe DV | Sumber (Defined Name / Range) |
|-------|--------|---------|-------------------------------|
| B | cat. | List | `tabkab` — daftar kategori (pintu, kabinet, dll) |
| C | type | List | Hardcoded: `Ref,Set_up,prt,kab,Pintu,Laci,Shelf,Kc` |
| D | kode | List | `tabdf` — daftar kode produksi |
| E | Tpk | List | `tabte` / `tabprt` — tipologi |
| R | Bahan | List | `tabprt` — jenis material (Ply, MDF, PB, paper, AL, dll) |
| S | T Bahan | List | `std_Tbahan_prt` — tebal bahan: `{6,9,12,15,18,24}` |
| V | Luar | List | `std_lapisan_luar_prt` — pilihan lapisan luar |
| X | Dalam | List | `std_lapisan_dalam_prt` — pilihan lapisan dalam |
| Z–AC | P1/P2/L1/L2 | List | `{0,1}` atau binary defined name |
| AH–AJ | Profil | List | `profil` / `prof_cor_1` dll — tipe profil |
| AN | Rel | List | `Rel` — tipe rel (TANDEM, LEGRABOX, dll) |
| AO | Engsel | List | `engsel` — tipe engsel |

---

## 7. INDEX/MATCH Utama

### 7.1 Lookup Edging (AD–AG)

```excel
=IF(Zn=1,
    INDEX(tabprt[edging_col],
          MATCH(Vn, tabprt[luar_col], 0)),
    " ")
```

- **Lookup value**: nilai kolom V (lapisan luar) atau X (lapisan dalam)
- **Lookup array**: kolom "lapisan" dalam tabel `tabprt`
- **Return array**: kolom "edging" dalam tabel `tabprt`
- **Catatan**: jika sisi P2 expose lapisan dalam (X), lookup menggunakan X

### 7.2 Lookup Kode Warna Lapisan (AW)

```excel
=INDEX(tabprt[kode_lap],
       MATCH(V & "_" & TEXT(W,"0") & "mk_" & X,
             tabprt[deskripsi_lap], 0))
```

- Lookup berdasarkan deskripsi lapisan gabungan (AY)
- Return: kode numerik lapisan

### 7.3 Lookup Kode Edging (AX)

```excel
=INDEX(tbl_edg[kode],
       MATCH(AZ, tbl_edg[deskripsi], 0))
```

- Lookup berdasarkan AZ (deskripsi edging)
- Return: kode numerik edging (misal "4444" = keliling, "3333" = tanpa edging)

### 7.4 Lookup Harga Bahan (BQ)

```excel
=IF(C="Set_up",
    [harga_setup],
    INDEX(std_bhn_prt,
          MATCH(BO, std_bhn_prt[kode], 0)))
```

- Lookup berdasarkan BO (Bahan Dasar: "Ply_18", "MDF_18", dll)
- `std_bhn_prt` = named range tabel harga bahan

### 7.5 Lookup Hardware (BD–BJ via std_* names)

```excel
=IF(C="prt",
    Q * INDEX(tabprt[minifix],
              MATCH(H, tabprt[nama_komp], 0)),
    0)
```

- Atau langsung: `=Q * std_minifix_prt` (jika std_minifix_prt adalah konstanta)
- Tabel sumber: `Data Validation` sheet kolom K-L (MINIFIX HETTICH, DOWEL KAYU 4X8)

---

## 8. Defined Names — Daftar & Fungsi

### 8.1 Tabel Referensi (`tab*`)

| Defined Name | Fungsi |
|-------------|--------|
| `tabprt` | Tabel utama part: daftar komponen → material, edging, hardware |
| `tabkab` | Tabel kabinet (kategori) |
| `tabdf` | Tabel kode (kode produksi/dokumen) |
| `tabse` | Tabel setting/setup |
| `tabsf` | Tabel frame/stiffener |
| `tabte` | Tabel tipologi/Tpk |
| `tabtf` | Tabel frame thickness |
| `tabtft` | Tabel frame fit/tolerance |
| `tabthm` | Tabel HMR (moisture resistant) |
| `tabtpm` | Tabel tipis/medium |
| `tabfr` | Tabel frame |
| `tabprtKS√` | Tabel part khusus KS |

### 8.2 Standard Defaults (`std_*`)

| Defined Name | Fungsi |
|-------------|--------|
| `std_bhn_prt` | Tabel harga/standar bahan per part |
| `std_Tbahan_prt` | List tebal bahan (6,9,12,15,18,24) |
| `std_lapisan_luar_prt` | List lapisan luar |
| `std_lapisan_dalam_prt` | List lapisan dalam |
| `std_edg_P1_prt` | Standar edging sisi P1 |
| `std_edg_P2_prt` | Standar edging sisi P2 |
| `std_edg_L1_prt` | Standar edging sisi L1 |
| `std_edg_L2_prt` | Standar edging sisi L2 |
| `std_minifix_prt` | Qty minifix default per part |
| `std_dowel_prt` | Qty dowel default per part |
| `std_siku_prt` | Qty siku default per part |
| `std_screw_prt` | Qty screw default per part |
| `std_engsel_prt` | Qty engsel default per part |
| `std_rel_prt` | Qty rel default per part |
| `std_profil_prt` | Profil default per part |
| `std_profil2_prt` | Profil tipe 2 |
| `std_profil3_prt` | Profil tipe 3 |
| `std_sub_prt` | Sub default per part |
| `std_anodize_per_ukuran` | Standar anodize per ukuran |
| `std_anodizeh_proses` | Proses anodize horizontal |
| `std_anodizev_proses` | Proses anodize vertikal |
| `std_jml_anodize_per_uk` | Jumlah anodize per ukuran |

### 8.3 Toleransi Dimensi

| Defined Name | Fungsi |
|-------------|--------|
| `tol` | Toleransi umum (mm) |
| `tol_p` | Toleransi panjang |
| `tol_R` | Toleransi lebar/radius |

### 8.4 Material Types

| Defined Name | Fungsi |
|-------------|--------|
| `Ply` | Standar Plywood biasa |
| `PlyH2` | Plywood moisture-resistant |
| `MDF` | MDF standard |
| `MDFH1` / `MDFH2` | MDF HMR grade 1/2 |
| `PB_15` / `PB_25` / `PB_A` | Particle Board tipe |
| `paper` | Bahan paper |

### 8.5 Paket Material (Kombo Bahan+Lapisan)

| Defined Name | Kombinasi |
|-------------|-----------|
| `paket_ply_polos` | Plywood + Polos |
| `paket_ply_aica` | Plywood + Aica HPL |
| `paket_ply_duco` | Plywood + Duco (cat) |
| `paket_ply_hb41130` | Plywood + HB41130 |
| `paket_ply_m41130` | Plywood + M41130 |
| `paket_ply_lantrex_polos` | Plywood Lantrex + Polos |
| `paket_plyhmr_1mk` / `_2mk` | Plywood HMR 1 muka / 2 muka |
| `paket_mdf_polos` | MDF + Polos |
| `paket_mdf_hb41130` | MDF + HB41130 |
| `paket_UPVC_polos` | UPVC + Polos |
| `paket_al01` | Aluminium 01 |

### 8.6 Profil Aluminium

| Defined Name | Fungsi |
|-------------|--------|
| `profil` | Profil AL standar |
| `profil_2` / `profil_3` | Profil tipe 2/3 |
| `Profil_Top` | Profil top rail |
| `prof_pintu_1/2/3` | Profil pintu tipe 1/2/3 |
| `prof_panel_1/2/3` | Profil panel |
| `prof_cor_1/2/3` | Profil corner |
| `prof_pl_1/2/3` | Profil plate |

### 8.7 Hardware

| Defined Name | Fungsi |
|-------------|--------|
| `minifix` | Minifix standar |
| `minifix_hettich` | Minifix Hettich |
| `siku_joint` | Siku joint |
| `screw_jf` | Screw joint frame |
| `Rel` | Rel laci standar |
| `rel_pantry` | Rel pantry |
| `rel_wrd` | Rel wardrobe |
| `legrabox` | Laci Legrabox Blum |
| `tandembox` | Laci Tandembox Blum |
| `merivobox` | Laci Merivobox Hettich |

### 8.8 Dimensi Minimum Laci

| Defined Name | Fungsi |
|-------------|--------|
| `T_min_B1S1` | Tinggi min Tandembox S1 |
| `T_min_Legra_S1/S4/S4XL` | Tinggi min Legrabox S1/S4/S4XL |
| `T_min_merivo_S1/S2/S4/S4XL` | Tinggi min Merivobox |
| `T_min_Av1/2/3/4` | Tinggi min Avantech |

### 8.9 Identitas Proyek (dari sheet Spek)

| Defined Name | Fungsi |
|-------------|--------|
| `nama_proyek` | Nama proyek (ref ke Spek!D15) |
| `no_kontrak` | No. kontrak (ref ke Spek!D12) |
| `nip` | NIP proyek (ref ke Spek!D13) |
| `no_ref` | No. referensi |
| `No_proyek` | No. proyek |

---

## 9. Flow Lengkap Per Row (Summary)

```
USER INPUT (manual):
  C (type) → H (nama) → J/L/N (dimensi) → R/S (bahan) →
  V (luar) → X (dalam) → Z/AA/AB/AC (edging side) → F (opt)

DERIVED (formula):
  O = J & " x " & L & " x " & N               → ukuran string
  AY = V & "_" & W & "mk_" & X                 → deskripsi lapisan
  AD–AG = INDEX/MATCH(V/X → tabprt)            → nama edging
  AZ = edging description (dari AD + flag Z–AC)
  BA = No & ") " & H & "_" & AY               → deskripsi komponen
  BB = No & ") " & H & " " & BO & " - " & AY & " ; " & AZ → nama lengkap

  BK = (J + tol_p) / 1000                      → P aktual (m)
  BL = (L + tol_R) / 1000                      → L aktual (m)
  BM = IF(prt, 2*(BK+BL), 0)                  → keliling (m)
  BN = IF(prt, BK*BL, 0)                       → luas (m²)
  BO = R & "_" & S                              → kode bahan
  BP = R & " " & S & " " & AY                  → deskripsi bahan
  BQ = INDEX/MATCH(BO → std_bhn_prt)           → harga/panel
  BW = BN * Q                                   → total M²
  BX = BW * N / 1000                           → total M³
  BZ/BY/CA/CB = tebal edging per sisi          → dari tbl_edg
  CF = J&";"&L&";"&Q&";"&BP&";"&N&";"&H&";"&F&...  → CSV ekspor CNC
```

---

## 10. Kode Validasi AX (V edg)

Berdasarkan observasi nilai:

| Kode AX | Interpretasi |
|---------|-------------|
| `3333` | Tidak ada edging (Set_up atau tanpa edging) |
| `4444` | Edging Keliling (semua 4 sisi) |
| `3233` | Edging 1 sisi panjang (1sisi_pjg) |
| `1333` | Edging sisi L1 saja |
| `3133` | Edging sisi P1 saja |

> Format 4 digit merepresentasikan status P1-P2-L1-L2 (1=ada, 3=tidak ada edging)

---

*Dokumen ini dibuat secara otomatis dari analisis binary BIFF12 file `master rekap 2025_Bom.xlsb`, dikombinasikan dengan parsing nilai aktual rows 14–16 dan ekstraksi 546 Defined Names dari workbook.bin.*
