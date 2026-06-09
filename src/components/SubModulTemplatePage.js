import React, { useState, useMemo } from 'react';
import { s } from './UI';
import ModuleEditor from './ModuleEditor';
import { FormulaInput } from './SharedModuleTable';
import { evaluateFormula } from '../utils/calc';
import { getColLetter } from '../utils/colMap';
import { resolveAlias, buildAliasMap } from '../utils/resolveAlias';
import { resolveLapisanFromCode, getFinishingThickness, getPartDefaultValue, isFinishingEmpty } from '../utils/breakdownCalc';
import { defaultSpekVals } from '../defaultSpekVals';

export default function SubModulTemplatePage({ modul, parts, setupItems = [], categories = [], sections = [], stock = [], onBack, onSave }) {
  const [data, setData] = useState(modul.komponen || []);
  const [header, setHeader] = useState({
    kabinet: modul.name || '',
    produk: 'Sub-Module Definition',
    tpk: modul.tpk || 'A',
    p: modul.p || 0,
    l: modul.l || 0,
    t: modul.t || 18,
    jml: modul.jml || 1
  });

  const [activeInput, setActiveInput] = useState(null);
  const [selectedCoord, setSelectedCoord] = useState(null);

  // Construct a fallback/default spec using current sections and categories for formula evaluations
  const spec = useMemo(() => {
    const defaultSpec = {
      vals: defaultSpekVals,
      aliases: {},
      kodes: {},
      categories: categories
    };
    sections.forEach(sec => {
      sec.rows.forEach(row => {
        const key = sec.name + '||' + row.label;
        if (row.alias) {
          defaultSpec.aliases[key] = row.alias;
        }
      });
    });
    return defaultSpec;
  }, [categories, sections]);

  // Derive dropdown options dynamically from stock/categories
  const hplOptions = useMemo(() => {
    const hplStock = stock.filter(s => (s.kat || '').toLowerCase() === 'hpl');
    if (hplStock.length > 0) return hplStock.map(s => s.nama || s.kode || '');
    // Fallback to categories
    const catLuar = categories.find(c => c.code === 'lap_luar');
    const catDalam = categories.find(c => c.code === 'lap_dalam');
    const catHpl = categories.find(c => c.code === 'HPL');
    const luarItems = catLuar ? catLuar.items : (catHpl ? catHpl.items : ['HB_41130', 'Aica', 'DSK_5450_SM', 'SK_10455_UW', 'GM_86', 'DXP_5342_XM', 'Duco', 'Polos']);
    const dalamItems = catDalam ? catDalam.items : ['HB_41130', 'Aica', 'Melanor', 'Polos'];
    const luarNames = luarItems.map(x => typeof x === 'string' ? x : x.name || '');
    const dalamNames = dalamItems.map(x => typeof x === 'string' ? x : x.name || '');
    return [...new Set([...luarNames, ...dalamNames])];
  }, [stock, categories]);

  const edgOptions = useMemo(() => {
    const edgStock = stock.filter(s => (s.kat || '').toLowerCase() === 'edg');
    if (edgStock.length > 0) return edgStock.map(s => s.nama || s.kode || '');
    // Fallback to categories
    const cat = categories.find(c => c.code === 'edg') || categories.find(c => c.code === 'EDG');
    const items = cat ? cat.items : ['Edg_Décor_1723_B', 'Edg_DSS_00206_SM', 'Melanor'];
    return items.map(x => typeof x === 'string' ? x : x.name || '');
  }, [stock, categories]);

  const bhnOptions = useMemo(() => {
    const cat = categories.find(c => c.code === 'bhn') || categories.find(c => c.code === 'BHN');
    const items = cat ? cat.items : ['Ply', 'Ply+mdf hijau 1mk', 'Mdf hijau', 'UPVC'];
    return items.map(x => typeof x === 'string' ? x : x.name || '');
  }, [categories]);

  const refCoordsStr = useMemo(() => {
    if (!activeInput || !activeInput.value?.toString().startsWith('=')) return '';
    return (activeInput.value.toString().match(/(?:[A-Z]{1,2})\d+/g) || []).join(',');
  }, [activeInput]);

  const handleCellClick = (coord) => {
    setSelectedCoord(coord);
    if (activeInput && activeInput.coord !== coord && activeInput.value?.toString().startsWith('=')) {
      const val = activeInput.value.toString();
      const lastChar = val.slice(-1);
      if (['+', '-', '*', '/', '(', '='].includes(lastChar)) {
        activeInput.setter(val + coord);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ background: '#fff', borderBottom: '0.5px solid #d5d5cd', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.btnSm} onClick={onBack}>← Kembali</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Sub-Modul Editor: {header.kabinet}</span>
        </div>
        <button style={s.btnPrimary} onClick={() => onSave({ ...modul, name: header.kabinet, p: header.p, l: header.l, t: header.t, jml: header.jml, komponen: data })}>Simpan Sub-Modul</button>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 150px 20px', overflowY: 'auto', background: '#f5f5f0' }} onClick={() => setSelectedCoord(null)}>
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <ModuleEditor
            header={header}
            items={data}
            parts={parts}
            setupItems={setupItems}
            subModuls={[]} // Nesting sub-modul inside sub-modul disabled for clarity
            spec={spec}
            hplOptions={hplOptions}
            edgOptions={edgOptions}
            bhnOptions={bhnOptions}
            mode="template"
            badgeText="SUB-MODULE"
            badgeColor="#059669"
            badgeBg="#ecfdf5"
            onChange={(h, i) => { setHeader(h); setData(i); }}
            onCellClick={handleCellClick}
            isRefMode={activeInput && activeInput.value?.toString().startsWith('=')}
            selectedCoord={selectedCoord}
            refCoordsStr={refCoordsStr}
            renderCustomCell={(item, idx, key) => {
                 const isParent = idx === -1;
                 const rowNum = isParent ? 1 : (item._idx !== undefined ? item._idx : idx + 1) + 1;
                 const colLetter = getColLetter(key);
                 const cellCoord = `${colLetter}${rowNum}`;
                 const centerCols = ['I', 'J', 'K', 'L', 'M', 'O', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR'];
                 const textAlign = centerCols.includes(colLetter) ? 'center' : 'right';

                 // Evaluate formula
                 let evaluatedVal = evaluateFormula(
                   item[key], 
                   [header, ...data], 
                   spec, 
                   isParent ? {} : header, 
                   0, 
                   setupItems
                 );

                 // Auto-derive dynamic lookup values for hardware, profiling, anodizing from partsData
                 const lookupKeys = ['profil3', 'profil2', 'profil', 'siku_joint', 'screw_jf', 'dormec', 'rel', 'engsel', 'v', 'v2', 'h', 'anodize'];
                 if (!isParent && !item[key] && lookupKeys.includes(key)) {
                   const compName = evaluateFormula(item.komp, [header, ...data], spec, header, 0, setupItems);
                   const defaultVal = getPartDefaultValue(compName, key);
                   if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') {
                     evaluatedVal = defaultVal;
                   }
                 }

                 // Auto-derive dynamic thickness for empty finishing layer thickness cells
                 if (!isParent && !item[key]) {
                   if (key === 't_luar') {
                     const lFinEval = evaluateFormula(item.l_fin, [header, ...data], spec, header, 0, setupItems);
                     let resolvedLapLuar = '';
                     if (!isFinishingEmpty(lFinEval)) {
                       resolvedLapLuar = resolveLapisanFromCode(lFinEval, spec?.categories || []) || '';
                     }
                     if (resolvedLapLuar) {
                       evaluatedVal = getFinishingThickness(resolveAlias(resolvedLapLuar, buildAliasMap(spec)), spec?.categories || []);
                     }
                   } else if (key === 't_dalam') {
                     const dFinEval = evaluateFormula(item.d_fin, [header, ...data], spec, header, 0, setupItems);
                     let resolvedLapDalam = '';
                     if (!isFinishingEmpty(dFinEval)) {
                       resolvedLapDalam = resolveLapisanFromCode(dFinEval, spec?.categories || []) || '';
                     }
                     if (resolvedLapDalam) {
                       evaluatedVal = getFinishingThickness(resolveAlias(resolvedLapDalam, buildAliasMap(spec)), spec?.categories || []);
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
                         onChange={v => {
                             if (isParent) {
                                 setHeader(prev => ({ ...prev, [key]: v }));
                             } else {
                                 const nextItems = [...data];
                                 nextItems[idx] = { ...nextItems[idx], [key]: v };
                                 setData(nextItems);
                             }
                             if (activeInput) setActiveInput({ value: v, setter: activeInput.setter, coord: cellCoord });
                         }} 
                     />
                 );
             }}
          />
        </div>
      </div>
    </div>
  );
}
