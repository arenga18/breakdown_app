import React, { useState, useMemo } from 'react';
import { s, Modal, FormGroup, FormRow } from './UI';

const C = {
  bg: '#f7f7f5',
  surface: '#ffffff',
  border: '#e8e8e2',
  borderLight: '#f0f0ea',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  accent: '#111827',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  blueBorder: '#dbeafe',
  red: '#b91c1c',
  redBg: '#fef2f2',
  sectionBg: '#f4f4f0',
};

function normalizeItems(items = []) {
  return items.map((item, i) => {
    if (typeof item === 'string') return { code: '', val: i + 1, name: item, tebal: 0.0 };
    return {
      code: item.code ?? '',
      val: item.val ?? i + 1,
      name: item.name ?? '',
      tebal: item.tebal !== undefined ? parseFloat(item.tebal) || 0.0 : 0.0
    };
  });
}

const TF_MAP = {
  '1': 'lapisan1',
  '11': 'kabinet1',
  '2': 'lapisan2',
  '9': 'tip_lap_inv',
  '3': 'lapisan3',
  '22': 'kabinet2',
  '4': 'lapisan4',
  '5': 'lapisan5',
  '6': 'lapisan6',
  '33': 'kabinet3',
  '7': 'lapisan7'
};

const TE_MAP = {
  '11': 'edgingkab1',
  '9': 'edginginv', 
  '1': 'edging1',
  '7': 'trim21',
  '8': 'trim22',
  '6': 'trim38',
  '2': 'edging2',
  '3': 'edging3',
  '4': 'edging4',
  '22': 'edgingkab2',
  '5': 'edging5',
  '33': 'edgingkab3',
  '66': 'edging6'
};

function getSpekRelation(catCode, itemCode) {
  if (!itemCode) return null;
  const strCode = String(itemCode).trim();
  if (catCode === 'tf' || catCode === 'lap_luar' || catCode === 'lap_dalam') {
    return TF_MAP[strCode] ? `${TF_MAP[strCode]} (HPL)` : null;
  }
  if (catCode === 'te' || catCode === 'edg') {
    return TE_MAP[strCode] ? `${TE_MAP[strCode]} (Edg)` : null;
  }
  return null;
}

const FIELD_TYPES = [
  { value: 'select', label: 'Dropdown' },
  { value: 'text', label: 'Teks bebas' },
  { value: 'number', label: 'Angka' },
  { value: 'checkbox', label: 'Checkbox' },
];

// Kategori yang otomatis disinkronkan dari data Stock — tidak boleh diedit manual
const STOCK_DERIVED_CODES = new Set(['lap_luar', 'lap_dalam', 'hpl', 'edg', 'edging']);

function isStockDerived(catCode) {
  return STOCK_DERIVED_CODES.has((catCode || '').toLowerCase());
}

