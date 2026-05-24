import React, { useState, useEffect, useMemo } from 'react';
import { s, Badge } from './UI';
import { evaluateFormula } from '../utils/calc';
import { calcBreakdownItem } from '../utils/breakdownCalc';

export function SearchableCell({ value, resolvedValue, options, onSelect, fontWeight = 400, isRefMode = false }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const startEditing = () => {
    setLocalValue(value);
    setEditing(true);
    setShow(true);
  };

  const displayValue = resolvedValue !== undefined ? resolvedValue : value;
  const filterText = (localValue === value || localValue === '...' || !localValue) ? '' : localValue.toString().toLowerCase();
  const filtered = options.filter(o => o.toLowerCase().includes(filterText)).slice(0, 15);

  if (editing) return (
    <div style={{ position: 'relative', zIndex: 9999 }} onMouseDown={e => isRefMode && e.preventDefault()}>
      <input
        autoFocus
        style={{ ...s.inputMinimal, fontWeight, background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box', width: '100%', textAlign: 'inherit' }}
        value={localValue === '...' ? '' : localValue}
        onChange={e => {
          setLocalValue(e.target.value);
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => { setShow(false); setEditing(false); }, 200)}
        onKeyDown={e => {
          if (e.key === 'Enter' && localValue !== value) {
            onSelect(localValue);
            setEditing(false);
          }
        }}
        placeholder="..."
      />
      {show && (
        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, zIndex: 10000, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', maxHeight: 200, overflowY: 'auto', marginTop: 2, minWidth: 300 }}>
          {filtered.length > 0 ? filtered.map((opt, i) => (
            <div
              key={i}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f9fafb', color: '#374151' }}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur race condition
                onSelect(opt);
                setLocalValue(opt);
                setShow(false);
                setEditing(false);
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {opt}
            </div>
          )) : (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Tidak ada hasil</div>
          )}
        </div>
      )}
    </div>
  );

  const isAlias = typeof value === 'string' && value.startsWith('@');

  return (
    <div
      style={{
        width: '100%',
        minHeight: 18,
        fontSize: 13,
        fontWeight,
        cursor: 'text',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'inherit',
        color: isAlias ? '#2563eb' : 'inherit',
        fontStyle: isAlias ? 'italic' : 'normal'
      }}
      onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }}
      title={isAlias ? `Dynamic Spec Alias: ${value}` : ''}
    >
      {isAlias ? `📎 ${displayValue}` : (displayValue || '...')}
    </div>
  );
}

function EditableCell({ item, idx, k, width, onUpdateRow, isRefMode, valueOverride }) {
  const [editing, setEditing] = useState(false);
  const displayVal = valueOverride !== undefined ? valueOverride : (item[k] || '');

  if (editing) return (
    <input
      autoFocus
      style={{ ...s.inputMinimal, width: width || '100%', background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box', textAlign: 'inherit' }}
      value={item[k] || ''}
      onChange={e => onUpdateRow(idx, k, e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={e => e.key === 'Enter' && setEditing(false)}
    />
  );
  return (
    <div
      style={{ width: '100%', minHeight: 18, fontSize: 13, cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'inherit' }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {displayVal}
    </div>
  );
}

export function FormulaInput({ value, evaluated, onChange, onFocus, onBlur, isHeader = false, textAlign }) {
  const [editing, setEditing] = useState(false);
  const isFormula = value?.toString().startsWith('=');

  const handleFocus = () => {
    setEditing(true);
    if (onFocus) onFocus(onChange);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setEditing(false);
      if (onBlur) onBlur();
    }, 200);
  };

  const align = textAlign || (isHeader ? 'center' : 'right');
  const flexAlign = align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end';

  if (editing) return (
    <input
      autoFocus
      style={{ ...s.inputMinimal, background: 'transparent', border: 'none', outline: 'none', textAlign: align, boxSizing: 'border-box', width: '100%' }}
      value={value}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          setEditing(false);
          if (onBlur) onBlur();
        }
      }}
    />
  );

  return (
    <div style={{ cursor: 'text', padding: '1px 2px', display: 'flex', flexDirection: 'column', alignItems: flexAlign, minHeight: isHeader ? 16 : 20, justifyContent: 'center' }} onDoubleClick={handleFocus}>
      <div style={{ fontSize: 12, fontWeight: 700, textAlign: align, color: isFormula ? '#2563eb' : '#111' }}>{evaluated}</div>
      {isFormula && !isHeader && <div style={{ fontSize: 8, color: '#94a3b8', marginTop: -2, textAlign: align }}>{value}</div>}
    </div>
  );
}




