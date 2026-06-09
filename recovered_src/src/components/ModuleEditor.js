import React, { useState } from 'react';
import { Modal } from './UI';
import SharedModuleTable, { SearchableCell } from './SharedModuleTable';
import { shiftTemplateFormulas } from '../utils/calc';
import { getEdgingNameFromCode, resolveEdgingFromCode, getHplNameFromCode } from '../utils/breakdownCalc';


const emptyRow = {
  cat: '', type: '', kode: 'KS', no: '', komp: '',
  p: '', l: '', t: '18', sub: 1, jml: 1, bhn: 'Ply', proses: '',
  l_fin: '', d_fin: '', p1: '', p2: '', l1: '', l2: '',
  // Fase 1 — Spesifikasi Material & Lapisan
  t_bhn: 18, jml_muka: 1,
  lap_luar: '', lap_dalam: '',
  edg_p1: '', edg_p2: '', edg_l1: '', edg_l2: '',
  q_engsel: 0, q_rel: 0, q_dormec: 0, q_minifix: 0, q_dowel: 0,
  isParent: false
};

function ModuleEditor({
  header,
  items,
  parts = [],
  setupItems = [],
  moduls = [],
  subModuls = [],
  hplOptions = [],
  edgOptions = [],
  bhnOptions = [],
  onChange,
  onCellClick,
  mode = 'breakdown',
  badgeText = 'MODULE',
  badgeColor = '#2563eb',
  badgeBg = '#eff6ff',
  sectionType = 'module',
  renderCustomCell = null,
  isRefMode = false,
  selectedCoord = null,
  refCoords = [],
  onDeleteModule
}) {
  const [editingField, setEditingField] = useState(null); // { idx: null | 'parent' | index, key: '' }
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [showCNC, setShowCNC] = useState(false);

  const renderHeaderCell = (key, val, colLetter, onUpd, extraStyle = {}, isParent = true, overrideRowNum = null) => {
    const rowNum = overrideRowNum || (header._idx !== undefined ? header._idx : 0) + 1;
    const coord = `${colLetter}${rowNum}`;
    const isSel = selectedCoord === coord;
    const isRef = refCoords.includes(coord);
    const isEditing = editingField && editingField.key === key && (isParent ? editingField.isParent : editingField.subIdx === overrideRowNum);

    const cellStyle = {
      display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, position: 'relative',
      ...(isSel ? { outline: '2px solid #2563eb', outlineOffset: -2, zIndex: 10 } : {}),
      ...(isRef && !isSel ? { outline: '2px dashed #10b981', outlineOffset: -2, background: '#ecfdf5', zIndex: 5 } : {}),
      ...extraStyle
    };

    const handleMD = (e) => {
      if (isRefMode) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (onCellClick) onCellClick(coord);
    };

    return (
      <div style={cellStyle} onMouseDown={handleMD} onDoubleClick={(e) => { e.stopPropagation(); setEditingField({ isParent, subIdx: overrideRowNum, key }); }}>
        {isRefMode && <div style={{ position: 'absolute', inset: 0, zIndex: 20, cursor: 'crosshair', pointerEvents: 'auto' }} />}
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{key.toUpperCase()}</span>
        {isEditing ? (
          <input
            autoFocus
            style={{ width: key === 'sub' || key === 'jml' ? 35 : 55, textAlign: 'center', border: 'none', borderRadius: 4, outline: 'none', background: 'transparent' }}
            value={val === undefined || val === null ? (key === 'tpk' ? 'A' : 0) : val}
            onChange={e => onUpd(e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
            onMouseDown={e => e.stopPropagation()}
          />
        ) : (
          <span style={{ minWidth: key === 'sub' || key === 'jml' ? 20 : 30, textAlign: 'center', fontSize: 13 }}>{val === undefined || val === null ? (key === 'tpk' ? 'A' : 0) : val}</span>
        )}
      </div>
    );
  };

  // Grouping logic for segmented rendering
  const segments = [];
  let currentSegment = { type: 'main', items: [] };

  items.forEach((item, idx) => {
    const itemWithIdx = { ...item, _localIdx: idx };

    if (item.type === 'Set_up') {
      if (currentSegment.items.length > 0 || currentSegment.type === 'sub') {
        segments.push(currentSegment);
      }
      currentSegment = { type: 'sub', header: itemWithIdx, items: [] };
    } else if (item._isSubItem) {
      currentSegment.items.push(itemWithIdx);
    } else {
      if (currentSegment.type === 'sub') {
        segments.push(currentSegment);
        currentSegment = { type: 'main', items: [] };
      }
      currentSegment.items.push(itemWithIdx);
    }
  });
  segments.push(currentSegment);

  function handleUpdateParent(key, val) {
    if (key === 'modul') {
      const template = moduls.find(m => m.kabinet && m.kabinet.toLowerCase() === val.toLowerCase());
      if (template) {
        const shiftAmount = header._idx !== undefined ? header._idx : 0;

        // Lookup initial quantity from spec.modulRefs if configured
        let initialJml = template.jml || 1;
        if (spec && spec.modulRefs) {
          const ref = spec.modulRefs.find(r => {
            const rName = typeof r === 'string' ? r : r.name;
            return rName && template.kabinet && rName.toLowerCase() === template.kabinet.toLowerCase();
          });
          if (ref) {
            initialJml = typeof ref === 'string' ? 1 : (ref.qty || 1);
          }
        }

        // Prepare header data for shifting
        const headerCopy = {
          p: template.p, l: template.l, t: template.t, tpk: template.tpk || 'A',
          jml: initialJml, sub: template.sub || 1,
          p1: template.p1, p2: template.p2, l1: template.l1, l2: template.l2,
          l_fin: template.l_fin, d_fin: template.d_fin
        };
        const shiftedHeader = shiftTemplateFormulas([headerCopy], shiftAmount)[0];

        const newHeader = {
          ...header,
          modul: template.kabinet,
          komp: template.produk || template.dunit,
          tpk: template.tpk || 'A',
          ...shiftedHeader,
          jml: initialJml
        };

        // Shift formulas for components
        const shiftedKomp = shiftTemplateFormulas(template.komponen || [], shiftAmount);
        const nextItems = shiftedKomp.map(k => ({ ...emptyRow, ...k, modul: template.kabinet }));

        onChange(newHeader, nextItems);
        return;
      }
    }
    onChange({ ...header, [key]: val }, items);
  }

  function handleUpdateRow(idx, key, val) {
    if (idx === -1) {
      handleUpdateParent(key, val);
      return;
    }
    const next = [...items];
    if (!next[idx]) return;

    if (typeof key === 'object' && key !== null) {
      next[idx] = { ...next[idx], ...key };
      if (key.komp) {
        const valKomp = key.komp;
        const part = parts.find(p => p.name.toLowerCase() === valKomp.toLowerCase());
        if (part) {
          next[idx].cat = part.code; next[idx].kode = part.ks; next[idx].bhn = part.bhn; next[idx].t = part.t;
          if (part.l !== undefined) next[idx].l_fin = part.l.toString();
          if (part.d !== undefined) next[idx].d_fin = part.d.toString();
          if (part.p1 !== undefined) next[idx].p1 = part.p1.toString();
          if (part.p2 !== undefined) next[idx].p2 = part.p2.toString();
          if (part.l1 !== undefined) next[idx].l1 = part.l1.toString();
          if (part.l2 !== undefined) next[idx].l2 = part.l2.toString();
        }

        const setup = setupItems.find(s => s.name.toLowerCase() === valKomp.toLowerCase());
        next[idx].no = setup ? setup.no : '...';
        if (setup && !part) {
          next[idx].kode = setup.ks;
        }
      }
    } else {
      next[idx] = { ...next[idx], [key]: val };
      if (key === 'komp') {
        const part = parts.find(p => p.name.toLowerCase() === val.toLowerCase());
        if (part) {
          next[idx].cat = part.code; next[idx].kode = part.ks; next[idx].bhn = part.bhn; next[idx].t = part.t;
          if (part.l !== undefined) next[idx].l_fin = part.l.toString();
          if (part.d !== undefined) next[idx].d_fin = part.d.toString();
          if (part.p1 !== undefined) next[idx].p1 = part.p1.toString();
          if (part.p2 !== undefined) next[idx].p2 = part.p2.toString();
          if (part.l1 !== undefined) next[idx].l1 = part.l1.toString();
          if (part.l2 !== undefined) next[idx].l2 = part.l2.toString();
        }

        const setup = setupItems.find(s => s.name.toLowerCase() === val.toLowerCase());
        next[idx].no = setup ? setup.no : '...';
        if (setup && !part) {
          next[idx].kode = setup.ks;
        }
      }
    }
    onChange(header, next);
  }

  function handleReorder(from, to) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    let activeSub = false;
    const final = next.map(item => {
      if (item.type === 'Set_up') {
        activeSub = true;
        return { ...item, _isSubItem: false };
      }
      return { ...item, _isSubItem: activeSub };
    });
    onChange(header, final);
  }

  function handleAddRow(atIdx = -1) {
    const next = [...items];
    const parentRowNum = (header._idx !== undefined ? header._idx : 0) + 1;
    const defaults = buildDefaultRow(parentRowNum);
    const newRow = { ...emptyRow, ...defaults };
    if (atIdx === -1) next.push(newRow);
    else next.splice(atIdx + 1, 0, newRow);
    onChange(header, next);
  }

  function handleLoadSub(sub) {
    const shiftAmount = (header._idx !== undefined ? header._idx : 0) + items.length + 1;
    const headerCopy = { p: sub.p, l: sub.l, t: sub.t, sub: sub.sub || 1, jml: sub.jml || 1, p1: sub.p1, p2: sub.p2, l1: sub.l1, l2: sub.l2, l_fin: sub.l_fin, d_fin: sub.d_fin };
    const shiftedHeader = shiftTemplateFormulas([headerCopy], shiftAmount)[0];

    // Map setup attributes based on name lookup
    const smatch = setupItems.find(s => s.name?.trim() === sub.name?.trim());
    let subKode = '';
    let subNo = '•';

    if (smatch) {
      subNo = smatch.no || '•';
      if (smatch.ks) {
        subKode = smatch.ks;
      }
    }

    const subHeader = {
      ...emptyRow,
      type: 'Set_up',
      komp: sub.name,
      kode: '',
      no: '',
      ...shiftedHeader
    };

    const shiftedChildren = shiftTemplateFormulas(sub.komponen || [], shiftAmount);
    const subChildren = shiftedChildren.map(k => ({ ...emptyRow, ...k, _isSubItem: true }));

    onChange(header, [...items, subHeader, ...subChildren]);
    setIsSubModalOpen(false);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 24, overflow: 'visible' }}>

      {/* Header bar above the table container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: sectionType === 'submodule' ? '#faf5ff' : sectionType === 'lepasan' ? '#f0fdf4' : '#f8fafc', padding: '12px 20px', borderBottom: '1px solid ' + (sectionType === 'lepasan' ? '#d1fae5' : '#e5e7eb'), borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: badgeColor || '#2563eb', background: badgeBg || '#eff6ff', fontSize: 11, padding: '2px 8px', borderRadius: 6, letterSpacing: '0.05em' }}>
            {badgeText}
          </span>
          {sectionType === 'lepasan' ? (
            // Lepasan: nama section langsung bisa diedit di header bar
            <input
              style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#0f172a', outline: 'none', minWidth: 120 }}
              value={header.komp || header.modul || ''}
              placeholder="Nama section..."
              onChange={e => handleUpdateParent('komp', e.target.value)}
            />
          ) : (
            <>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                {header.modul || header.kabinet || 'NEW MODULE'}
              </span>

            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowCNC(!showCNC)}
            style={{ background: showCNC ? '#e2e8f0' : '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            {showCNC ? 'Hide Detail' : 'Show Detail'}
          </button>
          {onDeleteModule && (
            <button style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={onDeleteModule}>
              ✕ Hapus Modul
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll-container" style={{ overflowX: 'auto' }}>
        <SharedModuleTable
          rowOffset={sectionType === 'lepasan' ? 0 : (header._idx !== undefined ? 0 : 1)}
          items={items}
          parts={parts}
          setupItems={setupItems}
          hplOptions={hplOptions}
          edgOptions={edgOptions}
          bhnOptions={bhnOptions}
          hideCardFrame
          onUpdateRow={handleUpdateRow}
          onDeleteRow={(idx) => { const next = [...items]; next.splice(idx, 1); onChange(header, next); }}
          onReorder={handleReorder}
          onCellClick={onCellClick}
          isRefMode={isRefMode}              selectedCoord={selectedCoord}
              refCoordsStr={refCoordsStr}
          parent={header}
          onUpdateParent={handleUpdateParent}
          onDeleteModule={onDeleteModule}
          moduls={moduls}
          renderCustomCell={renderCustomCell}
          namedRanges={namedRanges}
          showCNC={showCNC}
          sectionType={sectionType}
        />
      </div>

      <div style={{ padding: '12px 20px', background: '#fcfcfd', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
        <button style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => handleAddRow()}>+ Tambah Baris Manual</button>
        {subModuls.length > 0 && <button style={{ background: 'transparent', border: 'none', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsSubModalOpen(true)}>+ Load Sub-Modul</button>}
      </div>

      <Modal open={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title="Pilih Sub-Modul">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {subModuls.map(sub => (
            <div key={sub.id} style={{ padding: 15, border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer' }} onClick={() => handleLoadSub(sub)}>
              <div style={{ fontWeight: 600 }}>{sub.name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{sub.komponen?.length || 0} items</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function objectsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

const MemoizedModuleEditor = React.memo(ModuleEditor, (prevProps, nextProps) => {
  return (
    objectsEqual(prevProps.header, nextProps.header) &&
    arraysEqual(prevProps.items, nextProps.items) &&
    prevProps.selectedCoord === nextProps.selectedCoord &&
    prevProps.refCoordsStr === nextProps.refCoordsStr &&
    prevProps.isRefMode === nextProps.isRefMode &&
    prevProps.sectionType === nextProps.sectionType &&
    prevProps.spec === nextProps.spec &&
    prevProps.parts === nextProps.parts &&
    prevProps.setupItems === nextProps.setupItems &&
    prevProps.moduls === nextProps.moduls &&
    prevProps.subModuls === nextProps.subModuls &&
    prevProps.hplOptions === nextProps.hplOptions &&
    prevProps.edgOptions === nextProps.edgOptions &&
    prevProps.bhnOptions === nextProps.bhnOptions &&
    prevProps.badgeText === nextProps.badgeText &&
    prevProps.badgeColor === nextProps.badgeColor &&
    prevProps.badgeBg === nextProps.badgeBg &&
    prevProps.mode === nextProps.mode
  );
});

export default MemoizedModuleEditor;