export default function CategoryPage({ data, onChange, stock = [] }) {
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', code: '', fieldtype: 'select' });
  const [editCat, setEditCat] = useState(null); // index cat yang sedang diedit namanya
  const [activeGroup, setActiveGroup] = useState(null); // code group yang diekspand
  // State untuk modal Generate dari Stock
  const [genModal, setGenModal] = useState({ open: false, catIndex: null, kat: '', search: '' });

  // Normalize semua items saat load
  const normalized = useMemo(() =>
    data.map(cat => ({ ...cat, items: normalizeItems(cat.items) }))
    , [data]);

  /* ── helpers ── */
  function update(next) { onChange(next); }

  function saveCat() {
    if (!catForm.name.trim() || !catForm.code.trim()) return;
    const newCat = { ...catForm, items: [] };
    update([...normalized, newCat]);
    setCatModal(false);
    setActiveGroup(catForm.code);
  }

  function deleteCat(ci) {
    update(normalized.filter((_, i) => i !== ci));
    if (activeGroup === normalized[ci].code) setActiveGroup(null);
  }

  function updateCatName(ci, field, val) {
    update(normalized.map((c, i) => i === ci ? { ...c, [field]: val } : c));
  }

  function addItem(ci) {
    const cat = normalized[ci];
    const nextVal = cat.items.length > 0
      ? Math.max(...cat.items.map(x => Number(x.val) || 0)) + 1
      : 1;
    update(normalized.map((c, i) => i === ci
      ? { ...c, items: [...c.items, { code: '', val: nextVal, name: '', tebal: 0.0 }] }
      : c
    ));
  }

  function updateItem(ci, ii, field, val) {
    update(normalized.map((c, i) => i !== ci ? c : {
      ...c,
      items: c.items.map((item, j) => j !== ii ? item : {
        ...item,
        [field]: field === 'val' ? (parseInt(val) || '')
          : field === 'tebal' ? (val === '' ? '' : parseFloat(val) || 0.0)
            : field === 'code' ? val  // code boleh angka atau string, simpan apa adanya
              : val
      })
    }));
  }

  function deleteItem(ci, ii) {
    update(normalized.map((c, i) => i !== ci ? c : {
      ...c, items: c.items.filter((_, j) => j !== ii)
    }));
  }

  function moveItem(ci, ii, dir) {
    update(normalized.map((c, i) => {
      if (i !== ci) return c;
      const items = [...c.items];
      const to = ii + dir;
      if (to < 0 || to >= items.length) return c;
      [items[ii], items[to]] = [items[to], items[ii]];
      return { ...c, items };
    }));
  }

  const typeLabel = FIELD_TYPES.reduce((m, t) => { m[t.value] = t.label; return m; }, {});

  // Daftar nilai kat unik dari stock untuk autocomplete
  const stockKatList = useMemo(() => {
    const seen = new Set();
    stock.forEach(s => { if (s.kat) seen.add(s.kat); });
    return Array.from(seen).sort();
  }, [stock]);

  // Hitung preview jumlah item untuk kat yang dipilih
  const genPreviewCount = useMemo(() => {
    if (!genModal.kat) return 0;
    return stock.filter(s => (s.kat || '').toLowerCase() === genModal.kat.toLowerCase()).length;
  }, [stock, genModal.kat]);

  // Jalankan generate: isi items kategori dari stock berdasarkan kat
  function generateFromStock() {
    const { catIndex, kat } = genModal;
    if (catIndex === null || !kat) return;
    const matched = stock
      .filter(s => (s.kat || '').toLowerCase() === kat.toLowerCase())
      .map((s, idx) => ({
        val: idx + 1,
        name: s.nama || '',
        tebal: parseFloat(s.tebal) || 0,
        code: s.kode || s.id || '',
      }));
    const next = normalized.map((cat, ci) =>
      ci === catIndex ? { ...cat, items: matched } : cat
    );
    onChange(next);
    setGenModal({ open: false, catIndex: null, kat: '', search: '' });
  }

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={s.pageHeader}>
        <span style={s.pageTitle}>Category (Defined Names)</span>
        <button style={s.btnPrimary} onClick={() => { setCatForm({ name: '', code: '', fieldtype: 'select' }); setCatModal(true); }}>
          + Buat Category
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#888', marginBottom: 16, marginTop: -8 }}>
        Setiap category adalah sebuah defined name group. <strong style={{ color: '#1d4ed8' }}>Code</strong> (angka lookup dari breakdown Excel) digunakan sebagai index/match key — bukan Val. Val hanya nomor urut per section.
      </p>

      {normalized.length === 0 ? (
        <div style={{ ...s.empty, border: '0.5px solid #e0e0d8', borderRadius: 10 }}>Belum ada category.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {normalized.map((cat, ci) => {
            const isOpen = activeGroup === cat.code;
            const isThkCat = ['tf', 'lap_luar', 'lap_dalam', 'te', 'edg'].includes(cat.code);
            const synced = isStockDerived(cat.code);
            return (
              <div key={ci} style={{ border: `0.5px solid ${synced ? '#bfdbfe' : '#e0e0d8'}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>

                {/* Header group */}
                <div
                  onClick={() => setActiveGroup(isOpen ? null : cat.code)}
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: synced ? '#eff6ff' : '#fafaf7', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#aaa', marginRight: 2 }}>{isOpen ? '▼' : '▶'}</span>
                    {editCat === ci && !synced ? (
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <input
                          style={{ ...s.input, width: 160, fontSize: 13 }}
                          value={cat.name}
                          onChange={e => updateCatName(ci, 'name', e.target.value)}
                          onBlur={() => setEditCat(null)}
                          autoFocus
                        />
                        <input
                          style={{ ...s.input, width: 80, fontSize: 12, fontFamily: 'monospace' }}
                          value={cat.code}
                          onChange={e => updateCatName(ci, 'code', e.target.value.toLowerCase().replace(/\s/g, '_'))}
                          placeholder="code"
                        />
                      </div>
                    ) : (
                      <div onDoubleClick={e => { if (!synced) { e.stopPropagation(); setEditCat(ci); } }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                        <span style={{ fontSize: 11, color: '#3b82f6', marginLeft: 8, fontFamily: 'monospace' }}>{cat.code}</span>
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>· {typeLabel[cat.fieldtype]}</span>
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>· {cat.items.length} item</span>
                        {synced && (
                          <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.03em' }}>
                            📦 Sinkron dari Stock (Read-only)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Aksi kanan header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!synced && (
                      <button
                        title="Generate isi dari Stock"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', background: '#fff', fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer', transition: 'all 0.15s' }}
                        onClick={e => { e.stopPropagation(); setGenModal({ open: true, catIndex: ci, kat: '', search: '' }); }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#7c3aed'; e.currentTarget.style.background = '#f5f3ff'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = '#fff'; }}
                      >⚡ Generate dari Stock</button>
                    )}
                    {!synced && (
                      <button style={{ ...s.iconBtn, color: '#b91c1c' }} onClick={e => { e.stopPropagation(); deleteCat(ci); }}>✕</button>
                    )}
                  </div>
                </div>

                {/* Tabel items */}
                {isOpen && (
                  <div style={{ padding: '0 0 16px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'inherit' }}>
                      <thead>
                        <tr style={{ background: C.sectionBg, borderBottom: `1.5px solid ${C.border}` }}>
                          <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', width: 60, borderRight: `1px solid ${C.borderLight}` }}>Val</th>
                          <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left', borderRight: `1px solid ${C.borderLight}` }}>Name / Value</th>
                          {isThkCat && (
                            <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', width: 100, borderRight: `1px solid ${C.borderLight}` }}>Tebal (mm)</th>
                          )}
                          <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', width: 90, borderRight: `1px solid ${C.borderLight}` }}>
                            Code
                            <span title="Angka lookup key dari breakdown (index/match). Berbeda dengan Val (nomor urut)." style={{ marginLeft: 4, fontSize: 10, color: C.blue, cursor: 'help' }}>?</span>
                          </th>
                          <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', width: 100 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.length === 0 ? (
                          <tr><td colSpan={isThkCat ? 5 : 4} style={{ padding: '16px', color: C.textFaint, textAlign: 'center', fontSize: 12 }}>{synced ? 'Belum ada item di Stock dengan kategori ini.' : 'Belum ada item. Klik "+ Tambah Item".'}</td></tr>
                        ) : cat.items.map((item, ii) => (
                          <tr key={ii} style={{ borderBottom: `1px solid ${C.borderLight}`, background: ii % 2 === 0 ? C.surface : '#fafaf8', transition: 'background 0.1s' }}>
                            {/* Val — nomor urut */}
                            <td style={{ padding: '4px 6px', textAlign: 'center', borderRight: `1px solid ${C.borderLight}` }}>
                              <input
                                type="number"
                                value={item.val}
                                readOnly={synced}
                                onChange={synced ? undefined : e => updateItem(ci, ii, 'val', e.target.value)}
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  border: 'none',
                                  background: 'transparent',
                                  fontFamily: 'inherit',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: C.textMuted,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  padding: '5px 2px',
                                  cursor: synced ? 'default' : 'text',
                                }}
                                title="Nomor urut (auto)"
                              />
                            </td>
                            {/* Name */}
                            <td style={{ padding: '4px 8px', borderRight: `1px solid ${C.borderLight}` }}>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                 <input
                                   value={item.name}
                                   readOnly={synced}
                                   onChange={synced ? undefined : e => updateItem(ci, ii, 'name', e.target.value)}
                                   style={{
                                     width: '100%',
                                     border: 'none',
                                     background: 'transparent',
                                     fontFamily: 'inherit',
                                     fontSize: 13,
                                     color: synced ? C.textMuted : C.text,
                                     outline: 'none',
                                     boxSizing: 'border-box',
                                     padding: '5px 2px',
                                     cursor: synced ? 'default' : 'text',
                                   }}
                                   placeholder="Nama / value..."
                                 />
                                 {!synced && (() => {
                                   const relation = getSpekRelation(cat.code, item.code);
                                   if (relation) {
                                     return (
                                       <div style={{ fontSize: 10, color: C.blue, fontWeight: 600, padding: '1px 5px', background: C.blueBg, borderRadius: 4, alignSelf: 'flex-start' }}>
                                         🔗 Spek: {relation}
                                       </div>
                                     );
                                   }
                                   return null;
                                 })()}
                               </div>
                            </td>
                            {/* Tebal (mm) */}
                            {isThkCat && (
                              <td style={{ padding: '4px 6px', textAlign: 'center', borderRight: `1px solid ${C.borderLight}` }}>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={item.tebal ?? ''}
                                  readOnly={synced}
                                  onChange={synced ? undefined : e => updateItem(ci, ii, 'tebal', e.target.value)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    border: 'none',
                                    background: 'transparent',
                                    fontFamily: 'inherit',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#16a34a',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    padding: '5px 2px',
                                    cursor: synced ? 'default' : 'text',
                                  }}
                                  placeholder="0.0"
                                  title="Tebal dalam milimeter (mm)"
                                />
                              </td>
                            )}
                            {/* Code */}
                            <td style={{ padding: '4px 6px', textAlign: 'center', borderRight: `1px solid ${C.borderLight}` }}>
                              <input
                                value={item.code ?? ''}
                                readOnly={synced}
                                onChange={synced ? undefined : e => updateItem(ci, ii, 'code', e.target.value)}
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  border: 'none',
                                  background: 'transparent',
                                  fontFamily: 'inherit',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: C.blue,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  padding: '5px 2px',
                                  cursor: synced ? 'default' : 'text',
                                }}
                                title="Code lookup key"
                              />
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              {!synced && (
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                                  <button
                                    title="Naik"
                                    style={{ background: 'none', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: ii === 0 ? 'not-allowed' : 'pointer', color: ii === 0 ? C.textFaint : C.textMuted, fontSize: 13, lineHeight: 1, transition: 'all 0.1s' }}
                                    onClick={() => moveItem(ci, ii, -1)}
                                    disabled={ii === 0}
                                    onMouseEnter={e => { if (ii !== 0) { e.currentTarget.style.background = C.blueBg; e.currentTarget.style.color = C.blue; } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = ii === 0 ? C.textFaint : C.textMuted; }}
                                  >↑</button>
                                  <button
                                    title="Turun"
                                    style={{ background: 'none', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: ii === cat.items.length - 1 ? 'not-allowed' : 'pointer', color: ii === cat.items.length - 1 ? C.textFaint : C.textMuted, fontSize: 13, lineHeight: 1, transition: 'all 0.1s' }}
                                    onClick={() => moveItem(ci, ii, +1)}
                                    disabled={ii === cat.items.length - 1}
                                    onMouseEnter={e => { if (ii !== cat.items.length - 1) { e.currentTarget.style.background = C.blueBg; e.currentTarget.style.color = C.blue; } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = ii === cat.items.length - 1 ? C.textFaint : C.textMuted; }}
                                  >↓</button>
                                  <button
                                    title="Hapus"
                                    style={{ background: 'none', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', color: C.textMuted, fontSize: 13, lineHeight: 1, transition: 'all 0.1s' }}
                                    onClick={() => deleteItem(ci, ii)}
                                    onMouseEnter={e => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.textMuted; }}
                                  >✕</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!synced && (
                      <div style={{ padding: '14px 14px 0' }}>
                        <button
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.textMuted, cursor: 'pointer', transition: 'all 0.15s' }}
                          onClick={() => addItem(ci)}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; e.currentTarget.style.background = C.blueBg; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = '#fff'; }}
                        >+ Tambah Item</button>
                      </div>
                    )}
                    {synced && (
                      <div style={{ padding: '12px 16px', fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderTop: '0.5px solid #dbeafe' }}>
                        ℹ️ Item kategori ini otomatis diisi dari data <strong>Stock</strong> berdasarkan kategori <code style={{ fontSize: 11 }}>{cat.code}</code>. Untuk menambah atau menghapus item, lakukan perubahan di halaman <strong>Stock / Inventory</strong>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal buat category baru */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Buat Category Baru">
        <FormGroup label="Nama Category">
          <input style={s.input} value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="misal: Finishing / HPL" />
        </FormGroup>
        <FormGroup label="Code (alias)">
          <input
            style={{ ...s.input, fontFamily: 'monospace' }}
            value={catForm.code}
            onChange={e => setCatForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
            placeholder="misal: tf, bhn, edg"
          />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Dipakai sebagai lookup key di breakdown. Lowercase, tanpa spasi.</div>
        </FormGroup>
        <FormGroup label="Tipe Field">
          <select style={s.input} value={catForm.fieldtype} onChange={e => setCatForm(p => ({ ...p, fieldtype: e.target.value }))}>
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormGroup>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setCatModal(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={saveCat}>Buat</button>
        </div>
      </Modal>

      {/* Modal Generate dari Stock */}
      <Modal
        open={genModal.open}
        onClose={() => setGenModal({ open: false, catIndex: null, kat: '', search: '' })}
        title="⚡ Generate Isi dari Stock"
      >
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
          Pilih kategori stock (<strong>Kat</strong>) yang akan digunakan untuk mengisi item di category ini.
          Item yang sudah ada akan <strong style={{ color: '#b91c1c' }}>digantikan</strong> sepenuhnya.
        </p>

        {/* Kategori yang tersedia dari stock */}
        <FormGroup label="Pilih Kategori Stock (Kat)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {stockKatList.length === 0 && (
              <span style={{ fontSize: 12, color: '#aaa' }}>Tidak ada data stock.</span>
            )}
            {stockKatList.map(kat => {
              const count = stock.filter(s => (s.kat || '').toLowerCase() === kat.toLowerCase()).length;
              const isActive = genModal.kat.toLowerCase() === kat.toLowerCase();
              return (
                <button
                  key={kat}
                  onClick={() => setGenModal(p => ({ ...p, kat }))}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
                    border: isActive ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb',
                    background: isActive ? '#f5f3ff' : '#fff',
                    color: isActive ? '#7c3aed' : '#374151',
                  }}
                >
                  {kat} <span style={{ fontWeight: 400, color: isActive ? '#a78bfa' : '#9ca3af' }}>({count})</span>
                </button>
              );
            })}
          </div>
          {/* Atau ketik manual */}
          <input
            style={{ ...s.input, fontFamily: 'monospace' }}
            value={genModal.kat}
            onChange={e => setGenModal(p => ({ ...p, kat: e.target.value }))}
            placeholder="Atau ketik nama kat secara manual..."
          />
          {genModal.kat && (
            <div style={{ marginTop: 6, fontSize: 12, color: genPreviewCount > 0 ? '#16a34a' : '#b91c1c', fontWeight: 600 }}>
              {genPreviewCount > 0
                ? `✓ Ditemukan ${genPreviewCount} item dari kat "${genModal.kat}"`
                : `✗ Tidak ada item stock dengan kat "${genModal.kat}"`
              }
            </div>
          )}
        </FormGroup>

        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setGenModal({ open: false, catIndex: null, kat: '', search: '' })}>Batal</button>
          <button
            style={{ ...s.btnPrimary, opacity: genPreviewCount === 0 ? 0.4 : 1, cursor: genPreviewCount === 0 ? 'not-allowed' : 'pointer' }}
            onClick={generateFromStock}
            disabled={genPreviewCount === 0}
          >
            ⚡ Generate {genPreviewCount > 0 ? `(${genPreviewCount} item)` : ''}
          </button>
        </div>
      </Modal>
    </div>
  );
}