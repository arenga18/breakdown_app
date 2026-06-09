# Skill: Cabinet Breakdown Formula Migration
**Untuk**: Google Antigravity  
**Domain**: Furniture Manufacturing / Interior Production  
**Versi**: 1.0  
**Bahasa**: Bahasa Indonesia / English (bilingual)

---

## Deskripsi Skill

Skill ini membantu Anda **memigrasikan logika formula Excel dari sistem Breakdown Kabinet** (`master rekap 2026_Bom.xlsx`) ke dalam custom web app. Skill mengerti seluruh arsitektur relasi 4 sheet (`Spek`, `Data Validation`, `stock`, `Breakdown`), tipe baris (`Ref`, `Set_up`, `prt`), 84 kolom kalkulasi, dan output akhir berupa format CSV untuk mesin CNC.

---

## Trigger / Kapan Skill Ini Diaktifkan

Aktifkan skill ini ketika pengguna:
- Menyebut nama sheet: `Breakdown`, `Spek`, `Data Validation`, `stock`
- Menyebut kode kolom dalam konteks migrasi: `kode`, `Bahan`, `T Bahan`, `edging`, `M²`, `M³`, `CNC`, `CSV Format`
- Menanyakan cara mengkonversi rumus Excel seperti `INDEX/MATCH`, `IFERROR`, `CONCATENATE`, `ROUNDUP` ke JavaScript/TypeScript
- Meminta struktur database/tabel untuk menggantikan defined names Excel
- Meminta logika kalkulasi dimensi, edging, hardware, atau harga
- Menyebut istilah produksi: `kabinet`, `panel`, `engsel`, `minifix`, `dowel`, `edging PVC`, `HPL`, `Decosheet`, `CNC`, `drafter`

---

## Pengetahuan Inti (Core Knowledge)

### A. Arsitektur Sistem (4 Sheet → 4 Tabel/Koleksi)

```
Excel Sheet        →  Web App Equivalent
─────────────────────────────────────────────────
Spek               →  projects / cabinet_specs (input form)
Data Validation    →  component_master (read-only lookup DB)
stock              →  inventory / materials (inventory DB)
Breakdown          →  breakdown_calculator (computed layer / state)
```

**Relasi Data:**
- `Spek` → menyuplai `ref` (kode kabinet) dan `no_ref` (qty) ke Breakdown
- `Data Validation` → menyuplai semua default komponen: bahan, tebal, edging 4 sisi, finishing, hardware
- `stock` → menyuplai ID barang, nama edging, dan tebal fisik edging
- `Breakdown` → menggabungkan ketiganya, menghasilkan M², M³, dan CSV CNC

---

### B. Tipe Baris & Logika Hierarki

Setiap baris di Breakdown memiliki `type` di Kolom C yang menentukan cara formula bekerja:

| Type    | Fungsi                          | Contoh Kalkulasi                              |
|---------|----------------------------------|-----------------------------------------------|
| `Ref`   | Unit kabinet utuh               | Hitung engsel, rel, siku berdasarkan tinggi/lebar kabinet |
| `Set_up`| Header modul (group komponen)   | Tampung ukuran dasar sebelum deduksi          |
| `prt`   | Panel/part individual           | Kalkulasi penuh: dimensi, bahan, edging, M², M³, CNC |

**Pola Warisan Dimensi:**
```
Set_up (J14)  ← ukuran dasar dari Spek
  └─ prt (J15) = J14 - toleransi          ← deduksi trim/nat
       └─ prt (J16) = J15 - 1             ← deduksi presisi (kaca masuk alur)
```

---

### C. Kamus 84 Kolom (A–CF) untuk Migrasi

#### Grup 1: Identitas & Referensi (Kolom A–H)

| Kolom | Field      | Logika Migrasi ke JS/TS                                              |
|-------|------------|----------------------------------------------------------------------|
| A     | `id`       | `inventory.find(i => i.name === row.komponen)?.id ?? "…"`           |
| B     | `cat`      | `componentMaster.find(c => c.part === row.komponen)?.category ?? "…"` |
| C     | `type`     | Static input: `"Ref"`, `"Set_up"`, atau `"prt"`                     |
| D     | `kode`     | Untuk Ref: lookup `KS_Set` by `Set_prt`. Untuk prt: lookup `KS` by `Prt` |
| E     | `Tpk`      | Static dropdown input: `"A"`, `"B"`, `"A»"`                        |
| F     | `opt`      | `componentMaster.find(c => c.part === row.komponen)?.opt ?? 0`      |
| G     | `No`       | `spek.find(s => s.ref === row.komponen)?.no_ref ?? "..."`           |
| H     | `komponen` | Static input dari drafter (nama part)                                |

#### Grup 2: Dimensi Fisik (Kolom I, J, K, L, M, N, O)

| Kolom | Field    | Logika Migrasi                                                                 |
|-------|----------|--------------------------------------------------------------------------------|
| I     | `Proses Khusus` | Static manual input (alur LED, bevel, coak)                           |
| J     | `P`      | Panjang mentah (mm). Bervariasi per tipe row — lihat tabel deduksi di bawah   |
| K     | `x`      | Literal `"x"` — separator visual, tidak perlu dikalkulasi                     |
| L     | `L`      | Lebar mentah (mm). Sering mewarisi dari baris Set_up atau dari J setup lain   |
| M     | `x`      | Literal `"x"` — separator visual                                              |
| N     | `T`      | `row.T_bahan + row.T_luar + row.T_dalam` (tebal komposit total)               |
| O     | `sat`    | Satuan (biasanya `"mm"`) — static                                             |