export default function SharedModuleTable({
  parts = [],
  setupItems = [],
  items = [],
  hplOptions = [],
  edgOptions = [],
  bhnOptions = [],
  onUpdateRow,
  onDeleteRow,
  onAddRow,
  onLoadSub,
  onReorder,
  onCellClick,
  rowOffset = 0,
  renderCustomCell = null,
  isRefMode = false,
  selectedCoord = null,
  refCoords = [],
  hideHeaderRow = false,
  hideCardFrame = false,
  parent = {},
  onUpdateParent,
  moduls = [],
  spec = {},
  badgeText = 'MODULE',
  badgeColor = '#2563eb',
  badgeBg = '#eff6ff',
  onDeleteModule,
  showCNC = false,
  sectionType = 'module'
}) {
  const [widths, setWidths] = useState([
    30,  // Row index column
    35,  // Column A: #
    45,  // Column B: Cat
    90,  // Column C: Type
    45,  // Column D: Kod
    45,  // Column E: Tpk
    45,  // Column F: No*
    30,  // Column F2: Opt (BARU)
    400, // Column G: Komponen
    75,  // Column H: P
    75,  // Column I: L
    40,  // Column J: T
    40,  // Column K: Sub
    40,  // Column L: Jml
    60,  // Column M: Bhn
    45,  // Column N: T.Bhn
    45,  // Column O: L
    45,  // Column P: D
    45,  // Column Q: P1
    45,  // Column R: P2
    45,  // Column S: L1
    45,  // Column T: L2
    120, // Column U: Luar
    35,  // Column U2: T.Luar (BARU)
    120, // Column V: Dalam
    35,  // Column V2: T.Dlm (BARU)
    110, // Column W: Edg P1
    110, // Column X: Edg P2
    110, // Column Y: Edg L1
    110, // Column Z: Edg L2
    40,  // Column AA: engsel
    40,  // Column AB: rel
    40,  // Column AC: dormec
    40,  // Column AD: minifix
    40,  // Column AE: dowel
    35,  // Column AF2: q_siku (BARU)
    35,  // Column AG2: q_screw (BARU)
    // showCNC columns:
    120, // Column AF: CNC Size
    50,  // Column AF3: T.Edg P1
    50,  // Column AF4: T.Edg P2
    50,  // Column AF5: T.Edg L1
    50,  // Column AF6: T.Edg L2
    55,  // Column AF7: M²/panel
    55,  // Column AF8: M² Total
    55,  // Column AF9: Klg/panel
    280, // Column AG: Komp CNC
    240, // Column AH: CSV
    40   // last column (Delete action / Parent text)
  ]);

  const handleMouseDown = (e, colIdx) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widths[colIdx];

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(20, startWidth + deltaX);
      setWidths(prev => {
        const next = [...prev];
        next[colIdx] = newWidth;
        return next;
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getColLetter = (k) => {
    if (k === 'cat') return 'B';
    if (k === 'type') return 'C';
    if (k === 'kode') return 'D';
    if (k === 'tpk') return 'E';
    if (k === 'no') return 'F';
    if (k === 'opt') return 'F2';
    if (k === 'komp') return 'G';
    if (k === 'p') return 'H';
    if (k === 'l') return 'I';
    if (k === 't') return 'J';
    if (k === 'sub') return 'K';
    if (k === 'jml') return 'L';
    if (k === 'bhn') return 'M';
    if (k === 't_bhn') return 'N';
    if (k === 'l_fin') return 'O';
    if (k === 'd_fin') return 'P';
    if (k === 'p1') return 'Q';
    if (k === 'p2') return 'R';
    if (k === 'l1') return 'S';
    if (k === 'l2') return 'T';
    if (k === 'lap_luar') return 'U';
    if (k === 't_luar') return 'U2';
    if (k === 'lap_dalam') return 'V';
    if (k === 't_dalam') return 'V2';
    if (k === 'edg_p1') return 'W';
    if (k === 'edg_p2') return 'X';
    if (k === 'edg_l1') return 'Y';
    if (k === 'edg_l2') return 'Z';
    if (k === 'q_engsel') return 'AA';
    if (k === 'q_rel') return 'AB';
    if (k === 'q_dormec') return 'AC';
    if (k === 'q_minifix') return 'AD';
    if (k === 'q_dowel') return 'AE';
    if (k === 'q_siku') return 'AF2';
    if (k === 'q_screw') return 'AG2';
    // showCNC calculated output columns:
    if (k === 't_p1') return 'T_P1';
    if (k === 't_p2') return 'T_P2';
    if (k === 't_l1') return 'T_L1';
    if (k === 't_l2') return 'T_L2';
    if (k === 'area_panel') return 'BN';
    if (k === 'area_m2') return 'BW';
    if (k === 'keliling_panel') return 'BM';
    return '';
  };

  const defaultRenderCell = (item, idx, key, isHeader = false) => {
    const rowNum = (item._idx !== undefined ? item._idx : idx + rowOffset) + 1;
    const colLetter = getColLetter(key);
    const coord = `${colLetter}${rowNum}`;
    const centerCols = ['B', 'C', 'D', 'E', 'F', 'F2', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U2', 'V2', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF2', 'AG2', 'T_P1', 'T_P2', 'T_L1', 'T_L2', 'BN', 'BW', 'BM'];
    const textAlign = centerCols.includes(colLetter) ? 'center' : (isHeader ? 'center' : 'right');

    return (
      <FormulaInput
        value={item[key]}
        isHeader={isHeader}
        textAlign={textAlign}
        evaluated={evaluateFormula(item[key], items, spec, isHeader ? {} : parent)}
        onFocus={() => onCellClick && onCellClick(coord)}
        onChange={v => {
          if (isHeader) {
            onUpdateParent(key, v);
          } else {
            onUpdateRow(idx, key, v);
          }
        }}
      />
    );
  };

  const getCellRenderer = (item, idx, key, isHeader = false) => {
    if (renderCustomCell) return renderCustomCell(item, idx, key);
    return defaultRenderCell(item, idx, key, isHeader);
  };

  const tableBody = (
    <div style={{ overflow: 'visible' }}>
      <style>{`
        .bom-table thead tr th {
          border-right: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 3px 6px !important;
          font-size: 11px !important;
        }
        .bom-table thead tr:first-child th {
          padding: 1px 0 !important;
          font-size: 9px !important;
        }
        .bom-table thead tr:first-child th:hover {
          background-color: #cbd5e1 !important;
          color: #1e3a8a !important;
        }
        .bom-table tbody tr td {
          padding: 2px 4px !important;
          font-size: 11px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .bom-table tbody tr td.has-dropdown {
          overflow: visible !important;
        }
      `}</style>
      {(() => {
        const tableWidth = widths.reduce((acc, w, idx) => {
          if (!showCNC && idx >= 37 && idx <= 46) return acc;
          return acc + w;
        }, 0);
        return (
          <table className="bom-table" style={{ ...s.table, border: 'none', tableLayout: 'fixed', minWidth: tableWidth, width: tableWidth }}>
            <colgroup>
              {widths.map((w, idx) => {
                if (!showCNC && idx >= 37 && idx <= 46) return null;
                return <col key={idx} style={{ width: w }} />;
              })}
            </colgroup>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ ...s.th, height: 16, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 5,
                      bottom: 0,
                      cursor: 'col-resize',
                      zIndex: 10
                    }}
                    onMouseDown={e => handleMouseDown(e, 0)}
                  />
                </th>
                {['A', 'B', 'C', 'D', 'E', 'F', 'F2', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
                  'S', 'T', 'U', 'U2', 'V', 'V2', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF2', 'AG2',
                  'AF', 'AF3', 'AF4', 'AF5', 'AF6', 'AF7', 'AF8', 'AF9', 'AG', 'AH', ''
                ].map((letter, i) => {
                  const showCncLetters = ['AF', 'AF3', 'AF4', 'AF5', 'AF6', 'AF7', 'AF8', 'AF9', 'AG', 'AH'];
                  if (!showCNC && showCncLetters.includes(letter)) return null;
                  return (
                    <th
                      key={i}
                      style={{
                        ...s.th,
                        height: 16,
                        fontSize: 9,
                        color: '#94a3b8',
                        textAlign: 'center',
                        padding: '2px 0',
                        position: 'relative'
                      }}
                    >
                      {letter}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 5,
                          bottom: 0,
                          cursor: 'col-resize',
                          zIndex: 10
                        }}
                        onMouseDown={e => handleMouseDown(e, i + 1)}
                      />
                    </th>
                  );
                })}
              </tr>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ ...s.th, background: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}></th>
                <th style={{ ...s.th }}>#</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Cat</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Type</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Kod</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Tpk</th>
                <th style={{ ...s.th, textAlign: 'center' }}>No*</th>
                <th style={{ ...s.th, background: '#e2e8f0', textAlign: 'center' }}>Opt</th>
                <th style={{ ...s.th }}>Komponen</th>
                <th style={{ ...s.th, textAlign: 'center' }}>P</th>
                <th style={{ ...s.th, textAlign: 'center' }}>L</th>
                <th style={{ ...s.th, textAlign: 'center' }}>T</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Sub</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Jml</th>
                {/* Fase 1: Material */}
                <th style={{ ...s.th, background: '#e0f2fe', textAlign: 'center' }}>Bhn</th>
                <th style={{ ...s.th, background: '#e0f2fe', textAlign: 'center' }}>T.Bhn</th>
                <th style={{ ...s.th, background: '#fef3c7', textAlign: 'center' }}>L</th>
                <th style={{ ...s.th, background: '#fef3c7', textAlign: 'center' }}>D</th>
                <th style={{ ...s.th, background: '#ecfdf5', textAlign: 'center' }}>P1</th>
                <th style={{ ...s.th, background: '#ecfdf5', textAlign: 'center' }}>P2</th>
                <th style={{ ...s.th, background: '#fff7ed', textAlign: 'center' }}>L1</th>
                <th style={{ ...s.th, background: '#fff7ed', textAlign: 'center' }}>L2</th>
                <th style={{ ...s.th, background: '#dbeafe' }}>Luar (HPL)</th>
                <th style={{ ...s.th, background: '#fef9c3', textAlign: 'center' }}>T.Luar</th>
                <th style={{ ...s.th, background: '#ede9fe' }}>Dalam (HPL)</th>
                <th style={{ ...s.th, background: '#f3e8ff', textAlign: 'center' }}>T.Dlm</th>
                {/* Fase 1: Edging */}
                <th style={{ ...s.th, background: '#dcfce7' }}>Edg P1</th>
                <th style={{ ...s.th, background: '#dcfce7' }}>Edg P2</th>
                <th style={{ ...s.th, background: '#fef9c3' }}>Edg L1</th>
                <th style={{ ...s.th, background: '#fef9c3' }}>Edg L2</th>
                {/* Fase 1: Hardware */}
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Eng</th>
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Rel</th>
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Dmc</th>
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Mfx</th>
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Dwl</th>
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Sku</th>
                <th style={{ ...s.th, background: '#fce7f3', fontSize: 9, textAlign: 'center' }}>Scr</th>
                {/* Fase 2: Calculated Columns */}
                {showCNC && <th style={{ ...s.th, background: '#f0fdf4', color: '#15803d', textAlign: 'center' }}>Ukuran CNC</th>}
                {showCNC && <th style={{ ...s.th, background: '#dcfce7', color: '#166534', textAlign: 'center' }}>T.Edg P1</th>}
                {showCNC && <th style={{ ...s.th, background: '#dcfce7', color: '#166534', textAlign: 'center' }}>T.Edg P2</th>}
                {showCNC && <th style={{ ...s.th, background: '#fef9c3', color: '#854d0e', textAlign: 'center' }}>T.Edg L1</th>}
                {showCNC && <th style={{ ...s.th, background: '#fef9c3', color: '#854d0e', textAlign: 'center' }}>T.Edg L2</th>}
                {showCNC && <th style={{ ...s.th, background: '#e0f2fe', color: '#075985', textAlign: 'center' }}>M²/panel</th>}
                {showCNC && <th style={{ ...s.th, background: '#e0f2fe', color: '#075985', textAlign: 'center' }}>M² total</th>}
                {showCNC && <th style={{ ...s.th, background: '#ccfbf1', color: '#115e59', textAlign: 'center' }}>Klg/panel</th>}
                {showCNC && <th style={{ ...s.th, background: '#eff6ff', color: '#1d4ed8', textAlign: 'left' }}>Nama Komponen BOM</th>}
                {showCNC && <th style={{ ...s.th, background: '#f8fafc', color: '#475569', textAlign: 'left' }}>Format CSV CNC</th>}
                <th style={{ ...s.th }}></th>
              </tr>
            </thead>
            <tbody>
              {parent && Object.keys(parent).length > 0 && (() => {
                const parentRowNumber = (parent._idx !== undefined ? parent._idx : 0) + 1;
                const handleCellClick = (col) => onCellClick && onCellClick(`${col}${parentRowNumber}`);
                const isSel = (col) => selectedCoord === `${col}${parentRowNumber}`;
                const isRef = (col) => refCoords.includes(`${col}${parentRowNumber}`);
                const centerCols = ['B', 'C', 'D', 'E', 'F', 'F2', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U2', 'V2', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF2', 'AG2', 'T_P1', 'T_P2', 'T_L1', 'T_L2', 'BN', 'BW', 'BM'];
                const cellStyle = (col, extra = {}) => ({
                  ...s.td,
                  textAlign: centerCols.includes(col) ? 'center' : 'left',
                  ...extra,
                  background: parentBg,
                  ...(isSel(col) ? { outline: '2px solid #2563eb', outlineOffset: -2, zIndex: 10, position: 'relative' } : {}),
                  ...(isRef(col) && !isSel(col) ? { outline: '2px dashed #10b981', outlineOffset: -2, background: '#ecfdf5', zIndex: 5, position: 'relative' } : {}),
                });
                const handleMD = (e, col) => {
                  if (isRefMode && !isSel(col)) e.preventDefault();
                  handleCellClick(col);
                };

                const pType = parent.type || 'Ref';

                const parentBg = sectionType === 'lepasan' ? '#fff' : '#fefcbf';

                // Part Lepasan: parent row disembunyikan, komponen langsung tampil sebagai baris biasa
                if (sectionType === 'lepasan') return null;

                return (
                  <tr style={{ borderBottom: '1px solid #cbd5e1', background: parentBg }}>
                    <td style={{ ...s.td, background: parentBg, borderRight: '1px solid #e2e8f0', color: '#64748b', fontSize: 9, textAlign: 'center', fontWeight: 700 }}>
                      {parentRowNumber}
                    </td>
                    <td style={cellStyle('A')} onMouseDown={(e) => handleMD(e, 'A')}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>⋮⋮</span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>{parentRowNumber}</span>
                      </div>
                    </td>
                    <td style={cellStyle('B')} onMouseDown={(e) => handleMD(e, 'B')}>
                      <EditableCell item={parent} idx={-1} k="cat" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} valueOverride={pType === 'Ref' ? '...' : undefined} />
                    </td>
                    <td className="has-dropdown" style={cellStyle('C')} onMouseDown={(e) => handleMD(e, 'C')}>
                      <SearchableCell value={parent.type || 'Ref'} options={['prt', 'Set_up', 'kab', 'Ref', 'proses_khusus']} onSelect={v => onUpdateParent('type', v)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('D')} onMouseDown={(e) => handleMD(e, 'D')}>
                      <EditableCell item={parent} idx={-1} k="kode" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} valueOverride={pType === 'Ref' ? '(ks)' : undefined} />
                    </td>
                    <td style={cellStyle('E')} onMouseDown={(e) => handleMD(e, 'E')}>
                      <EditableCell item={parent} idx={-1} k="tpk" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('F')} onMouseDown={(e) => handleMD(e, 'F')}>
                      <EditableCell item={parent} idx={-1} k="no" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} valueOverride={pType === 'Ref' ? '1' : undefined} />
                    </td>
                    <td style={cellStyle('F2')} onMouseDown={(e) => handleMD(e, 'F2')}>
                      <EditableCell item={parent} idx={-1} k="opt" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td className="has-dropdown" style={cellStyle('G')} onMouseDown={(e) => handleMD(e, 'G')}>
                      {sectionType === 'lepasan' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>PART LEPASAN</span>
                          <input
                            style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#0f172a', outline: 'none', flex: 1, padding: 0 }}
                            value={parent.komp || parent.modul || ''}
                            placeholder="Nama section..."
                            onChange={e => { onUpdateParent('komp', e.target.value); onUpdateParent('modul', e.target.value); }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, padding: '1px 5px', borderRadius: 4 }}>{badgeText}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <SearchableCell
                                value={parent.modul || parent.kabinet || ''}
                                options={moduls.map(m => m.kabinet || m.modul)}
                                onSelect={v => onUpdateParent('modul', v)}
                                fontWeight={700}
                                isRefMode={isRefMode}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={cellStyle('H')} onMouseDown={(e) => handleMD(e, 'H')}>{getCellRenderer(parent, -1, 'p', true)}</td>
                    <td style={cellStyle('I')} onMouseDown={(e) => handleMD(e, 'I')}>{getCellRenderer(parent, -1, 'l', true)}</td>
                    <td style={cellStyle('J')} onMouseDown={(e) => handleMD(e, 'J')}>{getCellRenderer(parent, -1, 't', true)}</td>
                    <td style={cellStyle('K')} onMouseDown={(e) => handleMD(e, 'K')}>
                      <EditableCell item={parent} idx={-1} k="sub" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('L')} onMouseDown={(e) => handleMD(e, 'L')}>
                      <EditableCell item={parent} idx={-1} k="jml" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td className="has-dropdown" style={cellStyle('M', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'M')}>
                      <SearchableCell
                        value={parent.bhn || ''}
                        options={bhnOptions.length ? bhnOptions : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC']}
                        onSelect={v => onUpdateParent('bhn', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('N', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'N')}>
                      <EditableCell item={parent} idx={-1} k="t_bhn" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('O', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'O')}>{getCellRenderer(parent, -1, 'l_fin', true)}</td>
                    <td style={cellStyle('P', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'P')}>{getCellRenderer(parent, -1, 'd_fin', true)}</td>
                    <td style={cellStyle('Q', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'Q')}>{getCellRenderer(parent, -1, 'p1', true)}</td>
                    <td style={cellStyle('R', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'R')}>{getCellRenderer(parent, -1, 'p2', true)}</td>
                    <td style={cellStyle('S', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'S')}>{getCellRenderer(parent, -1, 'l1', true)}</td>
                    <td style={cellStyle('T', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'T')}>{getCellRenderer(parent, -1, 'l2', true)}</td>
                    <td className="has-dropdown" style={cellStyle('U', { background: '#dbeafe' })} onMouseDown={(e) => handleMD(e, 'U')}>
                      <SearchableCell
                        value={parent.lap_luar || ''}
                        options={hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos']}
                        onSelect={v => onUpdateParent('lap_luar', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('U2', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'U2')}>
                      <EditableCell item={parent} idx={-1} k="t_luar" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td className="has-dropdown" style={cellStyle('V', { background: '#ede9fe' })} onMouseDown={(e) => handleMD(e, 'V')}>
                      <SearchableCell
                        value={parent.lap_dalam || ''}
                        options={['', ...(hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos'])]}
                        onSelect={v => onUpdateParent('lap_dalam', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('V2', { background: '#f3e8ff' })} onMouseDown={(e) => handleMD(e, 'V2')}>
                      <EditableCell item={parent} idx={-1} k="t_dalam" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td className="has-dropdown" style={cellStyle('W', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'W')}>
                      <SearchableCell
                        value={parent.edg_p1 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateParent('edg_p1', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td className="has-dropdown" style={cellStyle('X', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'X')}>
                      <SearchableCell
                        value={parent.edg_p2 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateParent('edg_p2', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td className="has-dropdown" style={cellStyle('Y', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'Y')}>
                      <SearchableCell
                        value={parent.edg_l1 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateParent('edg_l1', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td className="has-dropdown" style={cellStyle('Z', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'Z')}>
                      <SearchableCell
                        value={parent.edg_l2 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateParent('edg_l2', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('AA', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AA')}>
                      <EditableCell item={parent} idx={-1} k="q_engsel" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AB', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AB')}>
                      <EditableCell item={parent} idx={-1} k="q_rel" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AC', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AC')}>
                      <EditableCell item={parent} idx={-1} k="q_dormec" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AD', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AD')}>
                      <EditableCell item={parent} idx={-1} k="q_minifix" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AE', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AE')}>
                      <EditableCell item={parent} idx={-1} k="q_dowel" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AF2', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AF2')}>
                      <EditableCell item={parent} idx={-1} k="q_siku" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AG2', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AG2')}>
                      <EditableCell item={parent} idx={-1} k="q_screw" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    {(() => {
                      const calc = parent.komp || parent.modul || parent.kabinet ? calcBreakdownItem(parent, items, spec, parent) : null;
                      return (
                        <>
                          {showCNC && <td style={cellStyle('AF', { background: '#f0fdf4', color: '#047857', fontWeight: 600, fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'AF')}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {calc ? calc.ukuran_cnc : '-'}
                            </div>
                          </td>}
                          {showCNC && <td style={cellStyle('T_P1', { background: '#dcfce7', color: '#166534', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_P1')}>
                            {calc ? (calc.t_p1 > 0 ? calc.t_p1 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('T_P2', { background: '#dcfce7', color: '#166534', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_P2')}>
                            {calc ? (calc.t_p2 > 0 ? calc.t_p2 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('T_L1', { background: '#fef9c3', color: '#854d0e', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_L1')}>
                            {calc ? (calc.t_l1 > 0 ? calc.t_l1 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('T_L2', { background: '#fef9c3', color: '#854d0e', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_L2')}>
                            {calc ? (calc.t_l2 > 0 ? calc.t_l2 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('BN', { background: '#e0f2fe', color: '#075985', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'BN')}>
                            {calc && calc.area_panel ? calc.area_panel.toFixed(3) : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('BW', { background: '#e0f2fe', color: '#075985', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'BW')}>
                            {calc && calc.area_m2 ? calc.area_m2.toFixed(3) : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('BM', { background: '#ccfbf1', color: '#115e59', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'BM')}>
                            {calc && calc.keliling_panel ? calc.keliling_panel.toFixed(2) : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('AG', { background: '#eff6ff', color: '#1e40af', fontWeight: 600, fontSize: 11, textAlign: 'left', padding: '2px 8px', whiteSpace: 'nowrap' })} onMouseDown={(e) => handleMD(e, 'AG')}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {calc ? calc.nama_komp : '-'}
                            </div>
                          </td>}
                          {showCNC && <td style={cellStyle('AH', { background: '#f8fafc', color: '#64748b', fontSize: 10, textAlign: 'left', padding: '2px 8px', fontFamily: 'monospace', whiteSpace: 'nowrap' })} onMouseDown={(e) => handleMD(e, 'AH')}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {calc ? calc.csv_format : '-'}
                            </div>
                          </td>}
                        </>
                      );
                    })()}
                    <td style={s.td}></td>
                  </tr>
                );
              })()}
              {items.map((item, rowIdx) => {
                const rowNumber = (item._idx !== undefined ? item._idx : rowIdx + rowOffset) + 1;
                const handleCellClick = (col) => onCellClick && onCellClick(`${col}${rowNumber}`);
                const isSel = (col) => selectedCoord === `${col}${rowNumber}`;
                const isRef = (col) => refCoords.includes(`${col}${rowNumber}`);
                const isSetUp = item.type === 'Set_up';
                const centerCols = ['B', 'C', 'D', 'E', 'F', 'F2', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U2', 'V2', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF2', 'AG2', 'T_P1', 'T_P2', 'T_L1', 'T_L2', 'BN', 'BW', 'BM'];
                const cellStyle = (col, extra = {}) => ({
                   ...s.td,
                   textAlign: centerCols.includes(col) ? 'center' : 'left',
                   ...extra,
                   ...(isSetUp ? { background: '#fefcbf' } : {}),
                   ...(isSel(col) ? { outline: '2px solid #2563eb', outlineOffset: -2, zIndex: 10, position: 'relative' } : {}),
                   ...(isRef(col) && !isSel(col) ? { outline: '2px dashed #10b981', outlineOffset: -2, background: '#ecfdf5', zIndex: 5, position: 'relative' } : {}),
                });
                const handleMD = (e, col) => {
                  if (isRefMode && !isSel(col)) e.preventDefault();
                  handleCellClick(col);
                };

                const currentType = item.type || '';
                let componentOptions = [];
                if (currentType === 'prt') componentOptions = parts.map(p => p.name);
                else if (currentType === 'Set_up') componentOptions = setupItems.map(s => s.name);
                else componentOptions = parts.map(p => p.name);

                return (
                  <tr
                    key={rowIdx}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', rowIdx); e.currentTarget.style.opacity = '0.4'; }}
                    onDragEnd={e => { e.currentTarget.style.opacity = '1'; }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                      if (onReorder) onReorder(fromIdx, rowIdx);
                    }}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'grab', background: item.type === 'Set_up' ? '#fefcbf' : 'transparent' }}
                  >
                    <td style={cellStyle('A', { background: '#f8fafc', borderRight: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 9, textAlign: 'center', fontWeight: 700 })} onMouseDown={(e) => handleMD(e, 'A')}>{rowNumber}</td>
                    <td style={cellStyle('A', { fontSize: 10, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'A')}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 12 }}>⋮⋮</span>
                        <span style={{ color: '#666' }}>{rowNumber}</span>
                      </div>
                    </td>
                    <td style={cellStyle('B')} onMouseDown={(e) => handleMD(e, 'B')}><EditableCell item={item} idx={rowIdx} k="cat" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td className="has-dropdown" style={cellStyle('C')} onMouseDown={(e) => handleMD(e, 'C')}><SearchableCell value={item.type} options={['prt', 'Set_up', 'kab', 'Ref', 'proses_khusus']} onSelect={v => onUpdateRow(rowIdx, 'type', v)} isRefMode={isRefMode} /></td>
                    <td style={cellStyle('D')} onMouseDown={(e) => handleMD(e, 'D')}>
                      {(() => {
                        const smMatch = item.type === 'Set_up' ? setupItems.find(s => s.name?.trim() === item.komp?.trim()) : null;
                        return <EditableCell item={item} idx={rowIdx} k="kode" valueOverride={smMatch?.ks} onUpdateRow={onUpdateRow} isRefMode={isRefMode} />;
                      })()}
                    </td>
                    <td style={cellStyle('E')} onMouseDown={(e) => handleMD(e, 'E')}><EditableCell item={item} idx={rowIdx} k="tpk" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td style={cellStyle('F')} onMouseDown={(e) => handleMD(e, 'F')}>
                      {(() => {
                        const smMatch = item.type === 'Set_up' ? setupItems.find(s => s.name?.trim() === item.komp?.trim()) : null;
                        return <EditableCell item={item} idx={rowIdx} k="no" valueOverride={smMatch?.no} onUpdateRow={onUpdateRow} isRefMode={isRefMode} />;
                      })()}
                    </td>
                    <td style={cellStyle('F2')} onMouseDown={(e) => handleMD(e, 'F2')}><EditableCell item={item} idx={rowIdx} k="opt" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td className="has-dropdown" style={cellStyle('G')} onMouseDown={(e) => handleMD(e, 'G')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {item.type === 'Set_up' && <Badge color="indigo">SUB</Badge>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <SearchableCell
                            value={item.komp}
                            options={componentOptions}
                            onSelect={v => {
                              const cleanV = v?.trim();
                              const updates = { komp: cleanV };
                              const partMatch = parts.find(p => p.name?.trim() === cleanV);
                              if (partMatch) {
                                // Helper: resolve "=varname" dari partsData ke nilai spek aktif
                                if (partMatch.val) {
                                  updates.bid = partMatch.val;
                                  updates.no = partMatch.val;
                                }
                                if (partMatch.bhn) updates.bhn = partMatch.bhn;
                                if (partMatch.t !== undefined) updates.t_bhn = partMatch.t;
                                if (partMatch.code) updates.cat = partMatch.code;
                                if (partMatch.ks) updates.kode = partMatch.ks;

                                // Lapisan & Edging IDs
                                if (partMatch.l !== undefined) updates.l_fin = partMatch.l;
                                if (partMatch.d !== undefined) updates.d_fin = partMatch.d;
                                if (partMatch.p1 !== undefined) updates.p1 = partMatch.p1;
                                if (partMatch.p2 !== undefined) updates.p2 = partMatch.p2;
                                if (partMatch.l1 !== undefined) updates.l1 = partMatch.l1;
                                if (partMatch.l2 !== undefined) updates.l2 = partMatch.l2;

                                // Lapisan & Edging Names
                                if (partMatch.lap_luar !== undefined) updates.lap_luar = partMatch.lap_luar;
                                if (partMatch.lap_dalam !== undefined) updates.lap_dalam = partMatch.lap_dalam;
                                if (partMatch.edg_p1 !== undefined) updates.edg_p1 = partMatch.edg_p1;
                                if (partMatch.edg_p2 !== undefined) updates.edg_p2 = partMatch.edg_p2;
                                if (partMatch.edg_l1 !== undefined) updates.edg_l1 = partMatch.edg_l1;
                                if (partMatch.edg_l2 !== undefined) updates.edg_l2 = partMatch.edg_l2;

                                // Hardware Counts
                                if (partMatch.q_engsel !== undefined) updates.q_engsel = partMatch.q_engsel;
                                if (partMatch.q_rel !== undefined) updates.q_rel = partMatch.q_rel;
                                if (partMatch.q_dormec !== undefined) updates.q_dormec = partMatch.q_dormec;
                                if (partMatch.q_minifix !== undefined) updates.q_minifix = partMatch.q_minifix;
                                if (partMatch.q_dowel !== undefined) updates.q_dowel = partMatch.q_dowel;

                              } else {
                                const smatch = setupItems.find(s => s.name?.trim() === cleanV);
                                if (smatch) {
                                  if (smatch.ks) updates.kode = smatch.ks;
                                  if (smatch.no && smatch.no !== '•' && smatch.no !== '-') updates.no = smatch.no;
                                }
                              }
                              onUpdateRow(rowIdx, updates);
                            }}
                            fontWeight={item.type === 'Set_up' ? 700 : 600}
                            isRefMode={isRefMode}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle('H')} onMouseDown={(e) => handleMD(e, 'H')}>{getCellRenderer(item, rowIdx, 'p')}</td>
                    <td style={cellStyle('I')} onMouseDown={(e) => handleMD(e, 'I')}>{getCellRenderer(item, rowIdx, 'l')}</td>
                    <td style={cellStyle('J')} onMouseDown={(e) => handleMD(e, 'J')}>{getCellRenderer(item, rowIdx, 't')}</td>
                    <td style={cellStyle('K')} onMouseDown={(e) => handleMD(e, 'K')}><EditableCell item={item} idx={rowIdx} k="sub" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td style={cellStyle('L')} onMouseDown={(e) => handleMD(e, 'L')}><EditableCell item={item} idx={rowIdx} k="jml" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td className="has-dropdown" style={cellStyle('M', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'M')}>
                      <SearchableCell
                        value={item.bhn || ''}
                        options={bhnOptions.length ? bhnOptions : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC']}
                        onSelect={v => onUpdateRow(rowIdx, 'bhn', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('N', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'N')}>
                      <EditableCell item={item} idx={rowIdx} k="t_bhn" onUpdateRow={onUpdateRow} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('O', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'O')}>{getCellRenderer(item, rowIdx, 'l_fin')}</td>
                    <td style={cellStyle('P', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'P')}>{getCellRenderer(item, rowIdx, 'd_fin')}</td>
                    <td style={cellStyle('Q', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'Q')}>{getCellRenderer(item, rowIdx, 'p1')}</td>
                    <td style={cellStyle('R', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'R')}>{getCellRenderer(item, rowIdx, 'p2')}</td>
                    <td style={cellStyle('S', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'S')}>{getCellRenderer(item, rowIdx, 'l1')}</td>
                    <td style={cellStyle('T', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'T')}>{getCellRenderer(item, rowIdx, 'l2')}</td>
                    <td className="has-dropdown" style={cellStyle('U', { background: '#dbeafe' })} onMouseDown={(e) => handleMD(e, 'U')}>
                      <SearchableCell
                        value={item.lap_luar || ''}
                        options={hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos']}
                        onSelect={v => onUpdateRow(rowIdx, 'lap_luar', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('U2', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'U2')}><EditableCell item={item} idx={rowIdx} k="t_luar" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td className="has-dropdown" style={cellStyle('V', { background: '#ede9fe' })} onMouseDown={(e) => handleMD(e, 'V')}>
                      <SearchableCell
                        value={item.lap_dalam || ''}
                        options={['', ...(hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos'])]}
                        onSelect={v => onUpdateRow(rowIdx, 'lap_dalam', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('V2', { background: '#f3e8ff' })} onMouseDown={(e) => handleMD(e, 'V2')}><EditableCell item={item} idx={rowIdx} k="t_dalam" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td className="has-dropdown" style={cellStyle('W', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'W')}>
                      <SearchableCell
                         value={item.edg_p1 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateRow(rowIdx, 'edg_p1', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td className="has-dropdown" style={cellStyle('X', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'X')}>
                      <SearchableCell
                        value={item.edg_p2 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateRow(rowIdx, 'edg_p2', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td className="has-dropdown" style={cellStyle('Y', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'Y')}>
                      <SearchableCell
                        value={item.edg_l1 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateRow(rowIdx, 'edg_l1', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td className="has-dropdown" style={cellStyle('Z', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'Z')}>
                      <SearchableCell
                        value={item.edg_l2 || ''}
                        options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                        onSelect={v => onUpdateRow(rowIdx, 'edg_l2', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('AA', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AA')}>
                      <EditableCell item={item} idx={rowIdx} k="q_engsel" onUpdateRow={onUpdateRow} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AB', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AB')}>
                      <EditableCell item={item} idx={rowIdx} k="q_rel" onUpdateRow={onUpdateRow} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AC', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AC')}>
                      <EditableCell item={item} idx={rowIdx} k="q_dormec" onUpdateRow={onUpdateRow} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AD', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AD')}>
                      <EditableCell item={item} idx={rowIdx} k="q_minifix" onUpdateRow={onUpdateRow} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AE', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AE')}>
                      <EditableCell item={item} idx={rowIdx} k="q_dowel" onUpdateRow={onUpdateRow} isRefMode={isRefMode} />
                    </td>
                    <td style={cellStyle('AF2', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AF2')}><EditableCell item={item} idx={rowIdx} k="q_siku" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    <td style={cellStyle('AG2', { background: '#fce7f3' })} onMouseDown={(e) => handleMD(e, 'AG2')}><EditableCell item={item} idx={rowIdx} k="q_screw" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
                    {(() => {
                      const calc = item.komp ? calcBreakdownItem(item, items, spec, parent) : null;
                      return (
                        <>
                          {showCNC && <td style={cellStyle('AF', { background: '#f0fdf4', color: '#047857', fontWeight: 600, fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'AF')}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {calc ? calc.ukuran_cnc : '-'}
                            </div>
                          </td>}
                          {showCNC && <td style={cellStyle('T_P1', { background: '#dcfce7', color: '#166534', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_P1')}>
                            {calc ? (calc.t_p1 > 0 ? calc.t_p1 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('T_P2', { background: '#dcfce7', color: '#166534', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_P2')}>
                            {calc ? (calc.t_p2 > 0 ? calc.t_p2 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('T_L1', { background: '#fef9c3', color: '#854d0e', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_L1')}>
                            {calc ? (calc.t_l1 > 0 ? calc.t_l1 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('T_L2', { background: '#fef9c3', color: '#854d0e', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'T_L2')}>
                            {calc ? (calc.t_l2 > 0 ? calc.t_l2 : '-') : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('BN', { background: '#e0f2fe', color: '#075985', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'BN')}>
                            {calc && calc.area_panel ? calc.area_panel.toFixed(3) : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('BW', { background: '#e0f2fe', color: '#075985', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'BW')}>
                            {calc && calc.area_m2 ? calc.area_m2.toFixed(3) : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('BM', { background: '#ccfbf1', color: '#115e59', fontSize: 11, textAlign: 'center' })} onMouseDown={(e) => handleMD(e, 'BM')}>
                            {calc && calc.keliling_panel ? calc.keliling_panel.toFixed(2) : '-'}
                          </td>}
                          {showCNC && <td style={cellStyle('AG', { background: '#eff6ff', color: '#1e40af', fontWeight: 600, fontSize: 11, textAlign: 'left', padding: '2px 8px', whiteSpace: 'nowrap' })} onMouseDown={(e) => handleMD(e, 'AG')}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {calc ? calc.nama_komp : '-'}
                            </div>
                          </td>}
                          {showCNC && <td style={cellStyle('AH', { background: '#f8fafc', color: '#64748b', fontSize: 10, textAlign: 'left', padding: '2px 8px', fontFamily: 'monospace', whiteSpace: 'nowrap' })} onMouseDown={(e) => handleMD(e, 'AH')}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {calc ? calc.csv_format : '-'}
                            </div>
                          </td>}
                        </>
                      );
                    })()}
                    <td style={s.td}><button style={{ ...s.iconBtn, color: '#fca5a5' }} onClick={() => onDeleteRow(rowIdx)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      })()}
    </div>
  );

  if (hideCardFrame) return <div style={{ overflow: 'visible' }}>{tableBody}</div>;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 24, overflow: 'visible' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fcfcfd' }}>
        <div style={{ width: 30, background: '#f1f5f9', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>
          {(parent._idx !== undefined ? parent._idx : 0) + 1}
        </div>
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, background: badgeBg, padding: '2px 6px', borderRadius: 4 }}>{badgeText}</span>
              <input style={{ border: 'none', background: 'transparent', fontSize: 16, fontWeight: 700, outline: 'none', minWidth: 100 }} value={parent.modul || parent.kabinet || ''} onChange={e => onUpdateParent('modul', e.target.value)} />
            </div>
            <input style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#6b7280', outline: 'none', width: '100%' }} value={parent.komp || parent.produk || parent.dunit || ''} placeholder="Deskripsi..." onChange={e => onUpdateParent('komp', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
            {(() => {
              const pIndex = (parent._idx !== undefined ? parent._idx : 0) + 1;
              const renderParentCell = (key, col) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, position: 'relative' }} onMouseDown={(e) => { if (!isRefMode) return; e.preventDefault(); e.stopPropagation(); onCellClick(`${col}${pIndex}`); }}>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{key.toUpperCase()}</span>
                  {getCellRenderer(parent, parent._idx, key, true)}
                </div>
              );
              return (
                <>
                  {renderParentCell('p', 'H')}
                  {renderParentCell('l', 'I')}
                  {renderParentCell('t', 'J')}
                  <div style={{ marginLeft: 8, display: 'flex' }}>
                    {renderParentCell('sub', 'K')}
                    {renderParentCell('jml', 'L')}
                  </div>
                  <div style={{ marginLeft: 8, display: 'flex', gap: 2, background: '#fffbeb', borderRadius: 4, padding: '0 4px' }}>
                    {renderParentCell('l_fin', 'O')}
                    {renderParentCell('d_fin', 'P')}
                  </div>
                  <div style={{ marginLeft: 4, display: 'flex', gap: 2, background: '#f0fdf4', borderRadius: 4, padding: '0 4px' }}>
                    {renderParentCell('p1', 'Q')}
                    {renderParentCell('p2', 'R')}
                  </div>
                  <div style={{ marginLeft: 4, display: 'flex', gap: 2, background: '#fff7ed', borderRadius: 4, padding: '0 4px' }}>
                    {renderParentCell('l1', 'S')}
                    {renderParentCell('l2', 'T')}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      {tableBody}
      <div style={{ padding: '12px 20px 12px 50px', background: '#fcfcfd', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={onAddRow}>+ Tambah Baris Manual</button>
        {onLoadSub && <button style={{ background: 'transparent', border: 'none', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={onLoadSub}>+ Load Sub-Modul</button>}
      </div>
    </div>
  );
}