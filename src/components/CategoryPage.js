import React, { useState, useMemo } from 'react';
import { s, Modal, FormGroup, FormRow } from './UI';

// Upgrade item: kalau masih string (legacy), convert ke { code, name, val }
// - code: angka lookup key dari breakdown (ex: 11, 0, 9, 22) — diinput manual
// - val:  nomor urut per section (increment otomatis, untuk display)
// - name: label / nama material
function normalizeItems(items = []) {
  return items.map((item, i) => {
    if (typeof item === 'string') return { code: '', val: i + 1, name: item };
    // legacy: hanya punya val & name, belum ada code
    if (item.code === undefined) return { code: '', val: item.val ?? i + 1, name: item.name ?? '' };
    return item;
  });
}

const FIELD_TYPES = [
  { value: 'select', label: 'Dropdown' },
  { value: 'text', label: 'Teks bebas' },
  { value: 'number', label: 'Angka' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function CategoryPage({ data, onChange }) {
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', code: '', fieldtype: 'select' });
  const [editCat, setEditCat] = useState(null); // index cat yang sedang diedit namanya
  const [activeGroup, setActiveGroup] = useState(null); // code group yang diekspand

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
      ? { ...c, items: [...c.items, { code: '', val: nextVal, name: '' }] }
      : c
    ));
  }

  function updateItem(ci, ii, field, val) {
    update(normalized.map((c, i) => i !== ci ? c : {
      ...c,
      items: c.items.map((item, j) => j !== ii ? item : {
        ...item,
        [field]: field === 'val' ? (parseInt(val) || '')
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
            return (
              <div key={ci} style={{ border: '0.5px solid #e0e0d8', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>

                {/* Header group */}
                <div
                  onClick={() => setActiveGroup(isOpen ? null : cat.code)}
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafaf7', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#aaa', marginRight: 2 }}>{isOpen ? '▼' : '▶'}</span>
                    {editCat === ci ? (
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
                      <div onDoubleClick={e => { e.stopPropagation(); setEditCat(ci); }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                        <span style={{ fontSize: 11, color: '#3b82f6', marginLeft: 8, fontFamily: 'monospace' }}>{cat.code}</span>
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>· {typeLabel[cat.fieldtype]}</span>
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>· {cat.items.length} item</span>
                      </div>
                    )}
                  </div>
                  <button style={{ ...s.iconBtn, color: '#b91c1c' }} onClick={e => { e.stopPropagation(); deleteCat(ci); }}>✕</button>
                </div>

                {/* Tabel items */}
                {isOpen && (
                  <div style={{ padding: '0 0 12px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Times New Roman', Times, serif" }}>
                      <thead>
                        <tr style={{ background: '#f5f5f0' }}>
                          <th style={{ ...s.th, width: 48, padding: '7px 8px', textAlign: 'center', borderBottom: '0.5px solid #e8e8e0', fontFamily: "'Times New Roman', Times, serif" }}>Val</th>
                          <th style={{ ...s.th, padding: '7px 12px', textAlign: 'left', borderBottom: '0.5px solid #e8e8e0', fontFamily: "'Times New Roman', Times, serif" }}>Name / Value</th>
                          <th style={{ ...s.th, width: 72, padding: '7px 8px', textAlign: 'center', borderBottom: '0.5px solid #e8e8e0', fontFamily: "'Times New Roman', Times, serif" }}>
                            Code
                            <span title="Angka lookup key dari breakdown (index/match). Berbeda dengan Val (nomor urut)." style={{ marginLeft: 4, fontSize: 10, color: '#3b82f6', cursor: 'help' }}>?</span>
                          </th>
                          <th style={{ ...s.th, width: 90, padding: '7px 8px', textAlign: 'center', borderBottom: '0.5px solid #e8e8e0', fontFamily: "'Times New Roman', Times, serif" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '12px', color: '#aaa', textAlign: 'center', fontSize: 12, fontFamily: "'Times New Roman', Times, serif" }}>Belum ada item. Klik "+ Tambah Item".</td></tr>
                        ) : cat.items.map((item, ii) => (
                          <tr key={ii} style={{ borderBottom: '0.5px solid #f0f0ea', background: ii % 2 === 0 ? '#fff' : '#fafaf7' }}>
                            {/* Val — nomor urut, auto-increment */}
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.val}
                                onChange={e => updateItem(ci, ii, 'val', e.target.value)}
                                style={{ width: 40, textAlign: 'center', border: '0.5px solid #ddd', borderRadius: 4, padding: '2px 4px', fontSize: 13, fontFamily: "'Times New Roman', Times, serif", fontWeight: 600, color: '#888' }}
                                title="Nomor urut (auto)"
                              />
                            </td>
                            {/* Name */}
                            <td style={{ padding: '4px 8px' }}>
                              <input
                                value={item.name}
                                onChange={e => updateItem(ci, ii, 'name', e.target.value)}
                                style={{ width: '100%', border: '0.5px solid #ddd', borderRadius: 4, padding: '3px 8px', fontSize: 13, fontFamily: "'Times New Roman', Times, serif", boxSizing: 'border-box' }}
                                placeholder="Nama / value..."
                              />
                            </td>
                            {/* Code — angka lookup key dari breakdown */}
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <input
                                value={item.code ?? ''}
                                onChange={e => updateItem(ci, ii, 'code', e.target.value)}
                                style={{ width: 58, textAlign: 'center', border: '0.5px solid #93c5fd', borderRadius: 4, padding: '2px 4px', fontSize: 13, fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, color: '#1d4ed8', background: '#eff6ff' }}
                                title="Code lookup key — angka dari breakdown Excel (index/match)"
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                                <button style={s.iconBtn} onClick={() => moveItem(ci, ii, -1)} disabled={ii === 0} title="Naik">↑</button>
                                <button style={s.iconBtn} onClick={() => moveItem(ci, ii, +1)} disabled={ii === cat.items.length - 1} title="Turun">↓</button>
                                <button style={{ ...s.iconBtn, color: '#b91c1c' }} onClick={() => deleteItem(ci, ii)}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: '8px 14px 0' }}>
                      <button
                        style={{ ...s.btn, fontSize: 12, padding: '5px 12px' }}
                        onClick={() => addItem(ci)}
                      >+ Tambah Item</button>
                    </div>
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
    </div>
  );
}