**Tabel Deduksi Panjang (Kolom J) per Konteks:**
```javascript
// Pintu / Frame kaca → kurangi trim 2x
J_prt = J_setup - (2 * trim)          // trim dari Data Validation = konstan

// Kaca interior → -1mm presisi
J_kaca = J_frame - 1

// Panel laci dalam lebar
J_laci = J_setup - nat - nat          // nat = toleransi nat dari Data Validation

// Panel top/bottom dengan tebal siku
J_panel = J_ref - T_side1 - T_side2
```

#### Grup 3: Produksi & Kuantitas (Kolom P, Q)

| Kolom | Field   | Logika Migrasi                                              |
|-------|---------|-------------------------------------------------------------|
| P     | `sub`   | Qty per set (static input per template komponen)            |
| Q     | `Jml`   | `row.sub * parent_set_qty` — qty total produksi             |

```javascript
// Q = P_baris_ini × Q_baris_setup_di_atasnya
const qty = row.sub * parentRow.qty;
```

#### Grup 4: Bahan & Finishing (Kolom R–Y, AW, AY)

| Kolom | Field        | Logika Migrasi                                                          |
|-------|--------------|-------------------------------------------------------------------------|
| R     | `Bahan`      | `componentMaster.find(c=>c.part===komponen)?.std_bhn ?? ""`            |
| S     | `T Bahan`    | `componentMaster.find(c=>c.part===komponen)?.std_Tbahan ?? ""`         |
| T     | `Fin Luar`   | Default finishing luar dari master DB                                   |
| U     | `Fin Dalam`  | Default finishing dalam                                                  |
| V     | `Luar`       | `finishingTable.find(f=>f.code===row.fin_luar)?.name ?? ""`           |
| W     | `T Luar`     | `finishingTable.find(f=>f.name===row.luar)?.thickness ?? 0`           |
| X     | `Dalam`      | Sama dengan V tapi untuk sisi dalam                                     |
| Y     | `T Dalam`    | Sama dengan W tapi untuk sisi dalam                                     |
| AW    | `V lap`      | `String(tabFinishing[row.luar]) + String(tabFinishing[row.dalam])`     |
| AY    | `Deskripsi lapisan` | `descFinishing[row.v_lap] ?? ""`                              |

```javascript
// Tebal komposit total (Kolom N)
const T_total = T_bahan + T_luar + T_dalam;

// Kode gabungan finishing (Kolom AW)
const v_lap = `${tabFinishing[finLuar]}${tabFinishing[finDalam]}`;

// Deskripsi lapisan (Kolom AY)
const deskripsiLapisan = descFinishing[v_lap] ?? "";
```

#### Grup 5: Konfigurasi Edging (Kolom Z–AG, AX, AZ, BY–CB)

> [!IMPORTANT]
> **Mispersepsi Kritis Terkoreksi:** Kolom `Edg P1` s.d `Edg L2` bukanlah data statis yang disimpan per templat komponen di database. Kolom ini adalah **kolom kalkulasi murni (derived columns)** di sheet breakdown yang rumusnya seragam untuk seluruh baris, hanya berbeda referensi sel kodenya saja (`P1` s.d `L2` berturut-turut).
> Rumus Excel asli: `=IF($B146="alu";(INDEX((Fr);MATCH(Z146;cfr;0)));INDEX((te);MATCH(Z146;cte;0)))`

| Kolom | Field       | Logika Migrasi                                                         |
|-------|-------------|------------------------------------------------------------------------|
| Z     | `P1`        | Kode biner/angka indicator edging sisi Panjang-1 (misal `11`, `9`, `4`, `3`) |
| AA    | `P2`        | Kode angka edging sisi Panjang-2                                       |
| AB    | `L1`        | Kode angka edging sisi Lebar-1                                         |
| AC    | `L2`        | Kode angka edging sisi Lebar-2                                         |
| AD    | `P1 (edg)`  | Nama edging hasil evaluasi kode `P1` berdasarkan kategori (Alu/Kayu)   |
| AE    | `P2 (edg)`  | Nama edging hasil evaluasi kode `P2`                                   |
| AF    | `L1 (edg)`  | Nama edging hasil evaluasi kode `L1`                                   |
| AG    | `L2 (edg)`  | Nama edging hasil evaluasi kode `L2`                                   |
| AX    | `V edg`     | Gabungan digit kode 4 sisi edging (1 digit per sisi) → string 4 digit (misal `"4433"`) |
| AZ    | `Deskripsi edging` | `descEdging[v_edg] ?? ""`                                    |
| BY    | `T_P1`      | `stock.edging.find(e=>e.name===edg_P1_name)?.thickness ?? ""`          |
| BZ    | `T_P2`      | Sama untuk P2                                                          |
| CA    | `T_L1`      | Sama untuk L1                                                          |
| CB    | `T_L2`      | Sama untuk L2                                                          |

