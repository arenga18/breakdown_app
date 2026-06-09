import React, { useState, useMemo, useCallback, useRef } from 'react';
import { s, Badge, Modal } from './UI';
import { evaluateFormula, shiftTemplateFormulas, adjustFormulasOnShift } from '../utils/calc';
import { buildNamedRanges } from '../utils/buildNamedRanges';
import { COL_MAP, getColLetter } from '../utils/colMap';
import ModuleEditor from './ModuleEditor';
import { FormulaInput } from './SharedModuleTable';
import { resolveLapisanFromCode, getFinishingThickness, isFinishingEmpty } from '../utils/breakdownCalc';
import { resolveAlias, buildAliasMap } from '../utils/resolveAlias';
import VariablesPanel from './VariablesPanel';

function FormulaBar({ selectedCoord, value, onChange, onApply, onCancel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e2e8f0', height: 36, flexShrink: 0 }}>
      <div style={{ width: 60, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#2563eb', background: '#f8fafc' }}>
        {selectedCoord || ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', borderRight: '1px solid #e2e8f0', padding: '0 4px' }}>
        <button
          onClick={onCancel}
          disabled={!selectedCoord}
          style={{ border: 'none', background: 'transparent', padding: '6px 8px', cursor: selectedCoord ? 'pointer' : 'default', color: '#ef4444', opacity: selectedCoord ? 1 : 0.3, display: 'flex', alignItems: 'center' }}
          title="Cancel (Esc)"
        >
          <span style={{ fontSize: 16 }}>✕</span>
        </button>
        <button
          onClick={onApply}
          disabled={!selectedCoord}
          style={{ border: 'none', background: 'transparent', padding: '6px 8px', cursor: selectedCoord ? 'pointer' : 'default', color: '#10b981', opacity: selectedCoord ? 1 : 0.3, display: 'flex', alignItems: 'center' }}
          title="Apply (Enter)"
        >
          <span style={{ fontSize: 16 }}>✓</span>
        </button>
      </div>
      <div style={{ width: 40, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0', fontSize: 16, fontStyle: 'italic', color: '#94a3b8', fontFamily: 'serif', fontWeight: 'bold' }}>
        fx
      </div>
      <input
        style={{ flex: 1, height: '100%', padding: '0 12px', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'monospace' }}
        disabled={!selectedCoord}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={selectedCoord ? "Masukkan rumus atau nilai..." : ""}
        onKeyDown={e => {
          if (e.key === 'Enter') onApply();
          if (e.key === 'Escape') onCancel();
        }}
      />
    </div>
  );
}

const emptyRow = {
  bid: '...', cat: '', type: '', kode: 'KS', no: '', modul: '', komp: '',
  p: 0, l: 0, t: 18, sub: 1, jml: 1, bhn: 'Ply', proses: '',
  l_fin: '', d_fin: '', p1: '', p2: '', l1: '', l2: '',
  // Fase 1 — Spesifikasi Material & Lapisan
  t_bhn: 18, jml_muka: 1,
  lap_luar: '', lap_dalam: '',
  t_luar: 0,        // jumlah muka luar
  t_dalam: 0,       // tebal lapisan dalam (mm)
  opt: 0,           // opsi bahan (kolom F)
  edg_p1: '', edg_p2: '', edg_l1: '', edg_l2: '',
  // Edging thickness (auto dari nama) — read-only
  t_p1: 0, t_p2: 0, t_l1: 0, t_l2: 0,
  q_engsel: 0, q_rel: 0, q_dormec: 0, q_minifix: 0, q_dowel: 0,
  q_siku: 0,        // Qty siku joint
  q_screw: 0,       // Qty screw joint frame
  isParent: false
};

export default function BreakdownPage({ data, parts, moduls = [], subModuls = [], spec = {}, sections = [], setupItems = [], categories = [], onChange, onVariableClick }) {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [modulSearchQuery, setModulSearchQuery] = useState('');
  const [showSpecRef, setShowSpecRef] = useState(false);
  const [activeInput, setActiveInput] = useState(null); // { value, setter, coord }
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [selectedCell, setSelectedCell] = useState(null); // { itemIdx, key }
  const originalValueRef = useRef('');

  // Refs to make callbacks stable and prevent stale closure issues
  const dataRef = useRef(data);
  dataRef.current = data;

  const activeInputRef = useRef(activeInput);
  activeInputRef.current = activeInput;

  const selectedCoordRef = useRef(selectedCoord);
  selectedCoordRef.current = selectedCoord;

  const formulaBarValueRef = useRef(formulaBarValue);
  formulaBarValueRef.current = formulaBarValue;

  const selectedCellRef = useRef(selectedCell);
  selectedCellRef.current = selectedCell;

  // Derive dropdown options from stock data filtered by kat
  const stockData = spec.stock || [];
  const hplOptions = useMemo(() => {
    const hplStock = stockData.filter(s => (s.kat || '').toLowerCase() === 'hpl');
    if (hplStock.length > 0) return hplStock.map(s => s.nama || s.kode || '');
    // fallback to categories if no stock found
    const catLuar = categories.find(c => c.code === 'lap_luar');
    const catDalam = categories.find(c => c.code === 'lap_dalam');
    const luarItems = catLuar ? catLuar.items : ['HB_41130', 'Aica', 'DSK_5450_SM', 'SK_10455_UW', 'GM_86', 'DXP_5342_XM', 'Duco', 'Polos'];
    const dalamItems = catDalam ? catDalam.items : ['HB_41130', 'Aica', 'Melanor', 'Polos'];
    const luarNames = luarItems.map(x => typeof x === 'string' ? x : x.name || '');
    const dalamNames = dalamItems.map(x => typeof x === 'string' ? x : x.name || '');
    return [...new Set([...luarNames, ...dalamNames])];
  }, [stockData, categories]);

  const edgOptions = useMemo(() => {
    const edgStock = stockData.filter(s => (s.kat || '').toLowerCase() === 'edg');
    if (edgStock.length > 0) return edgStock.map(s => s.nama || s.kode || '');
    // fallback to categories if no stock found
    const cat = categories.find(c => c.code === 'edg');
    const items = cat ? cat.items : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'];
    return items.map(x => typeof x === 'string' ? x : x.name || '');
  }, [stockData, categories]);

  const bhnOptions = useMemo(() => {
    const cat = categories.find(c => c.code === 'bhn');
    const items = cat ? cat.items : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC'];
    return items.map(x => typeof x === 'string' ? x : x.name || '');
  }, [categories]);

  // Build named ranges (defined names) from categories for formula evaluation
  const namedRanges = useMemo(() => buildNamedRanges(categories), [categories]);

  // Pre-build alias map once per spec change
  const specAliases = useMemo(() => buildAliasMap(spec), [spec]);

  // Extract referenced coords from active formula for visual indicators
  const refCoords = useMemo(() => {
    if (!activeInput || !activeInput.value?.toString().startsWith('=')) return [];
    const matches = activeInput.value.toString().match(/(?:[A-Z]{1,2})\d+/g);
    return matches || [];
  }, [activeInput]);

  const handleCellClick = useCallback((coord) => {
    const formulaBarValue = formulaBarValueRef.current;
    const selectedCoord = selectedCoordRef.current;
    const activeInput = activeInputRef.current;

    // Reference insertion logic
    const isFormulaBarEditing = formulaBarValue?.toString().startsWith('=');
    if (isFormulaBarEditing && selectedCoord && selectedCoord !== coord) {
      const lastChar = formulaBarValue.toString().slice(-1);
      if (['+', '-', '*', '/', '(', '='].includes(lastChar)) {
        const newVal = formulaBarValue + coord;
        setFormulaBarValue(newVal);
        if (activeInput && activeInput.coord === selectedCoord) {
          activeInput.setter(newVal);
        }
        return; // Stay on current cell
      }
    }

    setSelectedCoord(coord);

    // Find item and key from coord
    const match = coord.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    const colLetter = match[1];
    const rowNum = parseInt(match[2]);
    const itemIdx = rowNum - 2;
    const item = dataRef.current[itemIdx];

    if (item) {
      const key = COL_MAP[colLetter];
      if (key) {
        setSelectedCell({ itemIdx, key });
        const val = item[key] !== undefined && item[key] !== null ? item[key] : '';
        setFormulaBarValue(val);
        originalValueRef.current = val;
      } else {
        setSelectedCell(null);
        setFormulaBarValue('');
        originalValueRef.current = '';
      }
    }
  }, []);

  const handleFormulaBarApply = useCallback(() => {
    const selectedCell = selectedCellRef.current;
    if (!selectedCell) return;
    const { itemIdx, key } = selectedCell;
    const next = [...dataRef.current];
    next[itemIdx] = { ...next[itemIdx], [key]: formulaBarValueRef.current };
    onChange(next);
    originalValueRef.current = formulaBarValueRef.current;
    setActiveInput(null);
  }, [onChange]);

  const handleFormulaBarCancel = useCallback(() => {
    const selectedCell = selectedCellRef.current;
    if (!selectedCell) return;
    const { itemIdx, key } = selectedCell;
    const next = [...dataRef.current];
    next[itemIdx] = { ...next[itemIdx], [key]: originalValueRef.current };
    onChange(next);
    setFormulaBarValue(originalValueRef.current);
    setActiveInput(null);
  }, [onChange]);

  const groupedData = useMemo(() => {
    const groups = [];
    let currentGroup = null;
    data.forEach((item, originalIndex) => {
      if (item.isParent) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { parent: { ...item, _idx: originalIndex }, items: [], sectionType: item.sectionType || 'module' };
      } else {
        if (!currentGroup) {
          // Dynamic self-healing: synthesize a parent row so the app doesn't crash on load
          const synthesizedParent = {
            isParent: true,
            modul: item.modul || 'Custom Modul',
            komp: item.modul || 'Custom Modul',
            sectionType: 'module',
            p: 0, l: 0, t: 0, jml: 1, sub: 1,
            _idx: originalIndex,
            _synthesized: true
          };
          currentGroup = { parent: synthesizedParent, items: [], sectionType: 'module' };
        }
        // Untuk lepasan: parent row tidak ditampilkan di tabel,
        // jadi kurangi _idx sebesar 1 supaya penomoran row tetap kontinyu
        const idxOffset = currentGroup.sectionType === 'lepasan' ? 1 : 0;
        currentGroup.items.push({ ...item, _idx: originalIndex - idxOffset });
      }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [data]);

  // Compute selected coordinate and ref coords per group to prevent cascading re-renders
  const groupCoords = useMemo(() => {
    return groupedData.map(group => {
      const groupRowNumbers = new Set();
      if (group.parent && group.parent._idx !== undefined) {
        groupRowNumbers.add(String(group.parent._idx + 1));
      }
      group.items.forEach(item => {
        if (item._idx !== undefined) {
          groupRowNumbers.add(String(item._idx + 1));
        }
      });

      const selectedRowMatch = selectedCoord ? selectedCoord.match(/(\d+)$/) : null;
      const selectedRowNum = selectedRowMatch ? selectedRowMatch[1] : null;
      const selectedCoordForGroup = (selectedRowNum && groupRowNumbers.has(selectedRowNum)) ? selectedCoord : null;

      const refCoordsForGroupStr = refCoords
        .filter(c => {
          const match = c.match(/(\d+)$/);
          return match && groupRowNumbers.has(match[1]);
        })
        .join(',');

      return {
        selectedCoord: selectedCoordForGroup,
        refCoordsStr: refCoordsForGroupStr
      };
    });
  }, [groupedData, selectedCoord, refCoords]);

  const filteredModuls = useMemo(() => {
    return moduls.filter(m =>
      (m.kabinet || '').toLowerCase().includes(modulSearchQuery.toLowerCase()) ||
      (m.produk || '').toLowerCase().includes(modulSearchQuery.toLowerCase())
    );
  }, [moduls, modulSearchQuery]);

  const handleModuleChange = useCallback((newHeader, newItems) => {
    const next = [...dataRef.current];
    const startIdx = newHeader._idx;
    let endIdx = startIdx + 1;
    while (endIdx < dataRef.current.length && !dataRef.current[endIdx].isParent) endIdx++;

    // Completely replace the section to accurately reflect reorders and length changes
    const updatedParent = { ...newHeader, isParent: true };
    const updatedSection = [updatedParent, ...newItems.map(i => {
      const item = { ...i, isParent: false, modul: newHeader.modul };
      delete item._idx; // remove old absolute index
      delete item._localIdx; // clean up temp properties
      return item;
    })];

    const oldLength = endIdx - startIdx;
    const newLength = updatedSection.length;
    const shiftAmount = newLength - oldLength;

    next.splice(startIdx, oldLength, ...updatedSection);

    let adjusted = next;
    if (shiftAmount !== 0) {
      // Shift references to all rows at or after startIdx + 1 (i.e. child rows and subsequent modules)
      adjusted = adjustFormulasOnShift(next, startIdx + 1, shiftAmount);
    }
    onChange(adjusted);
  }, [onChange]);

  function loadModulTemplate(target) {
    let next = [...data];
    const shiftAmount = next.length;

    // Shift formulas for the entire header object to ensure all fields (sub, p1, etc) are preserved
    const headerCopy = { p: target.p, l: target.l, t: target.t, jml: target.jml, sub: target.sub || 1, p1: target.p1, p2: target.p2, l1: target.l1, l2: target.l2, l_fin: target.l_fin, d_fin: target.d_fin };
    const shiftedHeader = shiftTemplateFormulas([headerCopy], shiftAmount)[0];

    next.push({
      ...emptyRow,
      isParent: true,
      modul: target.kabinet,
      komp: target.produk || target.dunit,
      ...shiftedHeader
    });

    if (target.komponen) {
      const shiftedKomp = shiftTemplateFormulas(target.komponen, shiftAmount);
      shiftedKomp.forEach(k => next.push({ ...emptyRow, ...k, modul: target.kabinet }));
    }

    onChange(next);
    setIsTemplateModalOpen(false);
  }

  function addSection(sectionType) {
    if (sectionType === 'submodule') {
      setIsSubModalOpen(true);
      return;
    }
    if (sectionType === 'lepasan') {
      // Part lepasan = section header tanpa tampilan modul, lalu user tambah baris sendiri
      onChange([...data, { ...emptyRow, isParent: true, sectionType: 'lepasan', komp: 'Part Lepasan' }]);
      return;
    }
    // module
    onChange([...data, { ...emptyRow, isParent: true, sectionType: 'module', komp: 'Module Baru' }]);
  }

  function loadSubModulGlobal(sub) {
    const shiftAmount = data.length;
    const subHeader = { ...emptyRow, isParent: true, sectionType: 'submodule', komp: sub.name || sub.kabinet, modul: sub.name || sub.kabinet };
    const subItems = (sub.komponen || []).map(k => ({ ...emptyRow, ...k, modul: sub.name || sub.kabinet }));
    onChange([...data, subHeader, ...subItems]);
    setIsSubModalOpen(false);
  }

  function addRow(isParent = false) {
    onChange([...data, { ...emptyRow, isParent }]);
  }

  const delModule = useCallback((parentIdx) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus modul ini beserta seluruh komponen di dalamnya?")) {
      let end = parentIdx + 1;
      while (end < dataRef.current.length && !dataRef.current[end].isParent) end++;
      const deleteCount = end - parentIdx;
      
      let next = [...dataRef.current];
      next.splice(parentIdx, deleteCount);
      
      // Shift references to all rows at or after parentIdx up by deleteCount
      const adjusted = adjustFormulasOnShift(next, parentIdx, -deleteCount);
      onChange(adjusted);
    }
  }, [onChange]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Breakdown Project</h2>
          <Badge color="blue">{data.length} Komponen</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn} onClick={() => setShowSpecRef(!showSpecRef)}>{showSpecRef ? 'Hide Variables' : 'Show Variables'}</button>
          <button style={s.btnPrimary} onClick={() => setIsTemplateModalOpen(true)}>+ Template Modul</button>
        </div>
      </div>

      <FormulaBar
        selectedCoord={selectedCoord}
        value={formulaBarValue}
        onChange={(v) => {
          setFormulaBarValue(v);
          if (activeInput && activeInput.coord === selectedCoord) {
            activeInput.setter(v);
          }
        }}
        onApply={handleFormulaBarApply}
        onCancel={handleFormulaBarCancel}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 150px 20px', background: '#f9fafb' }} onClick={() => setSelectedCoord(null)}>
          {groupedData.map((group, gi) => {
            const coords = groupCoords[gi];
            return (
              <div key={gi} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <ModuleEditor
                  header={group.parent}
                  items={group.items}
                  parts={parts}
                  setupItems={setupItems}
                  spec={spec}
                  moduls={moduls}
                  subModuls={subModuls}
                  hplOptions={hplOptions}
                  edgOptions={edgOptions}
                  bhnOptions={bhnOptions}
                  sectionType={group.parent?.sectionType || 'module'}
                  badgeText={
                    group.parent?.sectionType === 'submodule' ? 'SUB MODULE'
                      : group.parent?.sectionType === 'lepasan' ? 'PART LEPASAN'
                        : 'MODULE'
                  }
                  badgeColor={
                    group.parent?.sectionType === 'submodule' ? '#7c3aed'
                      : group.parent?.sectionType === 'lepasan' ? '#059669'
                        : '#2563eb'
                  }
                  badgeBg={
                    group.parent?.sectionType === 'submodule' ? '#f5f3ff'
                      : group.parent?.sectionType === 'lepasan' ? '#ecfdf5'
                        : '#eff6ff'
                  }
                  onChange={handleModuleChange}
                  onCellClick={handleCellClick}
                  isRefMode={activeInput && activeInput.value?.toString().startsWith('=')}
                  selectedCoord={coords.selectedCoord}
                  refCoordsStr={coords.refCoordsStr}
                  onDeleteModule={() => delModule(group.parent._idx)}
                  namedRanges={namedRanges}
                  renderCustomCell={(item, idx, key) => {
                    const rowNum = (item._idx !== undefined ? item._idx : idx) + 1;
                    const colLetter = getColLetter(key);
                    const cellCoord = `${colLetter}${rowNum}`;
                    const centerCols = ['I', 'J', 'K', 'L', 'M', 'O', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ'];
                    const textAlign = centerCols.includes(colLetter) ? 'center' : 'right';

                    let evaluatedVal = evaluateFormula(item[key], data, spec, group.parent, 0, setupItems, namedRanges, specAliases);
                    if (!item[key]) {
                      if (key === 't_luar') {
                        const lFinEval = evaluateFormula(item.l_fin, data, spec, group.parent, 0, setupItems, namedRanges, specAliases);
                        let resolvedLapLuar = '';
                        if (!isFinishingEmpty(lFinEval)) {
                          resolvedLapLuar = resolveLapisanFromCode(lFinEval, spec?.categories || []) || '';
                        }
                        if (resolvedLapLuar) {
                          evaluatedVal = getFinishingThickness(resolveAlias(resolvedLapLuar, specAliases), spec?.categories || []);
                        }
                      } else if (key === 't_dalam') {
                        const dFinEval = evaluateFormula(item.d_fin, data, spec, group.parent, 0, setupItems, namedRanges, specAliases);
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
                        textAlign={textAlign}
                        evaluated={evaluatedVal}
                        onFocus={(setter) => setActiveInput({ value: item[key], setter, coord: cellCoord })}
                        onBlur={() => setActiveInput(prev => (prev && prev.coord === cellCoord) ? null : prev)}
                        onTempChange={v => {
                          if (cellCoord === selectedCoord) setFormulaBarValue(v);
                        }}
                        onChange={v => {
                          if (item.isParent) {
                             handleModuleChange({ ...item, [key]: v }, group.items);
                          } else {
                             const nextItems = [...group.items];
                             const localIdx = idx;
                             nextItems[localIdx] = { ...nextItems[localIdx], [key]: v };
                             handleModuleChange(group.parent, nextItems);
                          }
                          if (activeInput) setActiveInput({ value: v, setter: activeInput.setter, coord: cellCoord });
                          if (cellCoord === selectedCoord) setFormulaBarValue(v);
                        }}
                      />
                    );
                  }}
                />
              </div>
            );
          })}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              style={{ padding: '10px 20px', border: '1.5px dashed #3b82f6', borderRadius: 8, background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={() => addSection('module')}
            >
              📦 + Module
            </button>
            <button
              style={{ padding: '10px 20px', border: '1.5px dashed #8b5cf6', borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={() => addSection('submodule')}
            >
              🗂 + Sub Module
            </button>
            <button
              style={{ padding: '10px 20px', border: '1.5px dashed #10b981', borderRadius: 8, background: '#ecfdf5', color: '#059669', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={() => addSection('lepasan')}
            >
              🔩 + Part Lepasan
            </button>
          </div>
        </div>
        {showSpecRef && (
          <VariablesPanel spec={spec} sections={sections} onVariableClick={onVariableClick} />
        )}
      </div>

      <Modal open={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title="Pilih Sub-Modul">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: 480, overflowY: 'auto', padding: 4 }}>
          {subModuls.map((sub, idx) => (
            <div
              key={idx}
              onClick={() => loadSubModulGlobal(sub)}
              style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', background: '#fff', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{sub.name || sub.kabinet}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{(sub.komponen || []).length} items</div>
            </div>
          ))}
          {subModuls.length === 0 && <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center', color: '#94a3b8' }}>Belum ada sub-modul tersedia.</div>}
        </div>
      </Modal>

      <Modal open={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Pilih Template Modul">
        <input style={s.searchInput} placeholder="Cari modul..." value={modulSearchQuery} onChange={e => setModulSearchQuery(e.target.value)} />
        <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          {filteredModuls.map((m, idx) => (
            <div key={idx} style={{ padding: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><Badge color="blue">{m.kabinet}</Badge> <small>{m.produk || m.dunit}</small></div>
              <button style={s.btnSmPrimary} onClick={() => loadModulTemplate(m)}>Tambahkan</button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}