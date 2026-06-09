import React, { useState } from 'react';
import { s, Modal, FormGroup, Badge } from './UI';

// ─── Design tokens (same as SpekPage) ────────────────────────────────────────
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
  activeBg: '#eeeef8',
  activeBorder: '#c7d2fe',
};

const inp = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  background: '#fafaf8',
  fontFamily: 'inherit',
  fontSize: 13,
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const sel = { ...inp };

export default function TemplatePage({ sections, categories, onChange }) {
  const [activeSec, setActiveSec] = useState(sections.length > 0 ? 0 : null);
  const [secModal, setSecModal] = useState(false);
  const [rowModal, setRowModal] = useState(false);
  const [secForm, setSecForm] = useState('');
  const [rowForm, setRowForm] = useState({ label: '', source: '', note: '' });
  const [editRowIdx, setEditRowIdx] = useState(null);
  const [dragOverSec, setDragOverSec] = useState(null);
  const [dragOverRow, setDragOverRow] = useState(null);

  // ─── Section CRUD ─────────────────────────────────────────────────────────
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

  // ─── Row CRUD ─────────────────────────────────────────────────────────────
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
    onChange(sections.map((sec, i) => {
      if (i !== si) return sec;
      return { ...sec, rows: sec.rows.filter((_, j) => j !== ri) };
    }));
  }

  // ─── Drag & Drop rows ─────────────────────────────────────────────────────
  function moveRow(si, from, to) {
    if (from === to) return;
    onChange(sections.map((sec, i) => {
      if (i !== si) return sec;
      const rows = [...sec.rows];
      const [item] = rows.splice(from, 1);
      rows.splice(to, 0, item);
      return { ...sec, rows };
    }));
  }

  // ─── Drag & Drop sections ─────────────────────────────────────────────────
  function moveSec(from, to) {
    if (from === to) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setActiveSec(to);
  }

  const getCat = code => categories.find(c => c.code === code) || null;
  const currentSec = activeSec !== null ? sections[activeSec] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Template Spek</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Definisikan section &amp; baris, hubungkan ke category</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.textMuted, cursor: 'pointer' }}
            onClick={() => { setSecForm(''); setSecModal(true); }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Tambah Section
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div style={{ background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px 6px', fontSize: 10, fontWeight: 700, color: C.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Section ({sections.length})
          </div>

          {sections.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Belum ada section.<br />Klik <strong>+ Tambah Section</strong> di atas.</div>
            </div>
          ) : sections.map((sec, i) => (
            <div
              key={i}
              draggable
              onDragStart={e => { e.dataTransfer.setData('secIdx', i); e.currentTarget.style.opacity = '0.4'; }}
              onDragEnd={e => { e.currentTarget.style.opacity = '1'; setDragOverSec(null); }}
              onDragOver={e => { e.preventDefault(); setDragOverSec(i); }}
              onDrop={e => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('secIdx'));
                if (!isNaN(from)) moveSec(from, i);
                setDragOverSec(null);
              }}
              onClick={() => setActiveSec(i)}
              style={{
                padding: '9px 14px',
                borderBottom: `1px solid ${C.borderLight}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                background: activeSec === i ? C.activeBg : dragOverSec === i ? '#f0f7ff' : 'transparent',
                borderLeft: activeSec === i ? `3px solid ${C.blue}` : '3px solid transparent',
                transition: 'all 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, overflow: 'hidden' }}>
                <span style={{ color: '#d1d5db', fontSize: 13, cursor: 'grab', flexShrink: 0 }}>⠿</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: activeSec === i ? 600 : 400,
                  color: activeSec === i ? C.blue : C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>{sec.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px',
                  background: activeSec === i ? C.blueBg : '#f1f0ea',
                  color: activeSec === i ? C.blue : C.textMuted,
                  borderRadius: 10,
                }}>
                  {sec.rows.length}
                </span>
                <button
                  style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', color: C.textFaint, fontSize: 12, borderRadius: 4, lineHeight: 1 }}
                  title="Hapus section"
                  onClick={e => { e.stopPropagation(); deleteSection(i); }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.redBg; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textFaint; e.currentTarget.style.background = 'none'; }}
                >✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main panel ───────────────────────────────────────────────────── */}
        {!currentSec ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textMuted, gap: 10 }}>
            <div style={{ fontSize: 40 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Pilih section dari kiri</div>
            <div style={{ fontSize: 12, color: C.textFaint }}>atau tambah section baru</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{ padding: '12px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{currentSec.name}</div>
                <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1 }}>{currentSec.rows.length} baris terdaftar</div>
              </div>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onClick={openAddRow}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Tambah Baris
              </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {currentSec.rows.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: C.textMuted }}>
                  <div style={{ fontSize: 36 }}>📝</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Belum ada baris</div>
                  <div style={{ fontSize: 12, color: C.textFaint }}>Klik <strong>+ Tambah Baris</strong> untuk mulai</div>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 200px 160px 72px', background: C.sectionBg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 1 }}>
                    {['', 'Label', 'Sumber Category', 'Keterangan / Alias', ''].map((h, i) => (
                      <div key={i} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.textFaint, letterSpacing: '0.06em', textTransform: 'uppercase', borderRight: i < 4 ? `1px solid ${C.borderLight}` : 'none' }}>{h}</div>
                    ))}
                  </div>

                  {/* Rows */}
                  {currentSec.rows.map((row, ri) => {
                    const cat = getCat(row.source);
                    return (
                      <div
                        key={ri}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData('rowIdx', ri); e.currentTarget.style.opacity = '0.4'; }}
                        onDragEnd={e => { e.currentTarget.style.opacity = '1'; setDragOverRow(null); }}
                        onDragOver={e => { e.preventDefault(); setDragOverRow(ri); }}
                        onDrop={e => {
                          e.preventDefault();
                          const from = parseInt(e.dataTransfer.getData('rowIdx'));
                          if (!isNaN(from)) moveRow(activeSec, from, ri);
                          setDragOverRow(null);
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr 200px 160px 72px',
                          borderBottom: `1px solid ${C.borderLight}`,
                          background: dragOverRow === ri ? '#f0f7ff' : ri % 2 === 0 ? C.surface : '#fafaf8',
                          transition: 'background 0.1s',
                          alignItems: 'center',
                        }}
                      >
                        {/* Drag handle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: 14, cursor: 'grab', padding: '0 4px' }} title="Drag untuk urutkan">⠿</div>

                        {/* Label */}
                        <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: C.text, borderRight: `1px solid ${C.borderLight}` }}>
                          {row.label}
                        </div>

                        {/* Category source */}
                        <div style={{ padding: '10px 12px', borderRight: `1px solid ${C.borderLight}` }}>
                          {cat ? (
                            <div>
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 600 }}>{cat.name}</span>
                              <div style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>{cat.items?.length || 0} pilihan</div>
                            </div>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: '#f3f4f6', color: C.textMuted, fontSize: 12, fontWeight: 500 }}>teks bebas</span>
                          )}
                        </div>

                        {/* Note / alias */}
                        <div style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted, fontStyle: row.note || row.alias ? 'italic' : 'normal', borderRight: `1px solid ${C.borderLight}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.note || row.alias || <span style={{ color: C.textFaint }}>—</span>}
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '6px 8px', display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            title="Edit baris"
                            style={{ background: 'none', border: 'none', padding: '4px 6px', borderRadius: 6, cursor: 'pointer', color: C.textMuted, fontSize: 13, lineHeight: 1 }}
                            onClick={() => openEditRow(ri)}
                            onMouseEnter={e => { e.currentTarget.style.background = C.blueBg; e.currentTarget.style.color = C.blue; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.textMuted; }}
                          >✏</button>
                          <button
                            title="Hapus baris"
                            style={{ background: 'none', border: 'none', padding: '4px 6px', borderRadius: 6, cursor: 'pointer', color: C.textMuted, fontSize: 13, lineHeight: 1 }}
                            onClick={() => deleteRow(activeSec, ri)}
                            onMouseEnter={e => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.textMuted; }}
                          >✕</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Tambah Section ─────────────────────────────────────────── */}
      <Modal open={secModal} onClose={() => setSecModal(false)} title="Tambah Section Baru">
        <div style={{ marginBottom: 6 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Nama Section</label>
          <input
            style={inp}
            value={secForm}
            onChange={e => setSecForm(e.target.value)}
            placeholder="mis. Spesifikasi Produk, Lapisan/Fin..."
            onKeyDown={e => e.key === 'Enter' && saveSection()}
            autoFocus
            onFocus={e => (e.target.style.borderColor = C.blue)}
            onBlur={e => (e.target.style.borderColor = C.border)}
          />
        </div>
        <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4, marginBottom: 16 }}>
          Section mengelompokkan baris-baris spesifikasi yang sejenis.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={{ ...s.btn }} onClick={() => setSecModal(false)}>Batal</button>
          <button style={{ ...s.btnPrimary }} onClick={saveSection}>Buat Section</button>
        </div>
      </Modal>

      {/* ── Modal: Tambah / Edit Baris ───────────────────────────────────── */}
      <Modal open={rowModal} onClose={() => setRowModal(false)} title={editRowIdx !== null ? 'Edit Baris' : 'Tambah Baris Baru'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Label <span style={{ color: C.red }}>*</span></label>
            <input
              style={inp}
              value={rowForm.label}
              onChange={e => setRowForm(p => ({ ...p, label: e.target.value }))}
              placeholder="mis. Bahan Kabinet 1, Lapisan dibalik pintu..."
              autoFocus
              onFocus={e => (e.target.style.borderColor = C.blue)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>Nama field yang akan tampil di form spek.</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Sumber Data (Category)</label>
            <select
              style={sel}
              value={rowForm.source}
              onChange={e => setRowForm(p => ({ ...p, source: e.target.value }))}
              onFocus={e => (e.target.style.borderColor = C.blue)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            >
              <option value="">— teks bebas (tanpa category) —</option>
              {categories.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>
              Jika dipilih, nilai field akan dibatasi pilihan dari category tersebut.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Alias Variabel <span style={{ fontSize: 11, fontWeight: 400, color: C.textFaint }}>(opsional)</span></label>
            <input
              style={inp}
              value={rowForm.note}
              onChange={e => setRowForm(p => ({ ...p, note: e.target.value }))}
              placeholder="mis. bahan1, lapisan1, edging1..."
              onFocus={e => (e.target.style.borderColor = C.blue)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>Digunakan sebagai nama variabel dalam rumus formula (=bahan1).</div>
          </div>

        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderLight}` }}>
          <button style={{ ...s.btn }} onClick={() => setRowModal(false)}>Batal</button>
          <button style={{ ...s.btnPrimary }} onClick={saveRow}>{editRowIdx !== null ? 'Simpan Perubahan' : 'Tambah Baris'}</button>
        </div>
      </Modal>
    </div>
  );
}