```typescript
// Pemetaan Kode ke Nama Edging Resmi (INDEX-MATCH te/cte & Fr/cfr)
function getEdgingNameFromCode(code: string | number, category: string): string {
  if (!code) return '';
  const cleanCode = code.toString().trim();
  const isAlu = category && category.toString().toLowerCase() === 'alu';

  if (isAlu) {
    // Referensi defined name: Fr & cfr (Aluminium)
    const aluMap: Record<string, string> = {
      '1': 'M-FRM Tutup Belakang Black Doff ( Alm. 75225 ) P3',
      '2': 'M-FRM Body Black Doff ( Alm. 75226 ) P3',
      '3': 'M-FRM-07 Black Doff ( Alm. 75355 ) P3',
      '4': 'M-FRM-02 Black Doff ( Alm. 75227 ) P3',
      '5': 'M-FRM-03 Brown Gloss ( Alm. 75229 ) P3',
      '6': 'M-SHF-01/02 Brown Gloss ( Alm. 75109 ) P3',
      '0': '0x2a'
    };
    return aluMap[cleanCode] || '';
  } else {
    // Referensi defined name: te & cte (Kayu/PVC)
    const woodMap: Record<string, string> = {
      '11': 'Edg_Décor_1723_B',                           // Baris 1
      '3':  'Edg_DSS_00206_SM',                            // Baris 2
      '9':  'Melanor',                                     // Baris 3
      '5':  'Edg_EAP_5342_M0',                             // Baris 7
      '22': 'Edg_Decor_1723_B_(55x1)',                     // Baris 8
      '4':  'Edg_DSS_00206_SM_(45X1)',                     // Baris 9
      '1':  'Edg_EAW_5216D1',                              // Baris 12
      '2':  'Edg_EAW_5216_D1(44x1)',                       // Baris 13
      '7':  'Trim 21 S2/S4 Brown Doff ( Alm. 75181 ) P3',  // Baris 14
      '8':  'Trim 22 S2/S4 Brown Doff ( Alm. 75270 ) P3',  // Baris 15
      '6':  'ST-36 Brown Doff ( Alm. 2351 ) P3 P3',        // Baris 16
      '66': 'Edg_Decor_2023_B',                            // Baris 18
      '0':  '0x2a'
    };
    return woodMap[cleanCode] || '';
  }
}

// Kode gabungan edging (Kolom AX)
const v_edg = [
  tabEdging[row.edg_P1_name],
  tabEdging[row.edg_P2_name],
  tabEdging[row.edg_L1_name],
  tabEdging[row.edg_L2_name],
].join("");

// Tebal edging dari stock (Kolom BY–CB)
const T_P1 = stock.edging.find(e => e.name === row.edg_P1_name)?.thickness ?? "";
```

#### Grup 6: Hardware & Fitting (Kolom BD–BJ, BS–BV)

| Kolom | Field        | Logika Kalkulasi                                                     |
|-------|--------------|----------------------------------------------------------------------|
| BD    | `minifix`    | Flag biner dari master DB                                            |
| BE    | `dowel`      | Flag biner dari master DB                                            |
| BF    | `siku`       | Qty siku dari master DB                                              |
| BG    | `screw`      | Qty screw dari master DB                                             |
| BI    | `Engsel`     | `(J <= fp) ? 2 : Math.ceil(J / fp)` lalu × Q                       |
| BS    | `minifix @`  | `(L < 150) ? 2 : Math.ceil(L / fm) * 2` lalu × Q                  |
| BT    | `dowel @`    | `(L < 150) ? 2 : Math.ceil(L / fd) * 2` lalu × Q                  |
| BU    | `jml siku`   | `siku_per_unit × Q`                                                 |
| BV    | `jml screw`  | `screw_per_unit × Q`                                                |

```javascript
// Konstanta dari Data Validation (hardcode atau fetch dari DB)
const fp = 800;  // jarak max engsel (mm)
const fm = 32;   // modul minifix (mm)
const fd = 32;   // modul dowel (mm) — sesuaikan jika berbeda

// Kalkulasi engsel (baris Ref)
const engsel = row.hasHinge
  ? (row.J <= fp ? 2 : Math.ceil(row.J / fp)) * row.qty
  : 0;

// Kalkulasi minifix (baris prt)
const minifix = row.hasMinifix
  ? (row.L < 150 ? 2 : Math.ceil(row.L / fm) * 2) * row.qty
  : 0;

// Kalkulasi dowel
const dowel = row.hasDowel
  ? (row.L < 150 ? 2 : Math.ceil(row.L / fd) * 2) * row.qty
  : 0;
```

#### Grup 7: Dimensi Aktual, M², M³, Harga (Kolom BK–BN, BO, BQ, BW–BX)

| Kolom | Field        | Formula Migrasi                                                      |
|-------|--------------|----------------------------------------------------------------------|
| BK    | `P aktual`   | `(J + tol_p) * qty / 1000` (meter, gross dengan toleransi CNC)     |
| BL    | `L aktual`   | `(L + tol_p) * qty / 1000`                                         |
| BN    | `T aktual`   | `(N + tol_p) * qty / 1000`                                         |
| BO    | `Bahan Dasar`| `${bahan}_${T_bahan}` (misal `"Ply_18"`)                           |
| BP    | `Deskripsi Bahan` | `${bahan} ${T_bahan} ${deskripsiLapisan}`                    |
| BQ    | `Harga/panel`| `((J * L * qty) / (2400 * 1200)) + 0.10` (proporsi + waste 10%)   |
| BW    | `M²`         | `(J * L * qty) / 1_000_000`                                        |
| BX    | `M³`         | `(J * L * N * qty) / 1_000_000_000`                               |

```javascript
const tol_p = 40; // toleransi CNC panjang dari Data Validation

const P_aktual_m = (row.J + tol_p) * row.qty / 1000;
const L_aktual_m = (row.L + tol_p) * row.qty / 1000;

const bahan_dasar = `${row.bahan}_${row.T_bahan}`;
const deskripsi_bahan = `${row.bahan} ${row.T_bahan} ${row.deskripsi_lapisan}`;

const harga_per_panel = ((row.J * row.L * row.qty) / (2400 * 1200)) + 0.10;
const m2 = (row.J * row.L * row.qty) / 1_000_000;
const m3 = (row.J * row.L * row.N * row.qty) / 1_000_000_000;
```

#### Grup 8: Dimensi CNC & Output CSV (Kolom CC–CF)

| Kolom | Field       | Formula Migrasi                                     |
|-------|-------------|-----------------------------------------------------|
| CC    | `P_cnc`     | `J - T_L1 - T_L2` (panjang bersih kayu tanpa edging) |
| CD    | `L_cnc`     | `L - T_P1 - T_P2` (lebar bersih kayu tanpa edging) |
| CE    | `ukuran CNC`| `` `${P_cnc} x ${L_cnc} x ${N}` ``                |
| CF    | `CSV Format`| Gabungan 15 field dipisah `;` — hanya jika `opt === 1` |

