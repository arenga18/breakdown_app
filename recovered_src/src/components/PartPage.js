import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { buildAliasMap, resolveAlias, resolvePartRow } from '../utils/resolveAlias';
import { s, Modal, FormGroup, FormRow } from './UI';

"const COLUMNS = [\n  { key: 'val', label: 'Val', width: 60, type: 'text' },\n  { key: 'name', label: 'Name', width: 250, type: 'text', bold: true },\n  { key: 'code', label: 'Category', width: 100, type: 'text' },\n  { key: 'ks', label: 'KS', width: 60, type: 'text' },\n  { key: 'opt', label: 'Opt', width: 50, type: 'text' },\n  { key: 'jml', label: 'Jml Sub', width: 60, type: 'text' },\n  { key: 'bhn', label: 'Bhn', width: 80, type: 'text' },\n  { key: 't', label: 'T', width: 50, type: 'text' },\n  \n  // Hardware\n  { key: 'minifix', label: 'Minifix', width: 120, type: 'text' },\n  { key: 'dowel', label: 'Dowel', width: 120, type: 'text' },\n  \n  // Siku & Screw\n  { key: 'tipe_siku', label: 'Tipe Siku', width: 150, type: 'text' },\n  { key: 'q_siku', label: '@Siku', width: 70, type: 'text' },\n  { key: 'tipe_screw', label: 'Tipe Screw', width: 150, type: 'text' },\n  { key: 'q_screw', label: '@Screw', width: 70, type: 'text' },\n  \n  // Profiling\n  { key: 'v', label: 'V', width: 60, type: 'text' },\n  { key: 'v2', label: 'V2', width: 60, type: 'text' },\n  { key: 'h', label: 'H', width: 60, type: 'text' },\n  { key: 'profil3', label: 'Profil 3', width: 120, type: 'text' },\n  { key: 'profil2', label: 'Profil 2', width: 120, type: 'text' },\n  { key: 'profil', label: 'Profil', width: 120, type: 'text' },\n  \n  // Dimensions / Face & Edging\n  { key: 'l', label: 'Face L', width: 60, type: 'text' },\n  { key: 'd', label: 'Face D', width: 60, type: 'text' },\n  { key: 'p1', label: 'Edge P1', width: 60, type: 'text' },\n  { key: 'p2', label: 'Edge P2', width: 60, type: 'text' },\n  { key: 'l1', label: 'Edge L1', width: 60, type: 'text' },\n  { key: 'l2', label: 'Edge L2', width: 60, type: 'text' },\n  \n  // Fitting / Accessory\n  { key: 'rel', label: 'Rel', width: 120, type: 'text' },\n  { key: 'engsel', label: 'Engsel', width: 180, type: 'text' },\n  \n  // Anodize\n  { key: 'anodize', label: 'Anodize', width: 120, type: 'text' },\n  { key: 'q_anodize', label: '@Ano', width: 90, type: 'text' },\n  \n  // Ext
<truncated 546 bytes>

// Single editable cell — only mounts input when active
function Cell({ value, displayValue, type, bold, width, isEditing, onStartEdit, onCommit }) {
  const inputRef = useRef(null);
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={local}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1.5px solid #3b82f6', borderRadius: 3,
          background: '#fff', outline: 'none',
          fontSize: 12, padding: '1px 4px',
          fontWeight: bold ? 600 : 400,
        }}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onCommit(local)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onCommit(local); }
          if (e.key === 'Escape') { setLocal(value); onCommit(value); }
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={onStartEdit}
      style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontSize: 12, fontWeight: bold ? 600 : 400,
        height: ROW_HEIGHT, lineHeight: ROW_HEIGHT + 'px',
        cursor: 'default', userSelect: 'none',
      }}
      title={displayValue !== value ? String(value ?? '') + ' → ' + String(displayValue ?? '') : String(value ?? '')}
    >
      {displayValue ?? value ?? ''}
    </div>
  );
}

