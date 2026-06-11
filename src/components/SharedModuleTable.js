import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { s, Badge } from './UI';
import { evaluateFormula } from '../utils/calc';
import { resolveAlias, buildAliasMap } from '../utils/resolveAlias';
import { calcBreakdownItem, getEdgingNameFromCode, resolveEdgingFromCode, getFinishingThickness, resolveLapisanFromCode, getPartDefaultValue, isFinishingEmpty } from '../utils/breakdownCalc';
import { getColLetter } from '../utils/colMap';

const EXTRA_COLUMNS = [
  { key: 'profil3', label: 'Profil 3', width: 100, isCalc: false, bg: '#e2e8f0' },
  { key: 'profil2', label: 'Profil 2', width: 100, isCalc: false, bg: '#e2e8f0' },
  { key: 'profil', label: 'Profil', width: 100, isCalc: false, bg: '#e2e8f0' },
  { key: 'siku_joint', label: 'Siku joint', width: 70, isCalc: false, bg: '#fee2e2' },
  { key: 'screw_jf', label: 'Screw Jf', width: 70, isCalc: false, bg: '#fee2e2' },
  { key: 'dormec', label: 'Dormec', width: 60, isCalc: false, bg: '#fee2e2' },
  { key: 'rel', label: 'Rel', width: 80, isCalc: false, bg: '#fee2e2' },
  { key: 'engsel', label: 'Engsel', width: 80, isCalc: false, bg: '#fee2e2' },
  { key: 'v', label: 'V', width: 80, isCalc: false, bg: '#fef3c7' },
  { key: 'v2', label: 'V2', width: 80, isCalc: false, bg: '#fef3c7' },
  { key: 'h', label: 'H', width: 80, isCalc: false, bg: '#fef3c7' },
  { key: 'anodize', label: 'Nama barang', width: 150, isCalc: false, bg: '#fef3c7' },
  { key: 'p_val', label: 'Panjang', width: 70, isCalc: false, bg: '#fef3c7' },
  { key: 'q_anodize', label: 'Jumlah', width: 70, isCalc: false, bg: '#fef3c7' },
  { key: 'x_sep', label: 'x', width: 30, isCalc: true, bg: '#f8fafc' },
  { key: 'v_lap', label: 'V lap', width: 50, isCalc: true, bg: '#f0fdf4' },
  { key: 'v_edg', label: 'V edg', width: 60, isCalc: true, bg: '#f0fdf4' },
  { key: 'desc_lap', label: 'Deskripsi lapisan', width: 160, isCalc: true, bg: '#f0fdf4' },
  { key: 'desc_edg', label: 'Deskripsi edging', width: 160, isCalc: true, bg: '#f0fdf4' },
  { key: 'desc_komp', label: 'Deskripsi Komponen', width: 200, isCalc: true, bg: '#ecfdf5' },
  { key: 'nama_komp', label: 'Nama Komponen', width: 250, isCalc: true, bg: '#ecfdf5' },
  { key: 'x_sep2', label: 'x', width: 30, isCalc: true, bg: '#f8fafc' },
  { key: 'minifix', label: 'Minifix', width: 60, isCalc: false, bg: '#fdf2f8' },
  { key: 'dowel', label: 'Dowel', width: 60, isCalc: false, bg: '#fdf2f8' },
  { key: 'q_siku', label: '@siku', width: 60, isCalc: true, bg: '#fdf2f8' },
  { key: 'q_screw', label: '@screw', width: 60, isCalc: true, bg: '#fdf2f8' },
  { key: 'q_dormec_total', label: 'Dormec', width: 60, isCalc: true, bg: '#fdf2f8' },
  { key: 'q_engsel_total', label: 'Engsel', width: 60, isCalc: true, bg: '#fdf2f8' },
  { key: 'q_rel_total', label: 'Rel', width: 60, isCalc: true, bg: '#fdf2f8' },
  { key: 'p_gross', label: 'P', width: 60, isCalc: true, bg: '#f0fdfa' },
  { key: 'l_gross', label: 'L', width: 60, isCalc: true, bg: '#f0fdfa' },
  { key: 'keliling', label: '2(P+L)', width: 70, isCalc: true, bg: '#f0fdfa' },
  { key: 'luas_gross', label: '(PxL)', width: 70, isCalc: true, bg: '#f0fdfa' },
  { key: 'bhn_dasar', label: 'Bahan Dasar', width: 100, isCalc: true, bg: '#e0f2fe' },
  { key: 'bhn_desc', label: 'Deskr', width: 180, isCalc: true, bg: '#e0f2fe' },
  { key: 'prop_harga', label: '/panel', width: 70, isCalc: true, bg: '#e0f2fe' },
  { key: 'q_anodize_std', label: 'jumlah anodize @', width: 110, isCalc: true, bg: '#f8fafc' },
  { key: 'q_minifix_total', label: 'minifix @', width: 70, isCalc: true, bg: '#f8fafc' },
  { key: 'q_dowel_total', label: 'dowel @', width: 70, isCalc: true, bg: '#f8fafc' },
  { key: 'q_siku_total', label: 'jml siku', width: 70, isCalc: true, bg: '#f8fafc' },
  { key: 'q_screw_total', label: 'jml screw', width: 70, isCalc: true, bg: '#f8fafc' },
  { key: 'area_m2', label: 'M²', width: 60, isCalc: true, bg: '#ecfdf5' },
  { key: 'vol_m3', label: 'M³', width: 60, isCalc: true, bg: '#ecfdf5' },
  { key: 't_p1', label: 'T_P1', width: 50, isCalc: true, bg: '#fffbeb' },
  { key: 't_p2', label: 'T_P2', width: 50, isCalc: true, bg: '#fffbeb' },
  { key: 't_l1', label: 'T_L1', width: 50, isCalc: true, bg: '#fffbeb' },
  { key: 't_l2', label: 'T_L2', width: 50, isCalc: true, bg: '#fffbeb' },
  { key: 'p_cnc', label: 'P_cnc', width: 60, isCalc: true, bg: '#f0fdf4' },
  { key: 'l_cnc', label: 'L_cnc', width: 60, isCalc: true, bg: '#f0fdf4' },
  { key: 'ukuran_cnc', label: 'ukuran CNC', width: 120, isCalc: true, bg: '#f0fdf4' },
  { key: 'csv_format', label: 'CSV Format', width: 240, isCalc: true, bg: '#f8fafc' }
];

const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ',
  'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX',
  'BY', 'BZ', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF'
];