```javascript
// Dimensi CNC bersih (setelah edging dikurangi)
const P_cnc = row.J - (row.T_L1 ?? 0) - (row.T_L2 ?? 0);
const L_cnc = row.L - (row.T_P1 ?? 0) - (row.T_P2 ?? 0);
const ukuran_cnc = `${P_cnc} x ${L_cnc} x ${row.N}`;

// CSV Format untuk ekspor ke mesin CNC
function generateCSV(row: BreakdownRow): string {
  if (row.opt !== 1) return " ";
  return [
    row.J,           // Panjang mentah
    row.L,           // Lebar mentah
    row.qty,         // Jumlah produksi
    row.deskripsi_bahan, // Komposisi bahan
    row.N,           // Tebal komposit
    row.komponen,    // Nama komponen
    "-1",            // Flag opsi bahan
    row.edg_L1_name, // Edging L1
    row.T_L1,        // Tebal edging L1
    row.edg_L2_name, // Edging L2
    row.T_L2,        // Tebal edging L2
    row.edg_P1_name, // Edging P1
    row.T_P1,        // Tebal edging P1
    row.edg_P2_name, // Edging P2
    row.T_P2,        // Tebal edging P2
  ].join(";");
}
```

---

### D. Konstanta Global (dari Data Validation)

```javascript
// Wajib didefinisikan sebagai konstanta atau config DB
const CONSTANTS = {
  trim: /* dari Data Validation!D1172 */,    // Toleransi gap celah pintu
  tol_p: 40,                                  // Toleransi CNC Panjang (mm)
  fp: 800,                                    // Jarak max engsel (mm)
  fm: 32,                                     // Modul minifix (mm)
  fd: 32,                                     // Modul dowel (mm)
  nat: /* dari Data Validation */,            // Toleransi nat interior
  Tdm: /* dari Data Validation */,            // Tebal daun meja
  sl_tbl: /* dari Data Validation */,         // Toleransi sisi tabel
};
```

---

## Workflow Migrasi (Step-by-Step)

Gunakan alur ini setiap kali memigrasikan satu bagian formula:

```
STEP 1: IDENTIFIKASI TIPE BARIS
─────────────────────────────────────────────────────────
Input  → Baca nilai kolom C (type: Ref / Set_up / prt)
Output → Tentukan blok logika mana yang relevan

STEP 2: PETAKAN SUMBER DATA
─────────────────────────────────────────────────────────
Untuk setiap kolom dalam baris:
  → Apakah data dari Spek? → Gunakan projectSpec / cabinetSpec
  → Apakah dari Data Validation? → Gunakan componentMaster / lookupTables
  → Apakah dari stock? → Gunakan inventoryDB / edgingStock
  → Apakah kalkulasi internal? → Implementasikan sebagai fungsi JS

STEP 3: KONVERSI FORMULA EXCEL → JAVASCRIPT
─────────────────────────────────────────────────────────
INDEX/MATCH    → Array.find() atau Map lookup
IFERROR        → try/catch atau ?? operator
CONCATENATE    → Template literal `${a} ${b}`
ROUNDUP        → Math.ceil()
ROUNDDOWN      → Math.floor()
IF bersarang   → Ternary atau switch statement
Biner 0/1      → Boolean

STEP 4: HANDLE HIERARKI BARIS
─────────────────────────────────────────────────────────
→ Simpan referensi ke baris Set_up aktif saat iterasi rows
→ Simpan referensi ke baris Ref aktif (kabinet induk)
→ Propagasi qty: prt.qty = prt.sub × setup.qty

STEP 5: KALKULASI BERURUTAN (ORDER OF COMPUTATION)
─────────────────────────────────────────────────────────
1. Lookup identitas (cat, kode, opt, no)
2. Hitung dimensi (J, L, N = T_bahan + T_luar + T_dalam)
3. Lookup bahan & finishing (R, S, T, U, V, W, X, Y)
4. Hitung edging (Z–AC → AD–AG → AW, AX, AY, AZ)
5. Lookup tebal edging dari stock (BY–CB)
6. Hitung hardware (BD–BJ, BS–BV)
7. Hitung dimensi aktual & M², M³ (BK–BN, BW, BX)
8. Hitung dimensi CNC bersih (CC, CD, CE)
9. Generate CSV output (CF)

STEP 6: VALIDASI OUTPUT
─────────────────────────────────────────────────────────
→ Bandingkan M² & M³ dengan sheet Excel asli
→ Validasi CSV Format: pastikan 15 field, separator ";"
→ Cek konsistensi qty: sum(prt.qty) harus match dengan kabinet total
```

---

## Skema Tabel Database (Rekomendasi)

