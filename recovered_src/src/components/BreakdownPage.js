import React, { useState, useMemo } from 'react';
import { s, Badge, Modal } from './UI';
import { evaluateFormula, shiftTemplateFormulas } from '../utils/calc';
import { buildNamedRanges } from '../utils/buildNamedRanges';
import ModuleEditor from './ModuleEditor';
import { FormulaInput } from './SharedModuleTable';

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
        style={{ flex: 1, border: 'none', outline: 'none', padding: '0 12px', fontSize: 13, height: '100%', color: value?.toString().startsWith('=') ? '#2563eb' : '#111', fontWeight: value?.toString().startsWith('=') ? 600 : 400 }}
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

export default function BreakdownPage({ data, parts, moduls = [], subModuls = [], spec = {}, sections = [], setupItems = [], categories = [], onChange }) {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [modulSearchQuery, setModulSearchQuery] = useState('');
  const [showSpecRef, setShowSpecRef] = useState(false);
  const [activeInput, setActiveInput] = useState(null); // { value, setter, coord }
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [selectedCell, setSelectedCell] = useState(null); // { itemIdx, key }
  const originalValueRef = React.useRef('');

  // Derive dropdown options from categories
  const hplOptions = useMemo(() => {
    const catLuar = categories.find(c => c.code === 'lap_luar');
    const catDalam = categories.find(c => c.code === 'lap_dalam');
    const luarItems = catLuar ? catLuar.items : ['HB_41130', 'Aica', 'DSK_5450_SM', 'SK_10455_UW', 'GM_86', 'DXP_5342_XM', 'Duco', 'Polos'];
    const dalamItems = catDalam ? catDalam.items : ['HB_41130', 'Aica', 'Melanor', 'Polos'];
    const luarNames = luarItems.map(x => typeof x === 'string' ? x : x.name || '');
    const dalamNames = dalamItems.map(x => typeof x === 'string' ? x : x.name || '');
    return [...new Set([...luarNames, ...dalamNames])];
  }, [categories]);

  const edgOptions = useMemo(() => {
    const cat = categories.find(c => c.code === 'edg');
    const items = cat ? cat.items : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Edg u/ SK_10455_UW', 'Melanor'];
    return items.map(x => typeof x === 'string' ? x : x.name || '');
  }, [categories]);

  const bhnOptions = useMemo(() => {
    const cat = categories.find(c => c.code === 'bhn');
    const items = cat ? cat.items : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC'];
    return items.map(x => typeof x === 'string' ? x : x.name || '');
  }, [categories]);

  // Build named ranges (defined names) from categories for formula evaluation
  const namedRanges = useMemo(() => buildNamedRanges(categories), [categories]);

  // Extract referenced coords from active formula for visual indicators
  const refCoords = useMemo(() => {
    if (!activeInput || !activeInput.value?.toString().startsWith('=')) return [];
    const matches = activeInput.value.toString().match(/(?:[A-Z]{1,2})\d+/g);
    return matches || [];
  }, [activeInput]);

  const handleCellClick = (coord) => {
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
    const item = data[itemIdx];

    if (item) {
      const keyMap = {
        B: 'cat', C: 'type', D: 'kode', E: 'tpk', F: 'no', G: 'komp',
        H: 'p', I: 'l', J: 't', K: 'sub', L: 'jml',
        M: 'bhn', N: 't_bhn', O: 'l_fin', P: 'd_fin',
        Q: 'p1', R: 'p2', S: 'l1', T: 'l2',
        U: 'lap_luar', V: 'lap_dalam',
        W: 'edg_p1', X: 'edg_p2', Y: 'edg_l1', Z: 'edg_l2',
        AA: 'q_engsel', AB: 'q_rel', AC: 'q_dormec', AD: 'q_minifix', AE: 'q_dowel'
      };
      const key = keyMap[colLetter];
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
  };

  const handleFormulaBarApply = () => {
    if (!selectedCell) return;
    const { itemIdx, key } = selectedCell;
    const next = [...data];
    next[itemIdx] = { ...next[itemIdx], [key]: formulaBarValue };
    onChange(next);
    originalValueRef.current = formulaBarValue;
    setActiveInput(null);
  };

  const handleFormulaBarCancel = () => {
    if (!selectedCell) return;
    const { itemIdx, key } = selectedCell;
    const next = [...data];
    next[itemIdx] = { ...next[itemIdx], [key]: originalValueRef.current };
    onChange(next);
    setFormulaBarValue(originalValueRef.current);
    setActiveInput(null);
  };

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

  const filteredModuls = moduls.filter(m =>
    (m.kabinet || '').toLowerCase().includes(modulSearchQuery.toLowerCase()) ||
    (m.produk || '').toLowerCase().includes(modulSearchQuery.toLowerCase())
  );

  function handleModuleChange(groupIndex, newHeader, newItems) {
    const next = [...data];
    const startIdx = newHeader._idx;
    let endIdx = startIdx + 1;
    while (endIdx < data.length && !data[endIdx].isParent) endIdx++;

    // Completely replace the section to accurately reflect reorders and length changes
    const updatedParent = { ...newHeader, isParent: true };
    const updatedSection = [updatedParent, ...newItems.map(i => {
      const item = { ...i, isParent: false, modul: newHeader.modul };
      delete item._idx; // remove old absolute index
      delete item._localIdx; // clean up temp properties
      return item;
    })];

    next.splice(startIdx, endIdx - startIdx, ...updatedSection);
    onChange(next);
  }

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

  function delModule(parentIdx) {
    let end = parentIdx + 1;
    while (end < data.length && !data[end].isParent) end++;
    const next = [...data]; next.splice(parentIdx, end - parentIdx);
    onChange(next);
  }

  const specVariables = useMemo(() => {
    const vars = [{ key: 'P', val: '' }, { key: 'L', val: '' }, { key: 'T', val: '' }];
    const sVals = spec.vals || {};
    const sAliases = spec.aliases || {};

    // First, populate all variables strictly defined in the template sections
    const definedKeys = new Set();
    sections.forEach(sec => {
      sec.rows.forEach(row => {
        const k = sec.name + '||' + row.label;
        definedKeys.add(k);
        vars.push({ key: sAliases[k] || row.alias || row.label.toUpperCase().replace(/\s+/g, '_'), val: sVals[k] || '' });
      });
    });

    // Then, append any standalone variables stored in vals that aren't from current sections (e.g., legacy or dynamically added)
    Object.keys(sVals).forEach(k => {
      if (!definedKeys.has(k)) {
        const label = k.split('||').pop();
        vars.push({ key: sAliases[k] || label.toUpperCase().replace(/\s+/g, '_'), val: sVals[k] });
      }
    });

    return vars;
  }, [spec, sections]);

  return (
    <div style={{ ...s.page, padding: 0, display: 'flex', flexDirection: 'column' }}>
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
          {groupedData.map((group, gi) => (
            <div key={gi} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <ModuleEditor
                header={group.parent}
                items={group.items}
                parts={parts}
                setupItems={setupItems}
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
                onCellClick={handleCellClick}
                isRefMode={activeInput && activeInput.value?.toString().startsWith('=')}
                selectedCoord={selectedCoord}
                refCoords={refCoords}
                onDeleteModule={() => delModule(group.parent._idx)}
                namedRanges={namedRanges}
                renderCustomCell={(item, idx, key) => {
                  const rowNum = (item._idx !== undefined ? item._idx : idx) + 1;
                  const getColLetter = (k) => {
                    if (k === 'cat') return 'B';
                    if (k === 'type') return 'C';
                    if (k === 'kode') return 'D';
                    if (k === 'tpk') return 'E';
                    if (k === 'no') return 'F';
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
                    if (k === 'lap_dalam') return 'V';
                    if (k === 'edg_p1') return 'W';
                    if (k === 'edg_p2') return 'X';
                    if (k === 'edg_l1') return 'Y';
                    if (k === 'edg_l2') return 'Z';
                    if (k === 'q_engsel') return 'AA';
                    if (k === 'q_rel') return 'AB';
                    if (k === 'q_dormec') return 'AC';
                    if (k === 'q_minifix') return 'AD';
                    if (k === 'q_dowel') return 'AE';
                    return k.toUpperCase();
                  };
                  const colLetter = getColLetter(key);
                  const cellCoord = `${colLetter}${rowNum}`;
                  const centerCols = ['B', 'C', 'D', 'E', 'F', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'AA', 'AB', 'AC', 'AD', 'AE'];
                  const textAlign = centerCols.includes(colLetter) ? 'center' : 'right';
                  return (
                    <FormulaInput
                      value={item[key]}
                      textAlign={textAlign}
                      evaluated={evaluateFormula(item[key], data, spec, group.parent, 0, setupItems, namedRanges)}
                      onFocus={(setter) => setActiveInput({ value: item[key], setter, coord: cellCoord })}
                      onBlur={() => setActiveInput(null)}
                      onChange={v => {
                        if (item.isParent) {
                          handleModuleChange(gi, { ...item, [key]: v }, group.items);
                        } else {
                          const nextItems = [...group.items];
                          const localIdx = idx;
                          nextItems[localIdx] = { ...nextItems[localIdx], [key]: v };
                          handleModuleChange(gi, group.parent, nextItems);
                        }
                        if (activeInput) setActiveInput({ value: v, setter: activeInput.setter, coord: cellCoord });
                        if (cellCoord === selectedCoord) setFormulaBarValue(v);
                      }}
                    />
                  );
                }}
              />
            </div>
          ))}
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
          <div style={{ width: 300, background: '#fff', borderLeft: '1px solid #e5e7eb', padding: 20, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Variabel Spek</h4>
            {specVariables.map(v => (
              <div key={v.key} style={{ padding: 8, background: '#f9fafb', borderRadius: 8, marginBottom: 8, border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><code style={{ color: '#2563eb' }}>{v.key}</code><span>{v.val}</span></div>
              </div>
            ))}
          </div>
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