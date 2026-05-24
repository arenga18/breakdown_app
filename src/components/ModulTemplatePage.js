import React, { useState, useMemo } from 'react';
import { s } from './UI';
import ModuleEditor from './ModuleEditor';
import { FormulaInput } from './SharedModuleTable';
import { evaluateFormula } from '../utils/calc';


export default function ModulTemplatePage({ modul, parts, setupItems = [], subModuls = [], onBack, onSave }) {
  const [data, setData] = useState(modul.komponen || []);
  const [header, setHeader] = useState({
    kabinet: modul.kabinet || '',
    produk: modul.produk || modul.dunit || '',
    tpk: modul.tpk || 'A',
    p: modul.p || 0,
    l: modul.l || 0,
    t: modul.t || 18,
    jml: modul.jml || 1
  });

  const [activeInput, setActiveInput] = useState(null);
  const [selectedCoord, setSelectedCoord] = useState(null);

  const refCoords = useMemo(() => {
    if (!activeInput || !activeInput.value?.toString().startsWith('=')) return [];
    return activeInput.value.toString().match(/(?:[A-Z]{1,2})\d+/g) || [];
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
          <span style={{ fontWeight: 600, fontSize: 15 }}>Setting Template: {header.kabinet}</span>
        </div>
        <button style={s.btnPrimary} onClick={() => onSave({ ...modul, ...header, komponen: data })}>Simpan Template</button>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 150px 20px', overflowY: 'auto', background: '#f5f5f0' }} onClick={() => setSelectedCoord(null)}>
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <ModuleEditor
            header={header}
            items={data}
            parts={parts}
            setupItems={setupItems}
            subModuls={subModuls}
            mode="template"
            badgeText="TEMPLATE"
            onChange={(h, i) => { setHeader(h); setData(i); }}
            onCellClick={handleCellClick}
            isRefMode={activeInput && activeInput.value?.toString().startsWith('=')}
            selectedCoord={selectedCoord}
            refCoords={refCoords}
            renderCustomCell={(item, idx, key) => {
                const rowNum = (item._idx !== undefined ? item._idx : idx + 1) + 1;
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
                        evaluated={evaluateFormula(item[key], [header, ...data], {}, header)}
                        onFocus={(setter) => setActiveInput({ value: item[key], setter, coord: cellCoord })}
                        onBlur={() => setActiveInput(null)}
                        onChange={v => {
                            const nextItems = [...data];
                            nextItems[idx] = { ...nextItems[idx], [key]: v };
                            setData(nextItems);
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