```typescript
// Tabel 1: Spek Proyek (menggantikan sheet Spek)
interface CabinetSpec {
  ref: string;         // Kode kabinet (misal "K01_WC_01")
  no_ref: number;      // Nomor urut
  qty: number;         // Jumlah kabinet
  width: number;       // Lebar (mm)
  height: number;      // Tinggi (mm)
  depth: number;       // Kedalaman (mm)
  ks_set: string;      // Kode klasifikasi
}

// Tabel 2: Master Komponen (menggantikan Data Validation)
interface ComponentMaster {
  part: string;              // Nama komponen (Prt)
  category: string;          // cprt
  ks_code: string;           // KS
  opt: 0 | 1;                // opt
  std_bhn: string;           // std_bhn_prt
  std_T_bahan: number;       // std_Tbahan_prt
  edg_P1: 0 | 1;            // std_edg_P1_prt
  edg_P2: 0 | 1;
  edg_L1: 0 | 1;
  edg_L2: 0 | 1;
  std_fin_luar: string;      // kode finishing luar default
  std_fin_dalam: string;     // kode finishing dalam default
}

// Tabel 3: Stock / Inventory (menggantikan sheet stock)
interface InventoryItem {
  id: string;                // ID barcode
  name: string;              // BARANG
}

interface EdgeStock {
  name: string;              // Edg
  thickness: number;         // tbl_edg (mm)
}

// Tabel 4: Finishing Lookup
interface FinishingType {
  code: string;              // ctf
  name: string;              // tf
  thickness: number;         // tebal_lapisan
  tab_code: number;          // kode 1-digit untuk tabtf
}

// Tabel 5: Deskripsi Gabungan Finishing
interface FinishingDescription {
  v_lap: string;             // kode 2-digit (misal "72")
  description: string;       // "HB_41130+Aica"
}

// Tabel 6: Deskripsi Gabungan Edging
interface EdgeDescription {
  v_edg: string;             // kode 4-digit (misal "4433")
  description: string;       // "Edg_EAW_5216D1_2sisi_pjg"
}

// Tabel 7: Baris Breakdown (computed state)
interface BreakdownRow {
  id: string;
  cat: string;
  type: "Ref" | "Set_up" | "prt";
  kode: string;
  Tpk: string;
  opt: 0 | 1;
  no: number;
  komponen: string;
  proses_khusus?: string;
  J: number;            // Panjang mentah (mm)
  L: number;            // Lebar mentah (mm)
  N: number;            // Tebal komposit (mm)
  sub: number;          // Qty per set
  qty: number;          // Qty total (sub × parent.qty)
  bahan: string;
  T_bahan: number;
  fin_luar: string;
  fin_dalam: string;
  luar: string;
  T_luar: number;
  dalam: string;
  T_dalam: number;
  v_lap: string;
  deskripsi_lapisan: string;
  edg_P1: 0 | 1;
  edg_P2: 0 | 1;
  edg_L1: 0 | 1;
  edg_L2: 0 | 1;
  edg_P1_name: string;
  edg_P2_name: string;
  edg_L1_name: string;
  edg_L2_name: string;
  v_edg: string;
  deskripsi_edging: string;
  T_P1: number;
  T_P2: number;
  T_L1: number;
  T_L2: number;
  engsel: number;
  minifix: number;
  dowel: number;
  jml_siku: number;
  jml_screw: number;
  P_aktual: number;     // meter
  L_aktual: number;     // meter
  bahan_dasar: string;
  deskripsi_bahan: string;
  harga_per_panel: number;
  m2: number;
  m3: number;
  P_cnc: number;
  L_cnc: number;
  ukuran_cnc: string;
  csv_format: string;
}
```

---

## Contoh Implementasi Fungsi Kunci

```typescript
// Kalkulasi satu baris prt secara lengkap
function calculatePrtRow(
  row: Partial<BreakdownRow>,
  parentSetup: BreakdownRow,
  parentRef: BreakdownRow,
  componentMaster: ComponentMaster[],
  finishingTable: FinishingType[],
  finDescTable: FinishingDescription[],
  edgDescTable: EdgeDescription[],
  edgeStock: EdgeStock[],
  inventory: InventoryItem[],
  constants: typeof CONSTANTS
): BreakdownRow {

  const master = componentMaster.find(c => c.part === row.komponen);
  
  // Identitas
  const cat = master?.category ?? "…";
  const bahan = master?.std_bhn ?? "";
  const T_bahan = master?.std_T_bahan ?? 0;

  // Finishing
  const fin_luar_code = master?.std_fin_luar ?? "";
  const finLuarObj = finishingTable.find(f => f.code === fin_luar_code);
  const luar = finLuarObj?.name ?? "";
  const T_luar = finishingTable.find(f => f.name === luar)?.thickness ?? 0;

  const fin_dalam_code = master?.std_fin_dalam ?? "";
  const finDalamObj = finishingTable.find(f => f.code === fin_dalam_code);
  const dalam = finDalamObj?.name ?? "";
  const T_dalam = finishingTable.find(f => f.name === dalam)?.thickness ?? 0;

  const N = T_bahan + T_luar + T_dalam;

  const v_lap = `${finLuarObj?.tab_code ?? ""}${finDalamObj?.tab_code ?? ""}`;
  const deskripsi_lapisan = finDescTable.find(f => f.v_lap === v_lap)?.description ?? "";

  // Edging
  const edg_P1 = master?.edg_P1 ?? 0;
  const edg_P2 = master?.edg_P2 ?? 0;
  const edg_L1 = master?.edg_L1 ?? 0;
  const edg_L2 = master?.edg_L2 ?? 0;

  const getEdgName = (ind: 0|1) => ind === 0 ? "" :
    (cat === "alu"
      ? aluminiumFrameTable.find(f => f.code === ind)?.name ?? ""
      : edgeStock.find(e => e.code === ind)?.name ?? "");

  const edg_P1_name = getEdgName(edg_P1);
  const edg_P2_name = getEdgName(edg_P2);
  const edg_L1_name = getEdgName(edg_L1);
  const edg_L2_name = getEdgName(edg_L2);

  const getEdgCode = (name: string) => edgingTabCode[name] ?? "0";
  const v_edg = [edg_P1_name, edg_P2_name, edg_L1_name, edg_L2_name]
    .map(getEdgCode).join("");
  const deskripsi_edging = edgDescTable.find(e => e.v_edg === v_edg)?.description ?? "";

  const getT = (name: string) => edgeStock.find(e => e.name === name)?.thickness ?? 0;
  const T_P1 = getT(edg_P1_name);
  const T_P2 = getT(edg_P2_name);
  const T_L1 = getT(edg_L1_name);
  const T_L2 = getT(edg_L2_name);

  // Qty
  const sub = row.sub ?? 1;
  const qty = sub * parentSetup.qty;

  // Hardware
  const { fp, fm, fd } = constants;
  const J = row.J ?? 0;
  const L = row.L ?? 0;
  const minifix = master?.hasMinifix
    ? (L < 150 ? 2 : Math.ceil(L / fm) * 2) * qty : 0;
  const dowel = master?.hasDowel
    ? (L < 150 ? 2 : Math.ceil(L / fd) * 2) * qty : 0;

  // Kalkulasi luas & volume
  const m2 = (J * L * qty) / 1_000_000;
  const m3 = (J * L * N * qty) / 1_000_000_000;
  const harga_per_panel = ((J * L * qty) / (2400 * 1200)) + 0.10;

  // CNC dimensions
  const P_cnc = J - T_L1 - T_L2;
  const L_cnc = L - T_P1 - T_P2;
  const ukuran_cnc = `${P_cnc} x ${L_cnc} x ${N}`;

  // Deskripsi bahan
  const bahan_dasar = `${bahan}_${T_bahan}`;
  const deskripsi_bahan = `${bahan} ${T_bahan} ${deskripsi_lapisan}`;

  // CSV
  const opt = master?.opt ?? 0;
  const csv_format = opt === 1
    ? [J, L, qty, deskripsi_bahan, N, row.komponen, "-1",
       edg_L1_name, T_L1, edg_L2_name, T_L2,
       edg_P1_name, T_P1, edg_P2_name, T_P2].join(";")
    : " ";

  return {
    ...row as BreakdownRow,
    cat, bahan, T_bahan, luar, T_luar, dalam, T_dalam, N,
    v_lap, deskripsi_lapisan,
    edg_P1, edg_P2, edg_L1, edg_L2,
    edg_P1_name, edg_P2_name, edg_L1_name, edg_L2_name,
    v_edg, deskripsi_edging,
    T_P1, T_P2, T_L1, T_L2,
    sub, qty, minifix, dowel,
    m2, m3, harga_per_panel,
    P_cnc, L_cnc, ukuran_cnc,
    bahan_dasar, deskripsi_bahan,
    csv_format,
  };
}
```

