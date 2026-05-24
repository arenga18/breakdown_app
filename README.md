# Material Management App

Aplikasi manajemen material berbasis React dengan 6 menu:

- **Stock** — Master data kebutuhan material (ID, nama, jumlah, satuan, keterangan)
- **Part** — Master data part (Val, Name, Code, KS, dimensi)
- **Breakdown** — Breakdown komponen (Cat, Type, Kode, dimensi P/L/T)
- **Category** — Master category sebagai sumber data dropdown di Spek
- **Template Spek** — Konfigurasi section + baris, tiap baris dihubungkan ke category
- **Spek** — Form spek proyek, field otomatis dari Template Spek + dropdown dari Category

## Cara Menjalankan

```bash
npm install
npm start
```

Buka http://localhost:3000

## Alur Penggunaan Spek

1. Buat **Category** → tambah item (misal Type Material: Ply, UPVC, dll)
2. Buat **Template Spek** → tambah section (misal "Spesifikasi Produk") → tambah baris (misal "Bahan Kabinet 1") dan pilih sumber category-nya
3. Buka **Spek** → buat spek baru → field otomatis ter-generate dari template, dropdown terisi dari category
