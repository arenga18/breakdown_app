# Migrasi Data Excel → Database Breakdown

Panduan step-by-step untuk migrasi data dari file Excel `master rekap 2026_Bom.xlsx` ke database PostgreSQL.

---

## 1. Persiapan

### 1.1 File Excel

Pastikan file `master rekap 2026_Bom.xlsx` berada di folder root project:

```
/Applications/Arenga/vscode/breakdown_app/
└── master rekap 2026_Bom.xlsx
```

### 1.2 Koneksi Database

Cek file `.env` di `breakdown-backend/.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=breakdown_db
DB_USER=postgres
DB_PASSWORD=admin123
```

### 1.3 Identifikasi Data di Excel

Buka file Excel, sheet **Breakdown**. Data yang akan dimigrasi terdiri dari:

| Excel Row | Tipe | Keterangan |
|-----------|------|------------|
| 169 | Header | Modul (1 baris) → tabel `moduls` |
| 170-198 | Detail | Template parts (max 25 baris) → tabel `template_parts` |

Kolom yang dimigrasi hanya **P, L, T, Sub, Jml** — sisanya mengikuti default/lookup part.

Baris kosong/separator (182, 187, 191, 195) otomatis dilewati.

---

## 2. Mapping Kolom

### 2.1 Visual Column Letters

Rendering tabel di frontend (`SharedModuleTable.js`) menggunakan visual column letters:

| Field | Visual Letter | Excel Letter |
|-------|--------------|--------------|
| p | I | J |
| l | J | L |
| t | K | N |
| sub | L | P |
| jml | M | Q |

### 2.2 Excel → Visual Mapping (untuk cell references dalam formula)

```
J → I   (p)
L → J   (l)
N → K   (t)
P → L   (sub)
Q → M   (jml)
R → N
S → O   (t_bhn)
T → P
U → Q
Z → R
AA → S  (t_luar)
AB → T  (t_dalam)
AC → U
```

Huruf lain (non-Excel) tetap dipertahankan apa adanya (misal: `W`, `X`, `Y`).

### 2.3 Row Number Adaptation

| Excel Row | Database Row |
|-----------|-------------|
| 169 | 1 (modul) |
| 170 | 2 |
| 171 | 3 |
| n | n - 168 |

### 2.4 Defined Names (tetap dipertahankan)

Referensi ke sheet lain menggunakan defined names **tidak diubah**:

- `T_gola`
- `tol`
- `trim`
- `nat-nat`
- `Tdm`
- `std_sub_prt`
- `Prt`

---

## 3. Menjalankan Migrasi

### 3.1 Migrasi Modul + Template (Row 169-198)

```bash
cd breakdown-backend
node scripts/migrate_excel_template.js
```

Script ini akan:
1. Membaca Excel, sheet Breakdown
2. Row 169 → insert ke tabel `moduls` (dengan `project_id = NULL`)
3. Row 170-198 → insert ke tabel `template_parts`
4. Formula diadaptasi: column letters & row numbers
5. Field `sub` menggunakan evaluated value (bukan formula)
6. Semua operasi dalam 1 transaction (rollback jika gagal)

### 3.2 Verifikasi

Cek via API:

```bash
# List semua modul (termasuk standalone)
curl -s 'http://localhost:3001/api/v1/moduls?limit=5' | python3 -m json.tool

# Cek detail modul beserta template parts
curl -s 'http://localhost:3001/api/v1/moduls/<modul-id>' | python3 -m json.tool
```

Atau via database langsung:

```bash
psql -h localhost -U postgres -d breakdown_db

SELECT id, produk, p, l, t, jml, project_id FROM moduls ORDER BY created_at DESC;

SELECT urutan, type, komp, p, l, t, sub, jml 
FROM template_parts 
WHERE modul_id = '<modul-id>' 
ORDER BY urutan;
```

---

## 4. Troubleshooting

### 4.1 Modul tidak muncul di halaman

Penyebab: route `GET /moduls` menggunakan `INNER JOIN` dengan tabel `projects`, sehingga modul dengan `project_id = NULL` tidak tampil.

**Fix:** Ubah `JOIN` menjadi `LEFT JOIN` di `breakdown-backend/src/routes/moduls.js`:

```javascript
// Sebelum:
FROM moduls m JOIN projects p ON p.id = m.project_id

// Sesudah:
FROM moduls m LEFT JOIN projects p ON p.id = m.project_id
```

### 4.2 Formula tidak dievaluasi dengan benar

Penyebab: `evaluateFormula` di `calc.js` menggunakan `COL_MAP` yang beda dengan visual column letters.

**Fix:** Tambahkan visual letter entries ke `COL_MAP` di `src/utils/colMap.js`:

```javascript
// Contoh tambahan untuk visual letters
O: 't_bhn',
W: 't_luar',  // sudah ada
Y: 't_dalam', // sudah ada
```

### 4.3 Migrasi ulang (delete + re-run)

```bash
# Hapus modul beserta template_parts (CASCADE)
node -e "
require('./src/db').getClient().then(c=>
  c.query(\"DELETE FROM moduls WHERE produk LIKE 'TC Mw%' RETURNING id\")
  .then(r=>{console.log('Deleted:', r.rows.length); c.release()})
)

# Jalankan ulang
node scripts/migrate_excel_template.js
```

### 4.4 Kolom `project_id` NOT NULL

Untuk standalone modul kodifikasi (tanpa project), `project_id` harus diubah jadi nullable:

```sql
ALTER TABLE moduls ALTER COLUMN project_id DROP NOT NULL;
```

---

## 5. Arsitektur Formula

### 5.1 Cell Reference Resolution (evaluateFormula di calc.js)

```
Formula: "=+(O2+W2+Y2)"
                    ↓ lookup COL_MAP
           resolveAlias('t_bhn') + resolveAlias('t_luar') + resolveAlias('t_dalam')
                    ↓ lookup formulaContext
           numeric value + numeric value + numeric value
                    ↓
           result
```

### 5.2 Context Variables (formulaContext.js)

Variable yang tersedia di context:

| Variable | Sumber |
|----------|--------|
| p, l, t, jml, sub | Baris header modul |
| bhn, t_bhn, t_luar, t_dalam | Dari baris per-part |
| T_gola, tol, trim, Tdm, nat-nat, dll | Dari global constants / defined names |

---

## 6. File Terkait

| File | Fungsi |
|------|--------|
| `master rekap 2026_Bom.xlsx` | Sumber data Excel |
| `breakdown-backend/scripts/migrate_excel_template.js` | Script migrasi |
| `breakdown-backend/src/routes/moduls.js` | API routes untuk modul |
| `breakdown-backend/src/db/index.js` | Koneksi database |
| `src/utils/colMap.js` | Column letter mapping |
| `src/utils/calc.js` | Formula evaluator |
| `src/utils/formulaContext.js` | Context builder untuk evaluasi formula |
| `src/components/SharedModuleTable.js` | Rendering tabel dengan visual column letters |
| `src/components/ModuleEditor.js` | Editor modul dengan template parts |