---

## Batasan & Catatan Penting

1. **Konstanta dari Data Validation** (`trim`, `nat`, `Tdm`, `sl_tbl`, dll.) harus disimpan di config DB, bukan hardcode — supaya bisa diubah tanpa deploy ulang.
2. **Hierarki baris** (`Ref → Set_up → prt`) wajib dipertahankan saat render di UI. Gunakan tree structure atau flat list dengan parent reference.
3. **Tebal edging dari stock** adalah lookup runtime — jangan cache tanpa invalidasi saat stock diupdate.
4. **CSV Format** hanya aktif jika `opt === 1`. Baris lain menghasilkan spasi `" "`.
5. **M²** diakumulasikan ke rekap material per jenis bahan — pastikan ada agregasi per `bahan_dasar`.
6. **Toleransi CNC** (`tol_p = 40mm`) ditambahkan ke ukuran aktual (gross), bukan ke ukuran CNC bersih.
7. **Format Desimal Lokalisasi Indonesia (BG, BH, BI, BJ, BM)**: Seluruh kolom gross meter (`p_gross`, `l_gross`), keliling (`keliling`), area kotor (`luas_gross`), dan rasio triplek (`prop_harga`) dibulatkan ke 1 tempat desimal terdekat (`Math.round(val * 10) / 10`), ditulis menggunakan pemisah koma `,`, dicetak bersih tanpa desimal jika bernilai bulat (misal `"3"`, `"0"`), dan dikosongkan (`""`) pada kolom area dan rasio triplek jika bernilai `0` (non-panel).
8. **Koreksi Swapped CNC Clean Dimensions**: Pengurangan tebal edging harus disesuaikan secara geometris: `P_cnc = P - T_L1 - T_L2` dan `L_cnc = L - T_P1 - T_P2`. Jangan menukar sisi edging yang dikurangkan.
9. **Relasi Dinamis Kategori (tf & te) ke Spek**: Opsi dropdown pada kategori `te` (Type Edge) dan `tf` (Type Finished) terhubung langsung secara dinamis ke isian kolom D (dan E u/ tebal) di sheet `Spek`. Contoh:
   * **`te` (Edging)**: Code `11` = `Spek!D43` (`edgingkab1`), Code `9` = `Spek!D39` (Melanor), Code `1` = `Spek!D49` (`edging1`), Code `22` = `Spek!D45` (`edgingkab2`), dst.
   * **`tf` (Finishing)**: Code `1` = `Spek!D48` (`lapisan1` name/tebal E48), Code `11` = `Spek!D42` (`kabinet1` name/tebal E42), Code `9` = `Spek!D40` (`[Aica]` name/tebal E40), dst.
   Saat memigrasikan atau memproses kalkulasi, andalkan relasi dinamis ini untuk mengambil data spesifikasi material proyek terkini dari isian `Spek`.
