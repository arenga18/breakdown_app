import React, { useState } from 'react';
import { s, Modal, FormGroup, Badge } from './UI';

export default function TemplatePage({ sections, categories, onChange }) {
  const [activeSec, setActiveSec] = useState(sections.length > 0 ? 0 : null);
  const [secModal, setSecModal] = useState(false);
  const [rowModal, setRowModal] = useState(false);
  const [secForm, setSecForm] = useState('');
  const [rowForm, setRowForm] = useState({ label: '', source: '', note: '' });
  const [editRowIdx, setEditRowIdx] = useState(null);

  function saveSection() {
    if (!secForm.trim()) return;
    const next = [...sections, { name: secForm.trim(), rows: [] }];
    onChange(next);
    setActiveSec(next.length - 1);
    setSecModal(false);
  }
  function deleteSection(i) {
    const next = [...sections]; next.splice(i, 1);
    onChange(next);
    setActiveSec(next.length > 0 ? Math.min(i, next.length - 1) : null);
  }
  function openAddRow() { setRowForm({ label: '', source: '', note: '' }); setEditRowIdx(null); setRowModal(true); }
  function openEditRow(ri) { setRowForm({ ...sections[activeSec].rows[ri] }); setEditRowIdx(ri); setRowModal(true); }
  function saveRow() {
    if (!rowForm.label.trim() || activeSec === null) return;
    const next = sections.map((sec, i) => {
      if (i !== activeSec) return sec;
      const rows = [...sec.rows];
      if (editRowIdx !== null) rows[editRowIdx] = { ...rowForm };
      else rows.push({ ...rowForm });
      return { ...sec, rows };
    });
    onChange(next); setRowModal(false);
  }
  function deleteRow(si, ri) {
    const next = sections.map((sec, i) => {
      if (i !== si) return sec;
      const rows = sec.rows.filter((_, j) => j !== ri);
      return { ...sec, rows };
    });
    onChange(next);
  }
  function moveRow(si, ri, dir) {
    const next = sections.map((sec, i) => {
      if (i !== si) return sec;
      const rows = [...sec.rows];
      const to = ri + dir;
      if (to < 0 || to >= rows.length) return sec;
      [rows[ri], rows[to]] = [rows[to], rows[ri]];
      return { ...sec, rows };
    });
    onChange(next);
  }

  const getCat = code => categories.find(c => c.code === code) || null;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <span style={s.pageTitle}>Template Spek</span>
        <span style={{ fontSize:12, color:'#888' }}>Definisikan section & baris, hubungkan ke category</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, alignItems:'start' }}>
        {/* sidebar */}
        <div style={{ border:'0.5px solid #e0e0d8', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'8px 12px', background:'#fafaf7', borderBottom:'0.5px solid #e0e0d8', fontSize:11, fontWeight:500, color:'#888', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>Section</span>
            <button style={s.btnSm} onClick={() => { setSecForm(''); setSecModal(true); }}>+</button>
          </div>
          {sections.length === 0 ? (
            <div style={{ padding:'10px 12px', fontSize:12, color:'#aaa' }}>Belum ada section</div>
          ) : sections.map((sec, i) => (
            <div 
              key={i} 
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('sectionIdx', i);
                e.currentTarget.style.opacity = '0.4';
              }}
              onDragEnd={e => {
                e.currentTarget.style.opacity = '1';
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const fromIdx = parseInt(e.dataTransfer.getData('sectionIdx'));
                if (isNaN(fromIdx)) return;
                const next = [...sections];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(i, 0, moved);
                onChange(next);
                setActiveSec(i);
              }}
              style={{ padding:'7px 12px', borderBottom:'0.5px solid #eeeee8', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'space-between', background: activeSec === i ? '#f0f0ec' : 'transparent', fontWeight: activeSec === i ? 500 : 400 }}
              onClick={() => setActiveSec(i)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                <span style={{ color: '#cbd5e1', cursor: 'grab' }}>⋮⋮</span>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sec.name}</span>
              </div>
              <div style={{ display:'flex', gap:2, marginLeft:4, flexShrink:0 }}>
                <span style={{ fontSize:10, color:'#888', padding:'1px 5px', background:'#f1efe8', borderRadius:5 }}>{sec.rows.length}</span>
                <button style={{ ...s.iconBtn, color:'#b91c1c', fontSize:11 }} onClick={e => { e.stopPropagation(); deleteSection(i); }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* content */}
        {activeSec === null || !sections[activeSec] ? (
          <div style={{ ...s.empty, border:'0.5px solid #e0e0d8', borderRadius:10 }}>Pilih atau buat section</div>
        ) : (
          <div style={{ border:'0.5px solid #e0e0d8', borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:'#fafaf7', borderBottom:'0.5px solid #e0e0d8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:500, fontSize:13 }}>{sections[activeSec].name}</span>
              <button style={s.btnSmPrimary} onClick={openAddRow}>+ Tambah Baris</button>
            </div>
            {sections[activeSec].rows.length === 0 ? (
              <div style={s.empty}>Belum ada baris. Klik "+ Tambah Baris".</div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'180px 1fr 130px auto', background:'#fafaf7', borderBottom:'0.5px solid #d5d5cd' }}>
                  {['Label','Sumber Category','Keterangan',''].map(h => (
                    <div key={h} style={{ padding:'6px 12px', fontSize:11, fontWeight:500, color:'#888', borderRight:'0.5px solid #e0e0d8' }}>{h}</div>
                  ))}
                </div>
                {sections[activeSec].rows.map((row, ri) => {
                  const cat = getCat(row.source);
                  return (
                    <div 
                      key={ri} 
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', ri);
                        e.currentTarget.style.opacity = '0.4';
                      }}
                      onDragEnd={e => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        moveRow(activeSec, fromIdx, ri - fromIdx);
                      }}
                      style={{ display:'grid', gridTemplateColumns:'180px 1fr 130px auto', borderBottom:'0.5px solid #eeeee8', alignItems:'center', cursor: 'grab' }}
                    >
                      <div style={{ padding:'7px 12px', fontSize:13, fontWeight:500, borderRight:'0.5px solid #e0e0d8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#cbd5e1', cursor: 'grab' }}>⋮⋮</span>
                        {row.label}
                      </div>
                      <div style={{ padding:'7px 12px', borderRight:'0.5px solid #e0e0d8' }}>
                        {cat ? (
                          <>
                            <Badge color="blue">{cat.name}</Badge>
                            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{cat.items.length} pilihan</div>
                          </>
                        ) : <Badge color="gray">teks bebas</Badge>}
                      </div>
                      <div style={{ padding:'7px 12px', fontSize:12, color:'#888', fontStyle:'italic', borderRight:'0.5px solid #e0e0d8' }}>{row.note || row.alias}</div>
                      <div style={{ padding:'4px 8px', display:'flex', gap:2 }}>
                        <button style={s.iconBtn} onClick={() => openEditRow(ri)}>✏</button>
                        <button style={{ ...s.iconBtn, color:'#b91c1c' }} onClick={() => deleteRow(activeSec, ri)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      <Modal open={secModal} onClose={() => setSecModal(false)} title="Tambah Section">
        <FormGroup label="Nama Section">
          <input style={s.input} value={secForm} onChange={e => setSecForm(e.target.value)} placeholder="Spesifikasi Produk, Tebal Bahan, Lapisan/Fin..." onKeyDown={e => e.key === 'Enter' && saveSection()} autoFocus />
        </FormGroup>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setSecModal(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={saveSection}>Buat</button>
        </div>
      </Modal>

      <Modal open={rowModal} onClose={() => setRowModal(false)} title={editRowIdx !== null ? 'Edit Baris' : 'Tambah Baris'}>
        <FormGroup label="Label (nama field)">
          <input style={s.input} value={rowForm.label} onChange={e => setRowForm(p => ({ ...p, label: e.target.value }))} placeholder="Bahan Kabinet 1, Lapisan dibalik pintu..." autoFocus />
        </FormGroup>
        <FormGroup label="Sumber data (category)">
          <select style={s.select} value={rowForm.source} onChange={e => setRowForm(p => ({ ...p, source: e.target.value }))}>
            <option value="">-- teks bebas (tanpa category) --</option>
            {categories.map(c => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Keterangan (opsional)">
          <input style={s.input} value={rowForm.note} onChange={e => setRowForm(p => ({ ...p, note: e.target.value }))} placeholder="bahan1, lapisan1, edging1..." />
        </FormGroup>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setRowModal(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={saveRow}>Simpan</button>
        </div>
      </Modal>
    </div>
  );
}