// Memoized row — only re-renders when its data or editing state changes
const PartRow = React.memo(function PartRow({ item, resolvedItem, rowIdx, dataIdx, editCell, onStartEdit, onCommit, onDelete, colWidths }) {
  return (
    <tr style={{ borderBottom: '0.5px solid #eee', background: rowIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
      {COLUMNS.map(col => (
        <td
          key={col.key}
          style={{ padding: '0 8px', width: colWidths[col.key], minWidth: colWidths[col.key], maxWidth: colWidths[col.key], overflow: 'hidden' }}
        >
          <Cell
            value={item[col.key]}
            displayValue={resolvedItem ? resolvedItem[col.key] : item[col.key]}
            type={col.type}
            bold={col.bold}
            width={colWidths[col.key]}
            isEditing={editCell?.row === dataIdx && editCell?.col === col.key}
            onStartEdit={() => onStartEdit(dataIdx, col.key)}
            onCommit={(val) => onCommit(dataIdx, col.key, val)}
          />
        </td>
      ))}
      <td style={{ padding: '0 4px', textAlign: 'center', width: 40, minWidth: 40 }}>
        <button
          onClick={() => onDelete(dataIdx)}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
        >×</button>
      </td>
    </tr>
  );
});

// Virtual scroll container
function VirtualTable({ rows, editCell, onStartEdit, onCommit, onDelete, colWidths, rv }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeight = rows.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = Math.min(rows.length, startIdx + visibleCount);

  const visibleRows = rows.slice(startIdx, endIdx);
  const paddingTop = startIdx * ROW_HEIGHT;
  const paddingBottom = (rows.length - endIdx) * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, maxHeight: 'calc(100vh - 200px)' }}
    >
      <table style={{ borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed', minWidth: COLUMNS.reduce((a, c) => a + c.width, 0) + 40 }}>
        <colgroup>
          {COLUMNS.map(col => <col key={col.key} style={{ width: colWidths[col.key] }} />)}
          <col style={{ width: 40 }} />
        </colgroup>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9f9f7' }}>
          <tr>
            {COLUMNS.map(col => (
              <th key={col.key} style={{ ...s.th, padding: '10px 8px', fontWeight: 600, borderBottom: '0.5px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', width: colWidths[col.key] }}>
                {col.label}
              </th>
            ))}
            <th style={{ ...s.th, width: 40, padding: '10px 4px', borderBottom: '0.5px solid #ddd' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && <tr><td colSpan={COLUMNS.length + 1} style={{ height: paddingTop, padding: 0 }} /></tr>}
          {visibleRows.map((item, i) => {
            const dataIdx = rows.indexOf(item); // preserve original index for mutations
            // Buat resolvedItem: nilai =varname di-resolve untuk display
            const resolvedItem = rv ? Object.fromEntries(
              Object.entries(item).map(([k, v]) => [k, rv(v)])
            ) : item;
            return (
              <PartRow
                key={item.__id ?? dataIdx}
                item={item}
                resolvedItem={resolvedItem}
                rowIdx={startIdx + i}
                dataIdx={dataIdx}
                editCell={editCell}
                onStartEdit={onStartEdit}
                onCommit={onCommit}
                onDelete={onDelete}
                colWidths={colWidths}
              />
            );
          })}
          {paddingBottom > 0 && <tr><td colSpan={COLUMNS.length + 1} style={{ height: paddingBottom, padding: 0 }} /></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function PartPage({ data, onChange, spec = {}, readOnly = false }) {
  const aliasMap = useMemo(() => buildAliasMap(spec), [spec]);
  const rv = useCallback((val) => {
    return resolveAlias(val, aliasMap);
  }, [aliasMap]);
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editCell, setEditCell] = useState(null); // { row: dataIdx, col: key }

  const filtered = useMemo(() => {
    if (!filter) return data;
    const q = filter.toLowerCase();
    return data.filter(p => (p.name || '').toLowerCase().includes(q));
  }, [data, filter]);

  const numericFields = useMemo(() => new Set(
    COLUMNS.filter(c => c.type === 'number').map(c => c.key)
  ), []);

  const handleCommit = useCallback((dataIdx, key, val) => {
    const next = [...data];
    next[dataIdx] = { ...next[dataIdx], [key]: numericFields.has(key) ? (parseFloat(val) || 0) : val };
    onChange(next);
    setEditCell(null);
  }, [data, onChange, numericFields]);

  const handleDelete = useCallback((dataIdx) => {
    onChange(data.filter((_, i) => i !== dataIdx));
  }, [data, onChange]);

  const handleStartEdit = useCallback((dataIdx, col) => {
    setEditCell({ row: dataIdx, col });
  }, []);

  function save() {
    if (!form.name) return;
    const num = v => { const p = parseFloat(v); return isNaN(p) ? 0 : p; };
    const obj = {
      ...form,
      val: num(form.val), jml_sub: num(form.jml_sub), t: num(form.t),
      l: num(form.l), d: num(form.d), p1: num(form.p1), p2: num(form.p2),
      l1: num(form.l1), l2: num(form.l2), q_siku: num(form.q_siku),
      q_screw: num(form.q_screw), q_anodize: num(form.q_anodize),
      p_val: num(form.p_val), l_val: num(form.l_val),
    };
    onChange([...data, obj]);
    setModal(false);
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const colWidths = useMemo(() => Object.fromEntries(COLUMNS.map(c => [c.key, c.width])), []);

  return (
    <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>Data Part (Master)</h2>
        <button
          onClick={() => { setForm(empty); setModal(true); }}
          style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
        >+ Tambah Part</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input style={s.searchInput} placeholder="Cari part..." value={filter} onChange={e => setFilter(e.target.value)} />
        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filtered.length} / {data.length} part</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #ddd', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Belum ada data</div>
        ) : (
          <VirtualTable
            rows={filtered}
            editCell={editCell}
            onStartEdit={handleStartEdit}
            onCommit={handleCommit}
            onDelete={handleDelete}
            colWidths={colWidths}
            rv={rv}
            aliasMap={aliasMap}
          />
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Tambah Part">
        <FormRow>
          <FormGroup label="Val"><input style={s.input} type="number" value={form.val} onChange={f('val')} /></FormGroup>
          <FormGroup label="Category (Code)"><input style={s.input} value={form.code} onChange={f('code')} /></FormGroup>
        </FormRow>
        <FormGroup label="Nama Part (Komponen)"><input style={s.input} value={form.name} onChange={f('name')} /></FormGroup>
        <FormRow>
          <FormGroup label="KS (Kode Spek)"><input style={s.input} value={form.ks} onChange={f('ks')} /></FormGroup>
          <FormGroup label="Jml Sub"><input style={s.input} type="number" value={form.jml_sub} onChange={f('jml_sub')} /></FormGroup>
        </FormRow>
        <div style={{ padding: '8px 0', borderTop: '1px solid #eee', marginTop: 10, fontWeight: 600, fontSize: 13, color: '#3b82f6' }}>1. Hardware & Fitting</div>
        <FormRow>
          <FormGroup label="Tipe Siku"><input style={s.input} value={form.tipe_siku} onChange={f('tipe_siku')} /></FormGroup>
          <FormGroup label="@ Jumlah Siku"><input style={s.input} type="number" value={form.q_siku} onChange={f('q_siku')} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Tipe Screw"><input style={s.input} value={form.tipe_screw} onChange={f('tipe_screw')} /></FormGroup>
          <FormGroup label="@ Jumlah Screw"><input style={s.input} type="number" value={form.q_screw} onChange={f('q_screw')} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Rel"><input style={s.input} value={form.rel} onChange={f('rel')} /></FormGroup>
          <FormGroup label="Engsel"><input style={s.input} value={form.engsel} onChange={f('engsel')} /></FormGroup>
        </FormRow>
        <div style={{ padding: '8px 0', borderTop: '1px solid #eee', marginTop: 10, fontWeight: 600, fontSize: 13, color: '#10b981' }}>2. Finishing & Edging</div>
        <FormRow>
          <FormGroup label="L (Face 1)"><input style={s.input} type="number" value={form.l} onChange={f('l')} /></FormGroup>
          <FormGroup label="D (Face 2)"><input style={s.input} type="number" value={form.d} onChange={f('d')} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="P1 (Edge)"><input style={s.input} type="number" value={form.p1} onChange={f('p1')} /></FormGroup>
          <FormGroup label="P2 (Edge)"><input style={s.input} type="number" value={form.p2} onChange={f('p2')} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="L1 (Edge)"><input style={s.input} type="number" value={form.l1} onChange={f('l1')} /></FormGroup>
          <FormGroup label="L2 (Edge)"><input style={s.input} type="number" value={form.l2} onChange={f('l2')} /></FormGroup>
        </FormRow>
        <div style={{ padding: '8px 0', borderTop: '1px solid #eee', marginTop: 10, fontWeight: 600, fontSize: 13, color: '#f59e0b' }}>3. Dimensi & Lainnya</div>
        <FormRow>
          <FormGroup label="P Val"><input style={s.input} type="number" value={form.p_val} onChange={f('p_val')} /></FormGroup>
          <FormGroup label="L Val"><input style={s.input} type="number" value={form.l_val} onChange={f('l_val')} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Anodize"><input style={s.input} value={form.anodize} onChange={f('anodize')} /></FormGroup>
          <FormGroup label="@ Jml Anodize"><input style={s.input} type="number" value={form.q_anodize} onChange={f('q_anodize')} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Bhn"><input style={s.input} value={form.bhn} onChange={f('bhn')} /></FormGroup>
          <FormGroup label="T (Tebal)"><input style={s.input} type="number" value={form.t} onChange={f('t')} /></FormGroup>
        </FormRow>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setModal(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={save}>Simpan</button>
        </div>
      </Modal>
    </div>
  );
}