10. **Implementasi Sinkronisasi Kategori Dinamis**:
    Telah diimplementasikan fungsi `syncCategoriesWithSpek` di [categorySync.js](file:///Applications/Arenga/vscode/breakdown_app/src/utils/categorySync.js) yang memetakan item-item dalam kategori `tf` (Type Finished), `te` (Type Edge), `lap_luar` (Finishing Luar), `lap_dalam` (Finishing Dalam), dan `edg` (Edging) langsung ke input form `Spek` aktif (menggunakan flat `aliasMap` dari `buildAliasMap`).
    * **Tebal HPL Dinamis**: Dihitung otomatis di runtime via `getFinishingThickness(specVal)` setiap kali nama HPL berubah.
    * **Tebal Edging Dinamis**: Dihitung otomatis di runtime via `getEdgingThickness(specVal, stock)` (mencocokkan nama dengan data stok fisik) setiap kali nama edging berubah.
    * **Integrasi UI & Engine**: Dipanggil menggunakan `useMemo` di [ProjectPage.js](file:///Applications/Arenga/vscode/breakdown_app/src/components/ProjectPage.js) dan diteruskan sebagai prop `spec.categories` ke mesin kalkulasi breakdown (`breakdownCalc.js`) serta prop `categories` ke visual grid table (`SharedModuleTable.js`).
11. **Kustomisasi Lapisan Standard & Lookup Kategori `tf` Dinamis**:
    * Kolom KODE pada section **Lapisan Standard** di form Spek dapat diedit secara manual oleh drafter menggunakan input teks.
    * Ketika kode diubah (misal dari `11` ke `22`), nilai HPL/finishing name dicari secara dinamis dari kategori `tf` menggunakan `lookupCat(syncedCategories, 'tf', newKode)`.
    * Sistem secara otomatis menonaktifkan logika override otomatis bawaan jika input kode kustom terisi (tidak kosong).
    * Halaman `SpekPage` yang terintegrasi di dalam proyek harus selalu disuplai dengan `syncedCategories` (bukannya global `categories`) agar pencarian kode baru dapat disinkronkan langsung dengan data spesifikasi material aktif proyek.
    * **Sinkronisasi Realtime Perubahan Kategori**: Perubahan nama HPL pada Spesifikasi Lapisan (seperti `kabinet2`) yang memiliki kode tertentu (seperti `22`) akan langsung tersinkronisasi dan memperbarui nilai standard layer berkode `22` secara realtime tanpa perlu interaksi manual ulang.

---

## Bug Fixes & Gotchas Kritis (Update Session 2026-06-04)

### 12. `rowsWithParent` — Konteks Baris untuk Formula Sel Referensi

> [!IMPORTANT]
> **Wajib dipahami sebelum memanggil `calcBreakdownItem` atau `evaluateFormula` dari UI.**

Formula berbasis cell reference seperti `=I1`, `=J1`, `=K1` merujuk ke **baris indeks 0** dalam array `rows` yang diteruskan ke `evaluateFormula`. Di `sync.js` dan `ReportPage.js`, array ini adalah **flat breakdown array** — parent berada di index 0, child rows di index 1+. Namun di komponen UI (`SharedModuleTable.js`), prop `items` hanya berisi baris anak (tanpa parent).

**Perbaikan yang diterapkan di [SharedModuleTable.js](file:///Applications/Arenga/vscode/breakdown_app/src/components/SharedModuleTable.js):**
```javascript
// BENAR: selalu sertakan parent di index 0
const rowsWithParent = useMemo(
  () => (parent && Object.keys(parent).length > 0 ? [parent, ...items] : items),
  [parent, items]
);

// Gunakan rowsWithParent untuk SEMUA evaluateFormula dan calcBreakdownItem
calcBreakdownItem(item, rowsWithParent, spec, parent);
evaluateFormula(item[key], rowsWithParent, spec, parent, 0, setupItems);
```

**Prop `rowsWithParent`** juga diteruskan ke `SharedModuleTableRow` agar HPL, edging, dan formula di setiap baris anak mengevaluasi cell reference dengan konteks yang benar.

---

### 13. `isFinishingEmpty` — Semantik Nilai Kosong vs Nol

> [!WARNING]
> Nilai `0` pada field `l_fin` / `d_fin` bukan berarti "tidak ada finishing" — kode `0` berarti **Polos** (valid, ada kategori tf-nya).

```javascript
// BENAR — hanya string kosong dan '-' yang dianggap kosong
export function isFinishingEmpty(code) {
  if (code === undefined || code === null) return true;
  const s = String(code).trim();
  return s === '' || s === '-';
}

// SALAH — jangan cek falsy karena 0 adalah nilai valid
// return !code;  ← JANGAN
```

Jika `isFinishingEmpty` mengembalikan `false`, resolusi lookup harus tetap dilakukan meskipun nilainya `0`.

---

### 14. Dual-Mode Alias `lap_inv_kab` (Kode vs Nama)

> [!IMPORTANT]
> Alias seperti `lap_inv_kab` memiliki dua representasi berbeda tergantung konteks penggunaannya.

**Konteks 1 — Field `l_fin`, `d_fin`, `p1`, `p2`, `l1`, `l2`:**
- Perlu menyimpan **kode tf** (angka seperti `'0'`, `'11'`, `'9'`)
- `buildAliasMap(spec, false)` (mode default) → `lap_inv_kab = '0'`

**Konteks 2 — Kondisi IF seperti `=IF(lap_inv_kab=Polos,9,11)`:**
- Perlu membandingkan dengan **nama** HPL (string `'Polos'`)
- `buildAliasMap(spec, true)` (`_valueAliasMap`) → `lap_inv_kab = 'Polos'`

**Solusi di [resolveAlias.js](file:///Applications/Arenga/vscode/breakdown_app/src/utils/resolveAlias.js):**
```javascript
// Dalam buildAliasMapRaw:
registerAlias('lap_inv_kab', useValueForAliases ? 'Polos' : '0');

// Dalam evaluator kondisi IF — setelah cek langsung & nameToCode gagal,
// coba _valueAliasMap (nama form) sebagai fallback terakhir:
if (!isTrue && specAliases._valueAliasMap) {
  const leftNameVal = (
    specAliases._valueAliasMap[left] ?? ... ?? ''
  ).toString().toLowerCase();
  isTrue = leftNameVal === rightStr;
}
```

Urutan evaluasi kondisi `=IF(var=NilaiNama,...)`:
1. Direct string: `leftStr === rightStr`
2. `_nameToCode`: konversi kedua sisi ke kode, bandingkan kode
3. `_codeToName`: konversi kiri dari kode ke nama, bandingkan nama
4. `_valueAliasMap`: ambil representasi nama dari alias, bandingkan nama ← **fallback baru**

---

### 15. Kolom L, D, P1, P2, L1, L2 — Field Kode Finishing vs Nama

> [!NOTE]
> Field `l_fin`, `d_fin`, `p1`, `p2`, `l1`, `l2` di breakdown menyimpan **kode tf** (numerik string), bukan nama HPL.

| Field | Isi yang Benar | Contoh |
|---|---|---|
| `l_fin` | Kode tf | `'0'`, `'11'`, `'9'` |
| `lap_luar` | Nama HPL | `'Polos'`, `'HB_41130'`, `'[Aica]'` |
| `t_luar` | Tebal (mm) | `0`, `0.5`, `1` |

Ketika `=lap_inv_kab` digunakan di field `l_fin`, ia harus me-resolve ke kode `'0'`, bukan nama `'Polos'`. Inilah mengapa `buildAliasMap` tanpa `useValueForAliases` mengembalikan kode, dan evaluator IF menggunakan `_valueAliasMap` untuk perbandingan nama.

---

### 16. Dukungan Fungsi `ROUNDDOWN` & `ROUNDUP` pada Mesin Kalkulasi Formula

> [!IMPORTANT]
> Sebelumnya, mesin parsing formula JavaScript (`evaluateFormula`) akan menghapus semua huruf (`A-Z`) dan tanda koma (`,`) saat melakukan sanitasi string ekspresi matematika. Hal ini menyebabkan pemanggilan fungsi Excel seperti `=ROUNDDOWN((I1-K2-K3),0)` terpotong menjadi ekspresi ilegal `((I1-K2-K3)0)`, menghasilkan error `#ERR!`.

**Solusi di [calc.js](file:///Applications/Arenga/vscode/breakdown_app/src/utils/calc.js):**
1. Memperbolehkan karakter huruf (`A-Z_`) dan koma (`,`) tetap berada di sanitized string:
   ```javascript
   const sanitized = expression.replace(/[^0-9+\-*/()., A-Z_]/g, '');
   ```
2. Menggunakan compilator `new Function` dengan argumen parameter `ROUNDDOWN` dan `ROUNDUP` untuk menyuntikkan implementasi fungsi matematika tersebut di runtime:
   ```javascript
   const func = new Function('ROUNDDOWN', 'ROUNDUP', `return ${sanitized}`);
   return func(
     (number, num_digits = 0) => {
       const factor = Math.pow(10, num_digits);
       return (number >= 0 ? Math.floor(number * factor) : Math.ceil(number * factor)) / factor;
     },
     (number, num_digits = 0) => {
       const factor = Math.pow(10, num_digits);
       return (number >= 0 ? Math.ceil(number * factor) : Math.floor(number * factor)) / factor;
     }
   );
   ```

---

### 17. Sinkronisasi & Pemulihan Mandiri (Self-Healing) Baris Parent Modul

> [!WARNING]
> Ketika menyimpan data breakdown ke database, fungsi sinkronisasi (`saveProjectBreakdown` di [sync.js](file:///Applications/Arenga/vscode/breakdown_app/src/api/sync.js)) sebelumnya memisahkan baris parent (`isParent: true`) dengan baris anak, namun **hanya** memasukkan baris anak ke tabel `breakdown_rows` via API `/breakdown/bulk`. Hal ini menyebabkan hilangnya baris parent dari database saat proyek dibuka kembali, memicu runtime error `Cannot read properties of null (reading 'modul')` di `ModuleEditor.js`.

**Solusi Sinkronisasi (di [sync.js](file:///Applications/Arenga/vscode/breakdown_app/src/api/sync.js)):**
1. Menggabungkan kembali baris parent ke dalam list baris yang akan dikirim ke database:
   ```javascript
   const rowsToSave = [g.parent, ...g.rows];
   ```
2. Memetakan properti `is_parent` dan `urutan` secara eksplisit agar tersimpan dengan benar di kolom `breakdown_rows` PostgreSQL:
   ```javascript
   is_parent: r.isParent || r.is_parent || false,
   urutan: idx,
   ```

**Solusi Pemulihan Mandiri (Self-Healing) Frontend (di [BreakdownPage.js](file:///Applications/Arenga/vscode/breakdown_app/src/components/BreakdownPage.js)):**
Untuk proyek lama yang telanjur disimpan tanpa baris parent, ditambahkan logika pemulihan mandiri saat inisialisasi visual grid:
```javascript
if (!currentGroup) {
  const synthesizedParent = {
    isParent: true,
    modul: item.modul || 'Custom Modul',
    komp: item.modul || 'Custom Modul',
    sectionType: 'module',
    p: 0, l: 0, t: 0, jml: 1, sub: 1,
    _idx: originalIndex,
    _synthesized: true
  };
  currentGroup = { parent: synthesizedParent, items: [], sectionType: 'module' };
}
```
*Efek*: Grid tidak akan crash lagi saat memuat data proyek lama. Dan ketika pengguna menyimpan ulang proyek tersebut, header baru akan otomatis tertulis secara permanen ke database PostgreSQL.

---

*Skill ini mencakup seluruh 84 kolom (A–CF) dari Breakdown Sheet baris 14–198.*  
*Dibuat berdasarkan analisis dokumen: `breakdown_formula_analysis.md`*  
*Terakhir diupdate: 2026-06-04 (Session fixes: rowsWithParent, isFinishingEmpty, IF alias dual-mode, ROUNDDOWN/ROUNDUP parser support, parent row sync & self-healing)*