export function SearchableCell({ value, resolvedValue, options, onSelect, fontWeight = 400, isRefMode = false, isEmpty = false }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 300 });

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (!editing) return;

    const update = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom,
          left: rect.left,
          width: Math.max(300, rect.width)
        });
      }
    };

    update();
    const timer = setTimeout(update, 50);

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [editing, show]);

  const startEditing = () => {
    setLocalValue(value);
    setEditing(true);
    setShow(true);
  };

  const displayValue = resolvedValue !== undefined ? resolvedValue : value;
  const filterText = (localValue === value || localValue === '...' || !localValue) ? '' : localValue.toString().toLowerCase();

  const safeOptions = React.useMemo(() => {
    if (!Array.isArray(options)) return [];
    return [...new Set(
      options.map(o => o !== null && o !== undefined ? o.toString().trim() : '')
    )].filter(o => o !== '');
  }, [options]);

  const filtered = safeOptions.filter(o => o.toLowerCase().includes(filterText)).slice(0, 15);

  if (editing) return (
    <div style={{ position: 'relative', zIndex: 9999 }} onMouseDown={e => isRefMode && e.preventDefault()}>
      <input
        ref={inputRef}
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
        <div style={{ position: 'fixed', top: coords.top + 2, left: coords.left, width: coords.width, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, zIndex: 100000, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', maxHeight: 200, overflowY: 'auto' }}>
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
      {isAlias ? `📎 ${displayValue}` : (isEmpty ? '' : (displayValue || '...'))}
    </div>
  );
}

function EditableCell({ item, idx, k, width, onUpdateRow, isRefMode, valueOverride }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(item[k] || '');

  useEffect(() => {
    setLocalValue(item[k] || '');
  }, [item[k]]);

  const commitEdit = () => {
    if (!editing) return;
    setEditing(false);
    if (localValue !== (item[k] || '')) {
      onUpdateRow(idx, k, localValue);
    }
  };

  const hasRealValue = item[k] !== undefined && item[k] !== null && item[k] !== '' && item[k] !== '...' && item[k] !== '(ks)';
  const displayVal = hasRealValue ? item[k] : (valueOverride !== undefined ? valueOverride : '');

  const displayLocalValue = (localValue === '...' || localValue === '(ks)') ? '' : localValue;
  const placeholderVal = valueOverride !== undefined && valueOverride !== '...' && valueOverride !== '(ks)' ? valueOverride : '...';

  if (editing) return (
    <input
      autoFocus
      style={{ ...s.inputMinimal, width: width || '100%', background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box', textAlign: 'inherit' }}
      value={displayLocalValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={e => e.key === 'Enter' && commitEdit()}
      placeholder={placeholderVal}
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

export function FormulaInput({ value, evaluated, onChange, onFocus, onBlur, isHeader = false, textAlign, onTempChange }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const isFormula = value?.toString().startsWith('=');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const commitEdit = () => {
    if (!editing) return;
    setEditing(false);
    if (localValue !== (value || '')) {
      onChange(localValue);
    }
    if (onBlur) onBlur();
  };

  const handleFocus = () => {
    if (editing) return;
    setEditing(true);
    if (onFocus) {
      setTimeout(() => {
        onFocus(setLocalValue);
      }, 0);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      commitEdit();
    }, 100);
  };

  const align = textAlign || (isHeader ? 'center' : 'right');
  const flexAlign = align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end';

  if (editing) return (
    <input
      autoFocus
      style={{ ...s.inputMinimal, background: 'transparent', border: 'none', outline: 'none', textAlign: align, boxSizing: 'border-box', width: '100%' }}
      value={localValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={e => {
        const val = e.target.value;
        setLocalValue(val);
        if (onTempChange) onTempChange(val);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          commitEdit();
        }
      }}
    />
  );

  const formatDisplayValue = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean') {
      if (Number.isInteger(num)) return String(num);
      const rounded = Math.round(num * 10) / 10;
      if (Number.isInteger(rounded)) return String(rounded);
      return String(rounded).replace('.', ',');
    }
    return val;
  };

  const displayEvaluated = (evaluated === undefined || evaluated === null || (typeof evaluated === 'number' && isNaN(evaluated)))
    ? ''
    : formatDisplayValue(evaluated);

  return (
    <div style={{ cursor: 'text', padding: '1px 2px', display: 'flex', flexDirection: 'column', alignItems: flexAlign, minHeight: isHeader ? 16 : 20, justifyContent: 'center' }} onDoubleClick={handleFocus}>
      <div style={{ fontSize: 12, fontWeight: 700, textAlign: align, color: isFormula ? '#2563eb' : '#111' }}>{displayEvaluated}</div>
      {isFormula && !isHeader && <div style={{ fontSize: 8, color: '#94a3b8', marginTop: -2, textAlign: align }}>{value}</div>}
    </div>
  );
}




const formatIndo2Digit = (val, key) => {
  if (val === undefined || val === null || val === '' || isNaN(val)) return '';
  const num = Number(val);
  
  // For luas_gross and prop_harga, if the value is 0, display as blank
  if ((key === 'luas_gross' || key === 'prop_harga') && num === 0) {
    return '';
  }
  
  if (num === 0) return '0';
  
  // Round to nearest 1 decimal place (1 decimal digit)
  const rounded = Math.round(num * 10) / 10;
  
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded).replace('.', ',');
};



const SharedModuleTableRow = React.memo(React.forwardRef(({
  item,
  items,
  rowsWithParent,
  rowIdx,
  rowOffset,
  isRefMode,
  selectedCoordInRow,
  refCoordsStr,
  parts,
  setupItems,
  spec,
  parent,
  showCNC,
  hplOptions,
  edgOptions,
  bhnOptions,
  onUpdateRow,
  onDeleteRow,
  onReorder,
  onCellClick,
  getCellRenderer,
  specAliases,
  calcResult,
}, ref) => {
  const rowNumber = (item._idx !== undefined ? item._idx : rowIdx + rowOffset) + 1;
  const handleCellClick = (col) => onCellClick && onCellClick(`${col}${rowNumber}`);
  // Pre-parse refCoords string (only coords relevant to this row)
  const refCoordsArr = refCoordsStr ? refCoordsStr.split(',') : [];
  const isSel = (col) => col !== 'A' && selectedCoordInRow === `${col}${rowNumber}`;
  const isRef = (col) => col !== 'A' && refCoordsArr.includes(`${col}${rowNumber}`);
  const isSetUp = item.type === 'Set_up';
  const centerCols = ['I', 'J', 'K', 'L', 'M', 'O', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR'];
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
      ref={ref}
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
      <td style={cellStyle('A', { background: '#f8fafc', borderRight: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 9, textAlign: 'center', fontWeight: 700 })}>{rowNumber}</td>
      <td style={cellStyle('A', { fontSize: 10, textAlign: 'center' })}>
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
        {getCellRenderer(item, rowIdx, 'no')}
      </td>
      <td style={cellStyle('G')} onMouseDown={(e) => handleMD(e, 'G')}><EditableCell item={item} idx={rowIdx} k="opt" onUpdateRow={onUpdateRow} isRefMode={isRefMode} /></td>
      <td className="has-dropdown" style={cellStyle('H')} onMouseDown={(e) => handleMD(e, 'H')}>
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
                  if (partMatch.val) {
                    updates.bid = partMatch.val;
                  }
                  if (partMatch.bhn) updates.bhn = partMatch.bhn;
                  if (partMatch.t !== undefined) updates.t_bhn = partMatch.t;
                  if (partMatch.code) updates.cat = partMatch.code;
                  if (partMatch.ks) updates.kode = partMatch.ks;
                  if (partMatch.opt !== undefined) updates.opt = partMatch.opt;

                  if (partMatch.l !== undefined) updates.l_fin = partMatch.l;
                  if (partMatch.d !== undefined) updates.d_fin = partMatch.d;
                  if (partMatch.p1 !== undefined) updates.p1 = partMatch.p1;
                  if (partMatch.p2 !== undefined) updates.p2 = partMatch.p2;
                  if (partMatch.l1 !== undefined) updates.l1 = partMatch.l1;
                  if (partMatch.l2 !== undefined) updates.l2 = partMatch.l2;

                  if (partMatch.lap_luar !== undefined) updates.lap_luar = partMatch.lap_luar;
                  if (partMatch.lap_dalam !== undefined) updates.lap_dalam = partMatch.lap_dalam;
                  if (partMatch.edg_p1 !== undefined) updates.edg_p1 = partMatch.edg_p1;
                  if (partMatch.edg_p2 !== undefined) updates.edg_p2 = partMatch.edg_p2;
                  if (partMatch.edg_l1 !== undefined) updates.edg_l1 = partMatch.edg_l1;
                  if (partMatch.edg_l2 !== undefined) updates.edg_l2 = partMatch.edg_l2;
                  if (partMatch.engsel !== undefined) updates.engsel = partMatch.engsel;
                  if (partMatch.rel !== undefined) updates.rel = partMatch.rel;
                  if (partMatch.q_dormec !== undefined) updates.dormec = partMatch.q_dormec > 0 ? String(partMatch.q_dormec) : '';
                  if (partMatch.q_engsel !== undefined) updates.q_engsel = partMatch.q_engsel;
                  if (partMatch.q_rel !== undefined) updates.q_rel = partMatch.q_rel;
                  if (partMatch.q_dormec !== undefined) updates.q_dormec = partMatch.q_dormec;
                  if (partMatch.q_minifix !== undefined) updates.q_minifix = partMatch.q_minifix;
                  if (partMatch.q_dowel !== undefined) updates.q_dowel = partMatch.q_dowel;
                  if (partMatch.tipe_siku !== undefined) updates.siku_joint = partMatch.tipe_siku;
                  if (partMatch.tipe_screw !== undefined) updates.screw_jf = partMatch.tipe_screw;
                  if (partMatch.profil3 !== undefined) updates.profil3 = partMatch.profil3;
                  if (partMatch.profil2 !== undefined) updates.profil2 = partMatch.profil2;
                  if (partMatch.profil !== undefined) updates.profil = partMatch.profil;
                  if (partMatch.v !== undefined) updates.v = partMatch.v;
                  if (partMatch.v2 !== undefined) updates.v2 = partMatch.v2;
                  if (partMatch.h !== undefined) updates.h = partMatch.h;
                  if (partMatch.anodize !== undefined) updates.anodize = partMatch.anodize;
                  if (partMatch.p_val !== undefined) updates.p_val = partMatch.p_val;
                  if (partMatch.q_anodize !== undefined) updates.q_anodize = partMatch.q_anodize;
                  if (partMatch.q_siku !== undefined) updates.q_siku = partMatch.q_siku;
                  if (partMatch.q_screw !== undefined) updates.q_screw = partMatch.q_screw;
                  if (partMatch.minifix !== undefined) updates.minifix = partMatch.minifix;
                  if (partMatch.dowel !== undefined) updates.dowel = partMatch.dowel;
                  const setupMatch = setupItems.find(s => s.name?.trim().toLowerCase() === cleanV.toLowerCase());
                  if (setupMatch && setupMatch.no !== undefined) updates.no = setupMatch.no; else updates.no = '';
                } else {
                  const smatch = setupItems.find(s => s.name?.trim().toLowerCase() === cleanV.toLowerCase());
                  if (smatch) {
                    if (smatch.ks) updates.kode = smatch.ks;
                    if (smatch.no !== undefined) updates.no = smatch.no;
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
      <td style={cellStyle('I')} onMouseDown={(e) => handleMD(e, 'I')}>{getCellRenderer(item, rowIdx, 'p')}</td>
      <td style={cellStyle('J')} onMouseDown={(e) => handleMD(e, 'J')}>{getCellRenderer(item, rowIdx, 'l')}</td>
      <td style={cellStyle('K')} onMouseDown={(e) => handleMD(e, 'K')}>{getCellRenderer(item, rowIdx, 't')}</td>
      <td style={cellStyle('L')} onMouseDown={(e) => handleMD(e, 'L')}>{getCellRenderer(item, rowIdx, 'sub')}</td>
      <td style={cellStyle('M')} onMouseDown={(e) => handleMD(e, 'M')}>{getCellRenderer(item, rowIdx, 'jml')}</td>
      <td className="has-dropdown" style={cellStyle('N', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'N')}>
        <SearchableCell
          value={item.bhn || ''}
          resolvedValue={resolveAlias(item.bhn, specAliases)}
          options={bhnOptions.length ? bhnOptions : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC']}
          onSelect={v => onUpdateRow(rowIdx, 'bhn', v)}
          isRefMode={isRefMode}
        />
      </td>
      <td style={cellStyle('O', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'O')}>{getCellRenderer(item, rowIdx, 't_bhn')}</td>
      <td style={cellStyle('P', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'P')}>{getCellRenderer(item, rowIdx, 'l_fin')}</td>
      <td style={cellStyle('Q', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'Q')}>{getCellRenderer(item, rowIdx, 'd_fin')}</td>
      <td style={cellStyle('R', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'R')}>{getCellRenderer(item, rowIdx, 'p1')}</td>
      <td style={cellStyle('S', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'S')}>{getCellRenderer(item, rowIdx, 'p2')}</td>
      <td style={cellStyle('T', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'T')}>{getCellRenderer(item, rowIdx, 'l1')}</td>
      <td style={cellStyle('U', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'U')}>{getCellRenderer(item, rowIdx, 'l2')}</td>
      <td className="has-dropdown" style={cellStyle('V', { background: '#dbeafe' })} onMouseDown={(e) => handleMD(e, 'V')}>
        {(() => {
          const lFinEval = evaluateFormula(item.l_fin, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases);
          const isLFinEmpty = isFinishingEmpty(lFinEval);
          let resolvedVal = '';
          if (!isLFinEmpty) {
            const lookupVal = resolveLapisanFromCode(lFinEval, spec?.categories || []);
            resolvedVal = lookupVal || '...';
          }
          return (
            <SearchableCell
              value={item.lap_luar || ''}
              resolvedValue={resolvedVal}
              options={hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos']}
              onSelect={v => onUpdateRow(rowIdx, 'lap_luar', v)}
              isRefMode={isRefMode}
              isEmpty={isLFinEmpty}
            />
          );
        })()}
      </td>
      <td style={cellStyle('W', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'W')}>{getCellRenderer(item, rowIdx, 't_luar')}</td>
      <td className="has-dropdown" style={cellStyle('X', { background: '#ede9fe' })} onMouseDown={(e) => handleMD(e, 'X')}>
        {(() => {
          const dFinEval = evaluateFormula(item.d_fin, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases);
          const isDFinEmpty = isFinishingEmpty(dFinEval);
          let resolvedVal = '';
          if (!isDFinEmpty) {
            const lookupVal = resolveLapisanFromCode(dFinEval, spec?.categories || []);
            resolvedVal = lookupVal || '...';
          }
          return (
            <SearchableCell
              value={item.lap_dalam || ''}
              resolvedValue={resolvedVal}
              options={['', ...(hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos'])]}
              onSelect={v => onUpdateRow(rowIdx, 'lap_dalam', v)}
              isRefMode={isRefMode}
              isEmpty={isDFinEmpty}
            />
          );
        })()}
      </td>
      <td style={cellStyle('Y', { background: '#f3e8ff' })} onMouseDown={(e) => handleMD(e, 'Y')}>{getCellRenderer(item, rowIdx, 't_dalam')}</td>
      <td className="has-dropdown" style={cellStyle('Z', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'Z')}>
        {(() => {
          // item.edg_p1 can be a raw formula from partsData (e.g. =IF(la...)).
          // Resolve it via specAliases first, then lookup edging name from the resulting code.
          const rawEdgP1 = item.edg_p1;
          const resolvedP1Code = (typeof rawEdgP1 === 'string' && rawEdgP1.startsWith('='))
            ? String(evaluateFormula(rawEdgP1, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases) ?? '').trim()
            : String(rawEdgP1 ?? '').trim();
          const resolvedP1Name = resolveEdgingFromCode(resolvedP1Code || evaluateFormula(item.p1, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases), item.cat, spec?.categories || []);
          return (
            <SearchableCell
              value={resolvedP1Code || rawEdgP1 || ''}
              resolvedValue={resolvedP1Name}
              options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
              onSelect={v => onUpdateRow(rowIdx, 'edg_p1', v)}
              isRefMode={isRefMode}
            />
          );
        })()}
      </td>
      <td className="has-dropdown" style={cellStyle('AA', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'AA')}>
        {(() => {
          const rawEdgP2 = item.edg_p2;
          const resolvedP2Code = (typeof rawEdgP2 === 'string' && rawEdgP2.startsWith('='))
            ? String(evaluateFormula(rawEdgP2, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases) ?? '').trim()
            : String(rawEdgP2 ?? '').trim();
          const resolvedP2Name = resolveEdgingFromCode(resolvedP2Code || evaluateFormula(item.p2, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases), item.cat, spec?.categories || []);
          return (
            <SearchableCell
              value={resolvedP2Code || rawEdgP2 || ''}
              resolvedValue={resolvedP2Name}
              options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
              onSelect={v => onUpdateRow(rowIdx, 'edg_p2', v)}
              isRefMode={isRefMode}
            />
          );
        })()}
      </td>
      <td className="has-dropdown" style={cellStyle('AB', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'AB')}>
        {(() => {
          const rawEdgL1 = item.edg_l1;
          const resolvedL1Code = (typeof rawEdgL1 === 'string' && rawEdgL1.startsWith('='))
            ? String(evaluateFormula(rawEdgL1, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases) ?? '').trim()
            : String(rawEdgL1 ?? '').trim();
          const resolvedL1Name = resolveEdgingFromCode(resolvedL1Code || evaluateFormula(item.l1, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases), item.cat, spec?.categories || []);
          return (
            <SearchableCell
              value={resolvedL1Code || rawEdgL1 || ''}
              resolvedValue={resolvedL1Name}
              options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
              onSelect={v => onUpdateRow(rowIdx, 'edg_l1', v)}
              isRefMode={isRefMode}
            />
          );
        })()}
      </td>
      <td className="has-dropdown" style={cellStyle('AC', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'AC')}>
        {(() => {
          const rawEdgL2 = item.edg_l2;
          const resolvedL2Code = (typeof rawEdgL2 === 'string' && rawEdgL2.startsWith('='))
            ? String(evaluateFormula(rawEdgL2, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases) ?? '').trim()
            : String(rawEdgL2 ?? '').trim();
          const resolvedL2Name = resolveEdgingFromCode(resolvedL2Code || evaluateFormula(item.l2, rowsWithParent, spec, parent, 0, setupItems, {}, specAliases), item.cat, spec?.categories || []);
          return (
            <SearchableCell
              value={resolvedL2Code || rawEdgL2 || ''}
              resolvedValue={resolvedL2Name}
              options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
              onSelect={v => onUpdateRow(rowIdx, 'edg_l2', v)}
              isRefMode={isRefMode}
            />
          );
        })()}
      </td>
      {(() => {
        const calc = calcResult;
        return EXTRA_COLUMNS.map((col, idx) => {
          const globalIdx = 30 + idx;
          if (!showCNC && globalIdx >= 44) return null;
          const colLetter = LETTERS[29 + idx];

          const handleMD = (e) => {
            if (isRefMode && !col.isCalc) e.preventDefault();
            handleCellClick(colLetter);
          };

          const isSel = selectedCoordInRow === `${colLetter}${rowNumber}`;
          const isRef = refCoordsArr.includes(`${colLetter}${rowNumber}`);

          const center = !['comp_name', 'comp_desc', 'bhn_desc', 'csv_format', 'desc_lap', 'desc_edg', 'anodize'].includes(col.key);

          const cStyle = {
            ...s.td,
            textAlign: center ? 'center' : 'left',
            background: col.bg || (item.type === 'Set_up' ? '#fefcbf' : 'transparent'),
            ...(isSel ? { outline: '2px solid #2563eb', outlineOffset: -2, zIndex: 10, position: 'relative' } : {}),
            ...(isRef && !isSel ? { outline: '2px dashed #10b981', outlineOffset: -2, background: '#ecfdf5', zIndex: 5, position: 'relative' } : {}),
          };

          if (col.key === 'x_sep' || col.key === 'x_sep2') {
            return <td key={col.key} style={cStyle}>x</td>;
          }

          if (col.isCalc) {
            const val = calc ? calc[col.key] : '';
            let formatted = '';
            if (['p_gross', 'l_gross', 'keliling', 'luas_gross', 'prop_harga'].includes(col.key)) {
              formatted = formatIndo2Digit(val, col.key);
            } else {
              formatted = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3)) : (val || '-');
            }
            return (
              <td key={col.key} style={cStyle} title={String(val || '')}>
                {formatted}
              </td>
            );
          }

          return (
            <td key={col.key} style={cStyle} onMouseDown={handleMD}>
              {getCellRenderer(item, rowIdx, col.key)}
            </td>
          );
        });
      })()}
      <td style={s.td}><button style={{ ...s.iconBtn, color: '#fca5a5' }} onClick={() => onDeleteRow(rowIdx)}>✕</button></td>
    </tr>
  );
}), (prevProps, nextProps) => {
  // Custom memo comparator — only re-render a row when its own data changes.
  // selectedCoordInRow and refCoordsStr are pre-filtered to this row only,
  // so changing selection in a different row won't trigger a re-render here.
  return (
    prevProps.item === nextProps.item &&
    prevProps.calcResult === nextProps.calcResult &&
    prevProps.selectedCoordInRow === nextProps.selectedCoordInRow &&
    prevProps.refCoordsStr === nextProps.refCoordsStr &&
    prevProps.isRefMode === nextProps.isRefMode &&
    prevProps.showCNC === nextProps.showCNC &&
    prevProps.specAliases === nextProps.specAliases
  );
});

function SharedModuleTable({
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
  refCoordsStr = '',
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
  const specAliases = useMemo(() => buildAliasMap(spec), [spec]);
  const refCoordsArr = useMemo(() => refCoordsStr ? refCoordsStr.split(',') : [], [refCoordsStr]);
  // Build rows array that includes parent at index 0, matching the flat breakdown array format
  // used by sync.js and ReportPage. This ensures cell refs like =I1 resolve to the parent row.
  const rowsWithParent = useMemo(
    () => (parent && Object.keys(parent).length > 0 ? [parent, ...items] : items),
    [parent, items]
  );

  // Pre-compute calcBreakdownItem for every row once.
  // This moves the heavy formula work out of each row render,
  // so row React.memo can skip re-rendering untouched rows.
  const calcResults = useMemo(() => {
    const specWithSetup = { ...spec, setupItems };
    return items.map(item =>
      calcBreakdownItem(item, rowsWithParent, specWithSetup, parent)
    );
  }, [items, rowsWithParent, spec, parent, setupItems]);

  const [widths, setWidths] = useState([
    30,  // Row index column
    35,  // Column A: #
    45,  // Column B: Cat
    90,  // Column C: Type
    45,  // Column D: Kod
    45,  // Column E: Tpk
    45,  // Column F: No*
    30,  // Column G: Opt
    400, // Column H: Komponen
    75,  // Column I: P
    75,  // Column J: L
    40,  // Column K: T
    40,  // Column L: Sub
    40,  // Column M: Jml
    60,  // Column N: Bhn
    45,  // Column O: T.Bhn
    45,  // Column P: L
    45,  // Column Q: D
    45,  // Column R: P1
    45,  // Column S: P2
    45,  // Column T: L1
    45,  // Column U: L2
    120, // Column V: Luar
    35,  // Column W: T.Luar
    120, // Column X: Dalam
    35,  // Column Y: T.Dlm
    110, // Column Z: Edg P1
    110, // Column AA: Edg P2
    110, // Column AB: Edg L1
    110, // Column AC: Edg L2
    
    // EXTRA_COLUMNS (index 30 to 80):
    100, // Column AD: Profil 3
    100, // Column AE: Profil 2
    100, // Column AF: Profil
    60,  // Column AG: Siku joint
    60,  // Column AH: Screw Jf
    60,  // Column AI: Dormec ind
    80,  // Column AJ: Rel ind
    80,  // Column AK: Engsel ind
    80,  // Column AL: V ind
    80,  // Column AM: V2 ind
    80,  // Column AN: H ind
    150, // Column AO: Nama barang (anodize)
    70,  // Column AP: Panjang (anodize)
    70,  // Column AQ: Jumlah (anodize)
    30,  // Column AR: x pemisah
    50,  // Column AS: V lap
    60,  // Column AT: V edg
    160, // Column AU: Deskripsi lapisan
    160, // Column AV: Deskripsi edging
    200, // Column AW: Deskripsi Komponen
    250, // Column AX: Nama Komponen
    30,  // Column AY: x pemisah 2
    60,  // Column AZ: Minifix standard
    60,  // Column BA: Dowel standard
    60,  // Column BB: @siku
    60,  // Column BC: @screw
    60,  // Column BD: Dormec total
    60,  // Column BE: Engsel total
    60,  // Column BF: Rel total
    60,  // Column BG: P Gross
    60,  // Column BH: L Gross
    70,  // Column BI: 2(P+L)
    70,  // Column BJ: (PxL)
    100, // Column BK: Bahan Dasar
    180, // Column BL: Deskripsi Bahan
    70,  // Column BM: /panel
    110, // Column BN: jumlah anodize @
    70,  // Column BO: minifix @
    70,  // Column BP: dowel @
    70,  // Column BQ: jml siku
    70,  // Column BR: jml screw
    60,  // Column BS: M²
    60,  // Column BT: M³
    50,  // Column BU: T_P1
    50,  // Column BV: T_P2
    50,  // Column BW: T_L1
    50,  // Column BX: T_L2
    60,  // Column BY: P_cnc
    60,  // Column BZ: L_cnc
    120, // Column CA: ukuran CNC
    240, // Column CB: CSV Format
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
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };


  const defaultRenderCell = (item, idx, key, isHeader = false) => {
    const rowNum = (item._idx !== undefined ? item._idx : idx + rowOffset) + 1;
    const colLetter = getColLetter(key);
    const coord = `${colLetter}${rowNum}`;
    const centerCols = ['F', 'I', 'J', 'K', 'L', 'M', 'O', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR'];
    const textAlign = centerCols.includes(colLetter) ? 'center' : (isHeader ? 'center' : 'right');

    // Pass pre-built specAliases to avoid rebuilding inside evaluateFormula
    let evaluatedVal = evaluateFormula(item[key], rowsWithParent, spec, isHeader ? {} : parent, 0, setupItems, {}, specAliases);

    // Auto-derive dynamic lookup values for hardware, profiling, anodizing from partsData
    const lookupKeys = ['profil3', 'profil2', 'profil', 'siku_joint', 'screw_jf', 'dormec', 'rel', 'engsel', 'v', 'v2', 'h', 'anodize', 'minifix', 'dowel'];
    if (!isHeader && (!item[key] || item[key] === '...') && lookupKeys.includes(key)) {
      const compName = evaluateFormula(item.komp, rowsWithParent, spec, isHeader ? {} : parent, 0, setupItems, {}, specAliases);
      const defaultVal = getPartDefaultValue(compName, key);
      if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') {
        evaluatedVal = defaultVal;
      }
    }

    if (!isHeader && key === 'no') {
      const compName = evaluateFormula(item.komp, rowsWithParent, spec, isHeader ? {} : parent, 0, setupItems, {}, specAliases);
      const setupMatch = setupItems.find(s => s.name?.trim().toLowerCase() === compName?.trim().toLowerCase());
      if (setupMatch) {
        evaluatedVal = setupMatch.no;
      } else {
        evaluatedVal = item.no || '...';
      }
    }

    // Auto-derive dynamic thickness for empty finishing layer thickness cells
    if (!isHeader && (!item[key] || item[key] === '...')) {
      if (key === 't_luar') {
        const lFinEval = evaluateFormula(item.l_fin, rowsWithParent, spec, isHeader ? {} : parent, 0, setupItems, {}, specAliases);
        let resolvedLapLuar = '';
        if (!isFinishingEmpty(lFinEval)) {
          resolvedLapLuar = resolveLapisanFromCode(lFinEval, spec?.categories || []) || '';
        }
        if (resolvedLapLuar) {
          evaluatedVal = getFinishingThickness(resolveAlias(resolvedLapLuar, specAliases), spec?.categories || []);
        }
      } else if (key === 't_dalam') {
        const dFinEval = evaluateFormula(item.d_fin, rowsWithParent, spec, isHeader ? {} : parent, 0, setupItems, {}, specAliases);
        let resolvedLapDalam = '';
        if (!isFinishingEmpty(dFinEval)) {
          resolvedLapDalam = resolveLapisanFromCode(dFinEval, spec?.categories || []) || '';
        }
        if (resolvedLapDalam) {
          evaluatedVal = getFinishingThickness(resolveAlias(resolvedLapDalam, specAliases), spec?.categories || []);
        }
      }
    }

    return (
      <FormulaInput
        value={item[key]}
        isHeader={isHeader}
        textAlign={textAlign}
        evaluated={evaluatedVal}
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

  const getCellRenderer = useCallback((item, idx, key, isHeader = false) => {
    if (renderCustomCell) return renderCustomCell(item, idx, key);
    return defaultRenderCell(item, idx, key, isHeader);
  }, [renderCustomCell, rowsWithParent, spec, parent, setupItems, specAliases, onCellClick, onUpdateRow, onUpdateParent]);



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
        .bom-table tbody tr:focus-within {
          position: relative !important;
          z-index: 1000 !important;
        }
        .bom-table tbody tr td.has-dropdown:focus-within {
          position: relative !important;
          z-index: 1001 !important;
          overflow: visible !important;
        }
      `}</style>
      {(() => {
        const tableWidth = widths.reduce((acc, w, idx) => {
          if (!showCNC && idx >= 44 && idx < widths.length - 1) return acc;
          return acc + w;
        }, 0);
        return (
          <table className="bom-table" style={{ ...s.table, border: 'none', tableLayout: 'fixed', minWidth: tableWidth, width: tableWidth }}>
            <colgroup>
              {widths.map((w, idx) => {
                if (!showCNC && idx >= 44 && idx < widths.length - 1) return null;
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
                {LETTERS.map((letter, i) => {
                  if (!showCNC && i >= 43) return null; // hide letters AR to CF (indexes 43 to 79)
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
                {/* Dynamically render extra columns */}
                {EXTRA_COLUMNS.map((col, idx) => {
                  const globalIdx = 30 + idx;
                  if (!showCNC && globalIdx >= 44) return null;
                  return (
                    <th
                      key={col.key}
                      style={{
                        ...s.th,
                        background: col.bg,
                        textAlign: col.key.startsWith('nama') || col.key.startsWith('desc') || col.key.startsWith('csv') || col.key.startsWith('bhn') ? 'left' : 'center',
                        fontSize: col.label.length > 10 ? 9 : 10
                      }}
                    >
                      {col.label}
                    </th>
                  );
                })}
                <th style={{ ...s.th }}></th>
              </tr>
            </thead>
            <tbody>
              {parent && Object.keys(parent).length > 0 && (() => {
                const rowsWithParent = [parent, ...items];
                const calc = (parent.komp || parent.modul) ? calcBreakdownItem(parent, rowsWithParent, spec, {}) : null;
                const parentRowNumber = (parent._idx !== undefined ? parent._idx : 0) + 1;
                const handleCellClick = (col) => onCellClick && onCellClick(`${col}${parentRowNumber}`);
                const isSel = (col) => col !== 'A' && selectedCoord === `${col}${parentRowNumber}`;
                const isRef = (col) => col !== 'A' && refCoordsArr.includes(`${col}${parentRowNumber}`);
                const centerCols = ['I', 'J', 'K', 'L', 'M', 'O', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR'];
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
                    <td style={cellStyle('A')}>
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
                    <td style={cellStyle('G')} onMouseDown={(e) => handleMD(e, 'G')}>
                      <EditableCell item={parent} idx={-1} k="opt" onUpdateRow={(idx, k, val) => onUpdateParent(k, val)} isRefMode={isRefMode} />
                    </td>
                    <td className="has-dropdown" style={cellStyle('H')} onMouseDown={(e) => handleMD(e, 'H')}>
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
                    <td style={cellStyle('I')} onMouseDown={(e) => handleMD(e, 'I')}>{getCellRenderer(parent, -1, 'p', true)}</td>
                    <td style={cellStyle('J')} onMouseDown={(e) => handleMD(e, 'J')}>{getCellRenderer(parent, -1, 'l', true)}</td>
                    <td style={cellStyle('K')} onMouseDown={(e) => handleMD(e, 'K')}>{getCellRenderer(parent, -1, 't', true)}</td>
                    <td style={cellStyle('L')} onMouseDown={(e) => handleMD(e, 'L')}>{getCellRenderer(parent, -1, 'sub', true)}</td>
                    <td style={cellStyle('M')} onMouseDown={(e) => handleMD(e, 'M')}>{getCellRenderer(parent, -1, 'jml', true)}</td>
                    <td className="has-dropdown" style={cellStyle('N', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'N')}>
                      <SearchableCell
                        value={parent.bhn || ''}
                        resolvedValue={resolveAlias(parent.bhn, specAliases)}
                        options={bhnOptions.length ? bhnOptions : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC']}
                        onSelect={v => onUpdateParent('bhn', v)}
                        isRefMode={isRefMode}
                      />
                    </td>
                    <td style={cellStyle('O', { background: '#e0f2fe' })} onMouseDown={(e) => handleMD(e, 'O')}>{getCellRenderer(parent, -1, 't_bhn', true)}</td>
                    <td style={cellStyle('P', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'P')}>{getCellRenderer(parent, -1, 'l_fin', true)}</td>
                    <td style={cellStyle('Q', { background: '#fffbeb' })} onMouseDown={(e) => handleMD(e, 'Q')}>{getCellRenderer(parent, -1, 'd_fin', true)}</td>
                    <td style={cellStyle('R', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'R')}>{getCellRenderer(parent, -1, 'p1', true)}</td>
                    <td style={cellStyle('S', { background: '#f0fdf4' })} onMouseDown={(e) => handleMD(e, 'S')}>{getCellRenderer(parent, -1, 'p2', true)}</td>
                    <td style={cellStyle('T', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'T')}>{getCellRenderer(parent, -1, 'l1', true)}</td>
                    <td style={cellStyle('U', { background: '#fff7ed' })} onMouseDown={(e) => handleMD(e, 'U')}>{getCellRenderer(parent, -1, 'l2', true)}</td>
                    <td className="has-dropdown" style={cellStyle('V', { background: '#dbeafe' })} onMouseDown={(e) => handleMD(e, 'V')}>
                      {(() => {
                        const lFinEval = evaluateFormula(parent.l_fin, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases);
                        const isLFinEmpty = isFinishingEmpty(lFinEval);
                        let resolvedVal = '';
                        if (!isLFinEmpty) {
                          const lookupVal = resolveLapisanFromCode(lFinEval, spec?.categories || []);
                          resolvedVal = lookupVal || '...';
                        }
                        return (
                          <SearchableCell
                            value={parent.lap_luar || ''}
                            resolvedValue={resolvedVal}
                            options={hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos']}
                            onSelect={v => onUpdateParent('lap_luar', v)}
                            isRefMode={isRefMode}
                            isEmpty={isLFinEmpty}
                          />
                        );
                      })()}
                    </td>
                    <td style={cellStyle('W', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'W')}>{getCellRenderer(parent, -1, 't_luar', true)}</td>
                    <td className="has-dropdown" style={cellStyle('X', { background: '#ede9fe' })} onMouseDown={(e) => handleMD(e, 'X')}>
                      {(() => {
                        const dFinEval = evaluateFormula(parent.d_fin, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases);
                        const isDFinEmpty = isFinishingEmpty(dFinEval);
                        let resolvedVal = '';
                        if (!isDFinEmpty) {
                          const lookupVal = resolveLapisanFromCode(dFinEval, spec?.categories || []);
                          resolvedVal = lookupVal || '...';
                        }
                        return (
                          <SearchableCell
                            value={parent.lap_dalam || ''}
                            resolvedValue={resolvedVal}
                            options={['', ...(hplOptions.length ? hplOptions : ['HB_41130', 'Aica', 'DSK_5450_SM', 'Polos'])]}
                            onSelect={v => onUpdateParent('lap_dalam', v)}
                            isRefMode={isRefMode}
                            isEmpty={isDFinEmpty}
                          />
                        );
                      })()}
                    </td>
                    <td style={cellStyle('Y', { background: '#f3e8ff' })} onMouseDown={(e) => handleMD(e, 'Y')}>{getCellRenderer(parent, -1, 't_dalam', true)}</td>
                    <td className="has-dropdown" style={cellStyle('Z', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'Z')}>
                      {(() => {
                        const rawEdgP1 = parent.edg_p1;
                        const resolvedP1Code = (typeof rawEdgP1 === 'string' && rawEdgP1.startsWith('='))
                          ? String(evaluateFormula(rawEdgP1, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases) ?? '').trim()
                          : String(rawEdgP1 ?? '').trim();
                        const resolvedP1Name = resolveEdgingFromCode(resolvedP1Code || evaluateFormula(parent.p1, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases), parent.cat, spec?.categories || []);
                        return (
                          <SearchableCell
                            value={resolvedP1Code || rawEdgP1 || ''}
                            resolvedValue={resolvedP1Name}
                            options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                            onSelect={v => onUpdateParent('edg_p1', v)}
                            isRefMode={isRefMode}
                          />
                        );
                      })()}
                    </td>
                    <td className="has-dropdown" style={cellStyle('AA', { background: '#dcfce7' })} onMouseDown={(e) => handleMD(e, 'AA')}>
                      {(() => {
                        const rawEdgP2 = parent.edg_p2;
                        const resolvedP2Code = (typeof rawEdgP2 === 'string' && rawEdgP2.startsWith('='))
                          ? String(evaluateFormula(rawEdgP2, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases) ?? '').trim()
                          : String(rawEdgP2 ?? '').trim();
                        const resolvedP2Name = resolveEdgingFromCode(resolvedP2Code || evaluateFormula(parent.p2, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases), parent.cat, spec?.categories || []);
                        return (
                          <SearchableCell
                            value={resolvedP2Code || rawEdgP2 || ''}
                            resolvedValue={resolvedP2Name}
                            options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                            onSelect={v => onUpdateParent('edg_p2', v)}
                            isRefMode={isRefMode}
                          />
                        );
                      })()}
                    </td>
                    <td className="has-dropdown" style={cellStyle('AB', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'AB')}>
                      {(() => {
                        const rawEdgL1 = parent.edg_l1;
                        const resolvedL1Code = (typeof rawEdgL1 === 'string' && rawEdgL1.startsWith('='))
                          ? String(evaluateFormula(rawEdgL1, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases) ?? '').trim()
                          : String(rawEdgL1 ?? '').trim();
                        const resolvedL1Name = resolveEdgingFromCode(resolvedL1Code || evaluateFormula(parent.l1, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases), parent.cat, spec?.categories || []);
                        return (
                          <SearchableCell
                            value={resolvedL1Code || rawEdgL1 || ''}
                            resolvedValue={resolvedL1Name}
                            options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                            onSelect={v => onUpdateParent('edg_l1', v)}
                            isRefMode={isRefMode}
                          />
                        );
                      })()}
                    </td>
                    <td className="has-dropdown" style={cellStyle('AC', { background: '#fef9c3' })} onMouseDown={(e) => handleMD(e, 'AC')}>
                      {(() => {
                        const rawEdgL2 = parent.edg_l2;
                        const resolvedL2Code = (typeof rawEdgL2 === 'string' && rawEdgL2.startsWith('='))
                          ? String(evaluateFormula(rawEdgL2, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases) ?? '').trim()
                          : String(rawEdgL2 ?? '').trim();
                        const resolvedL2Name = resolveEdgingFromCode(resolvedL2Code || evaluateFormula(parent.l2, rowsWithParent, spec, {}, 0, setupItems, {}, specAliases), parent.cat, spec?.categories || []);
                        return (
                          <SearchableCell
                            value={resolvedL2Code || rawEdgL2 || ''}
                            resolvedValue={resolvedL2Name}
                            options={['', ...(edgOptions.length ? edgOptions : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'])]}
                            onSelect={v => onUpdateParent('edg_l2', v)}
                            isRefMode={isRefMode}
                          />
                        );
                      })()}
                    </td>
                    {EXTRA_COLUMNS.map((col, idx) => {
                      const globalIdx = 30 + idx;
                      if (!showCNC && globalIdx >= 44) return null;
                      const colLetter = LETTERS[29 + idx]; // AD is at index 29 in LETTERS

                      const handleMD = (e) => {
                        if (isRefMode && !col.isCalc) e.preventDefault();
                        handleCellClick(colLetter);
                      };

                      const isSel = selectedCoord === `${colLetter}${parentRowNumber}`;
                      const isRef = refCoordsArr.includes(`${colLetter}${parentRowNumber}`);

                      const center = !['comp_name', 'comp_desc', 'bhn_desc', 'csv_format', 'desc_lap', 'desc_edg', 'anodize'].includes(col.key);

                      const cStyle = {
                        ...s.td,
                        textAlign: center ? 'center' : 'left',
                        background: col.bg || parentBg,
                        ...(isSel ? { outline: '2px solid #2563eb', outlineOffset: -2, zIndex: 10, position: 'relative' } : {}),
                        ...(isRef && !isSel ? { outline: '2px dashed #10b981', outlineOffset: -2, background: '#ecfdf5', zIndex: 5, position: 'relative' } : {}),
                      };

                      if (col.key === 'x_sep' || col.key === 'x_sep2') {
                        return <td key={col.key} style={cStyle}>x</td>;
                      }

                      if (col.isCalc) {
                        const val = calc ? calc[col.key] : '';
                        let formatted = '';
                        if (['p_gross', 'l_gross', 'keliling', 'luas_gross', 'prop_harga'].includes(col.key)) {
                          formatted = formatIndo2Digit(val, col.key);
                        } else {
                          formatted = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(3)) : (val || '-');
                        }
                        return (
                          <td key={col.key} style={cStyle} title={String(val || '')}>
                            {formatted}
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} style={cStyle} onMouseDown={handleMD}>
                          {getCellRenderer(parent, -1, col.key, true)}
                        </td>
                      );
                    })}
                    <td style={s.td}></td>
                  </tr>
                );
              })()}
              {items.map((item, rowIdx) => {
                const rowNumber = (item._idx !== undefined ? item._idx : rowIdx + rowOffset) + 1;
                const rowNumStr = String(rowNumber);
                const selectedCoordInRow = (selectedCoord && selectedCoord.match(/(\d+)$/)?.[1] === rowNumStr)
                  ? selectedCoord : null;
                const refCoordsStrForRow = refCoordsArr.length
                  ? refCoordsArr.filter(c => c.match(/(\d+)$/)?.[1] === rowNumStr).join(',')
                  : '';
                return (
                  <SharedModuleTableRow
                    key={item.id || rowIdx}
                    item={item}
                    items={items}
                    rowsWithParent={rowsWithParent}
                    rowIdx={rowIdx}
                    rowOffset={rowOffset}
                    isRefMode={isRefMode}
                    selectedCoordInRow={selectedCoordInRow}
                    refCoordsStr={refCoordsStrForRow}
                    parts={parts}
                    setupItems={setupItems}
                    spec={spec}
                    parent={parent}
                    showCNC={showCNC}
                    hplOptions={hplOptions}
                    edgOptions={edgOptions}
                    bhnOptions={bhnOptions}
                    onUpdateRow={onUpdateRow}
                    onDeleteRow={onDeleteRow}
                    onReorder={onReorder}
                    onCellClick={onCellClick}
                    getCellRenderer={getCellRenderer}
                    specAliases={specAliases}
                    calcResult={calcResults[rowIdx]}
                  />
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
                  {renderParentCell('p', 'I')}
                  {renderParentCell('l', 'J')}
                  {renderParentCell('t', 'K')}
                  <div style={{ marginLeft: 8, display: 'flex' }}>
                    {renderParentCell('sub', 'L')}
                    {renderParentCell('jml', 'M')}
                  </div>
                  <div style={{ marginLeft: 8, display: 'flex', gap: 2, background: '#fffbeb', borderRadius: 4, padding: '0 4px' }}>
                    {renderParentCell('l_fin', 'P')}
                    {renderParentCell('d_fin', 'Q')}
                  </div>
                  <div style={{ marginLeft: 4, display: 'flex', gap: 2, background: '#f0fdf4', borderRadius: 4, padding: '0 4px' }}>
                    {renderParentCell('p1', 'R')}
                    {renderParentCell('p2', 'S')}
                  </div>
                  <div style={{ marginLeft: 4, display: 'flex', gap: 2, background: '#fff7ed', borderRadius: 4, padding: '0 4px' }}>
                    {renderParentCell('l1', 'T')}
                    {renderParentCell('l2', 'U')}
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

const MemoizedSharedModuleTable = React.memo(SharedModuleTable, (prevProps, nextProps) => {
  return (
    arraysEqual(prevProps.items, nextProps.items) &&
    objectsEqual(prevProps.parent, nextProps.parent) &&
    prevProps.selectedCoord === nextProps.selectedCoord &&
    prevProps.refCoordsStr === nextProps.refCoordsStr &&
    prevProps.isRefMode === nextProps.isRefMode &&
    prevProps.showCNC === nextProps.showCNC &&
    prevProps.sectionType === nextProps.sectionType &&
    prevProps.spec === nextProps.spec &&
    prevProps.parts === nextProps.parts &&
    prevProps.setupItems === nextProps.setupItems &&
    prevProps.hplOptions === nextProps.hplOptions &&
    prevProps.edgOptions === nextProps.edgOptions &&
    prevProps.bhnOptions === nextProps.bhnOptions &&
    prevProps.moduls === nextProps.moduls &&
    prevProps.badgeText === nextProps.badgeText &&
    prevProps.badgeColor === nextProps.badgeColor &&
    prevProps.badgeBg === nextProps.badgeBg &&
    prevProps.hideHeaderRow === nextProps.hideHeaderRow &&
    prevProps.hideCardFrame === nextProps.hideCardFrame
  );
});

export default MemoizedSharedModuleTable;