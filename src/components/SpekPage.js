import React, { useState } from 'react';
import { s, Modal, FormGroup, FormRow, Badge } from './UI';
import TemplatePage from './TemplatePage';
import { getFinishingThickness } from '../utils/breakdownCalc';
import { lookupCat } from '../utils/categoryLookup';

const STATIC_KODE_MAP = {
  'kabinet1': '11',
  'kabinet2': '22',
  'kabinet3': '33',
  'lapisan1': '1',
  'lapisan2': '2',
  'lapisan3': '3',
  'lapisan4': '4',
  'lapisan5': '5',
  'lapisan6': '6',
  'lapisan7': '7',
  'tip_lap_inv': '9',
  'lap_blk_pintu': '11',
  'lap_inv_kab': '0',
  'lap_pintu_mlp': '0'
};

function getStaticSpekCode(alias) {
  if (!alias) return '';
  return STATIC_KODE_MAP[alias] || '';
}

function getHplThicknessText(value, categories) {
  if (!value || value === '-- pilih --' || value === '') {
    return '#N/A';
  }
  const tebal = getFinishingThickness(value, categories);
  return String(tebal).replace('.', ',');
}

const emptyInfo = { tanggal: '', norekap: '', estimator: '', koord: '', kontrak: '', nip: '', produk: '', proyek: '', statusPend: false, statusTidakPend: false, statusAntiRayap: false, statusTidakAntiRayap: false, modulRefs: [] };

function makeVals(sections) {
  const vals = {};
  sections.forEach(sec => sec.rows.forEach((row, ri) => {
    vals[makeRowKey(sec.name, sec.rows, row, ri)] = '';
  }));
  return vals;
}

/**
 * Generate a unique key for a spek row.
 * - For rows with a unique label in their section: returns `"SecName||Label"` (unchanged, backward-compat).
 * - For rows with a duplicate label: appends `||alias` (or `||ri` fallback) to disambiguate.
 */
function makeRowKey(secName, sectionRows, row, ri) {
  const dupeCount = sectionRows.filter(r => r.label === row.label).length;
  if (dupeCount > 1) {
    // Use the row's built-in alias as the unique suffix; fall back to index
    return secName + '||' + row.label + '||' + (row.alias || String(ri));
  }
  return secName + '||' + row.label;
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const COLOR = {
  bg: '#f7f7f5',
  surface: '#ffffff',
  border: '#e8e8e2',
  borderLight: '#f0f0ea',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  accent: '#111827',
  accentHover: '#374151',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  blueBorder: '#dbeafe',
  green: '#166534',
  sectionHeader: '#f4f4f0',
};

const baseInputStyle = {
  width: '100%',
  padding: '7px 0',
  borderRadius: 0,
  border: 'none',
  borderBottom: `1.5px solid ${COLOR.border}`,
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 13,
  color: COLOR.text,
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const cardStyle = {
  background: COLOR.surface,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 16,
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 18px',
  background: COLOR.sectionHeader,
  borderBottom: `1px solid ${COLOR.border}`,
  cursor: 'pointer',
  userSelect: 'none',
};

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: COLOR.textMuted,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function SpekPage({ speks, sections, categories, stock = [], moduls = [], onChange, onTplChange, isProjectForm, highlightedField, onClearHighlight }) {
  const [activeIdx, setActiveIdx] = useState(isProjectForm ? 0 : null);
  const [newModal, setNewModal] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyInfo });
  const [localVals, setLocalVals] = useState({});
  const [localKodes, setLocalKodes] = useState({});
  const [localInfo, setLocalInfo] = useState({});
  const [saved, setSaved] = useState(false);
  const [aliasKey, setAliasKey] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [showModulRef, setShowModulRef] = useState(false);
  const [refSearch, setRefSearch] = useState('');
  const [tempHighlight, setTempHighlight] = useState(null);

  React.useEffect(() => {
    if (highlightedField) {
      const parts = highlightedField.split('||');
      if (parts.length === 2) {
        const secName = parts[0];
        setCollapsedSections(prev => ({ ...prev, [secName]: false }));
      }
      
      const timer = setTimeout(() => {
        const el = document.getElementById(highlightedField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTempHighlight(highlightedField);
          
          const clearTimer = setTimeout(() => {
            setTempHighlight(null);
            if (onClearHighlight) onClearHighlight();
          }, 3000);
          
          return () => clearTimeout(clearTimer);
        } else {
          if (onClearHighlight) onClearHighlight();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [highlightedField, onClearHighlight]);

  const toggleSection = (name) => setCollapsedSections(prev => ({ ...prev, [name]: !prev[name] }));
  const getCat = code => categories.find(c => c.code === code) || null;

  function initAliasesFromSections(spek) {
    const nextAliases = { ...(spek.aliases || {}) };
    let changed = false;
    sections.forEach(sec => {
      sec.rows.forEach((row, ri) => {
        const key = makeRowKey(sec.name, sec.rows, row, ri);
        if (row.alias && !nextAliases[key]) { nextAliases[key] = row.alias; changed = true; }
      });
    });
    return changed ? { ...spek, aliases: nextAliases } : spek;
  }

  function openNew() { setNewForm({ ...emptyInfo, tanggal: new Date().toISOString().slice(0, 10) }); setNewModal(true); }
  function saveNew() {
    if (!newForm.norekap && !newForm.produk) return;
    let spek = { ...newForm, vals: makeVals(sections), kodes: {} };
    spek = initAliasesFromSections(spek);
    const next = [...speks, spek];
    onChange(next);
    setActiveIdx(next.length - 1);
    setLocalVals(spek.vals);
    setLocalKodes({});
    setLocalInfo({ ...spek });
    setNewModal(false);
  }
  function deleteSpek(i) {
    const next = [...speks]; next.splice(i, 1);
    onChange(next);
    setActiveIdx(next.length > 0 ? Math.min(i, next.length - 1) : null);
  }
  function selectSpek(i) {
    const updatedSpek = initAliasesFromSections(speks[i]);
    setActiveIdx(i);
    setLocalVals({ ...updatedSpek.vals });
    setLocalKodes({ ...(updatedSpek.kodes || {}) });
    setLocalInfo({ ...updatedSpek });
    setSaved(false);
  }
  function saveValues() {
    if (activeIdx === null) return;
    const next = speks.map((sp, i) => i === activeIdx ? { ...sp, ...localInfo, vals: { ...localVals }, kodes: { ...localKodes } } : sp);
    onChange(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  function setVal(key, val) {
    let source = '';
    for (const sec of sections) {
      const foundRow = sec.rows.find(r => (sec.name + '||' + r.label) === key);
      if (foundRow) {
        source = foundRow.source;
        break;
      }
    }

    let kodeVal = '';
    if (source) {
      const cat = getCat(source);
      if (cat && Array.isArray(cat.items)) {
        const foundItem = cat.items.find(item => {
          const normalized = typeof item === 'string'
            ? { code: '', name: item }
            : item;
          return normalized.name === val;
        });
        if (foundItem && typeof foundItem === 'object') {
          kodeVal = foundItem.code || '';
        }
      }
    }

    setLocalVals(p => ({ ...p, [key]: val }));
    setLocalKodes(p => ({ ...p, [key]: kodeVal }));
    setSaved(false);

    if (isProjectForm) {
      const nextVals = { ...localVals, [key]: val };
      const nextKodes = { ...localKodes, [key]: kodeVal };
      const nextAliases = { ...(localInfo.aliases || {}) };
      onChange([{ ...speks[0], ...localInfo, vals: nextVals, kodes: nextKodes, aliases: nextAliases }]);
    }
  }
  function setAlias(key, alias) {
    const cleanAlias = alias.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    setSaved(false);
    const nextAliases = { ...(localInfo.aliases || {}), [key]: cleanAlias };
    setLocalInfo(p => ({ ...p, aliases: nextAliases }));
    if (isProjectForm) onChange([{ ...speks[0], ...localInfo, vals: { ...localVals }, kodes: { ...localKodes }, aliases: nextAliases }]);
  }
  function setKode(key, kodeVal) {
    const nextKodes = { ...localKodes, [key]: kodeVal };
    setLocalKodes(nextKodes);
    setSaved(false);
    if (isProjectForm) onChange([{ ...speks[0], ...localInfo, vals: { ...localVals }, kodes: nextKodes }]);
  }
  function handleStandardKodeChange(key, newKode) {
    const nextKodes = { ...localKodes, [key]: newKode };
    setLocalKodes(nextKodes);
    setSaved(false);

    const newVal = lookupCat(categories, 'tf', newKode) || '';
    const nextVals = { ...localVals, [key]: newVal };
    setLocalVals(nextVals);

    if (isProjectForm && speks.length > 0) {
      onChange([{
        ...speks[0],
        ...localInfo,
        vals: nextVals,
        kodes: nextKodes
      }]);
    }
  }
  function setInfo(k) {
    return e => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setLocalInfo(p => ({ ...p, [k]: val }));
      setSaved(false);
      if (isProjectForm) {
        const nextInfo = { ...localInfo, [k]: val };
        onChange([{ ...speks[0], ...nextInfo, vals: { ...localVals }, aliases: { ...(localInfo.aliases || {}) } }]);
      }
    };
  }

  React.useEffect(() => {
    if (isProjectForm && speks.length > 0) {
      const currentSpek = speks[0];
      setLocalVals({ ...currentSpek.vals });
      setLocalKodes({ ...(currentSpek.kodes || {}) });
      const nextAliases = { ...(currentSpek.aliases || {}) };
      let changed = false;
      sections.forEach(sec => {
        sec.rows.forEach((row, ri) => {
          const key = makeRowKey(sec.name, sec.rows, row, ri);
          if (row.alias && !nextAliases[key]) { nextAliases[key] = row.alias; changed = true; }
        });
      });
      if (changed) {
        const nextSpek = { ...currentSpek, aliases: nextAliases };
        setLocalInfo(nextSpek);
        onChange([nextSpek]);
      } else {
        setLocalInfo({ ...currentSpek });
      }
    }
  }, [isProjectForm, speks.length, sections]);

  React.useEffect(() => {
    if (activeIdx === null || !localInfo || !localInfo.aliases) return;

    const standardSection = sections.find(s => s.name === 'Lapisan Standard');
    if (!standardSection) return;

    let changed = false;
    const nextVals = { ...localVals };

    standardSection.rows.forEach(row => {
      const key = 'Lapisan Standard||' + row.label;
      const currentKode = localKodes[key] !== undefined ? localKodes[key] : getStaticSpekCode(row.alias);
      const targetVal = lookupCat(categories, 'tf', currentKode) || '';
      if (localVals[key] !== targetVal) {
        nextVals[key] = targetVal;
        changed = true;
      }
    });

    if (changed) {
      setLocalVals(nextVals);
      setSaved(false);

      if (isProjectForm && speks.length > 0) {
        const nextAliases = { ...(localInfo.aliases || {}) };
        onChange([{ ...speks[0], ...localInfo, vals: nextVals, kodes: { ...localKodes }, aliases: nextAliases }]);
      }
    }
  }, [localVals, localInfo, activeIdx, isProjectForm, speks, onChange, localKodes, categories, sections]);

  // ─── Row & field styles ──────────────────────────────────────────────────
  const tableRowStyle = {
    display: 'grid',
    gridTemplateColumns: '60px 240px 1fr 80px',
    borderBottom: `1px solid ${COLOR.borderLight}`,
    transition: 'background 0.1s',
  };
  const kodeStyle = {
    padding: '4px 6px',
    borderRight: `1px solid ${COLOR.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
  };
  const lblStyle = {
    padding: '8px 16px',
    color: COLOR.text,
    fontSize: 13,
    borderRight: `1px solid ${COLOR.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  };
  const valStyle = {
    padding: '4px 12px',
    display: 'flex',
    alignItems: 'center',
    borderRight: `1px solid ${COLOR.borderLight}`,
  };
  const fieldStyle = {
    width: '100%',
    padding: '5px 2px',
    border: 'none',
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 13,
    color: COLOR.text,
    outline: 'none',
    boxSizing: 'border-box',
  };

  // ─── Table column header ─────────────────────────────────────────────────
  const tableColHeader = (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 240px 1fr 80px', background: '#f9f9f6', borderBottom: `1px solid ${COLOR.border}` }}>
      <div style={{ padding: '5px 8px', fontSize: 10, color: COLOR.textFaint, textAlign: 'center', borderRight: `1px solid ${COLOR.borderLight}`, fontWeight: 600, letterSpacing: '0.05em' }}>KODE</div>
      <div style={{ padding: '5px 16px', fontSize: 10, color: COLOR.textFaint, borderRight: `1px solid ${COLOR.borderLight}`, fontWeight: 600, letterSpacing: '0.05em' }}>LABEL</div>
      <div style={{ padding: '5px 12px', fontSize: 10, color: COLOR.textFaint, borderRight: `1px solid ${COLOR.borderLight}`, fontWeight: 600, letterSpacing: '0.05em' }}>NILAI</div>
      <div style={{ padding: '5px 8px', fontSize: 10, color: COLOR.textFaint, textAlign: 'center', fontWeight: 600, letterSpacing: '0.05em' }}>TEBAL</div>
    </div>
  );

  // ─── Info fields ─────────────────────────────────────────────────────────
  const infoFields = [
    ['tanggal', 'Tanggal', 'date'],
    ['norekap', 'No Rekap', 'text'],
    ['estimator', 'Estimator', 'text'],
    ['koord', 'Koordinator Rekap', 'text'],
    ['kontrak', 'No Kontrak', 'text'],
    ['nip', 'NIP', 'text'],
    ['produk', 'Nama Produk', 'text'],
    ['proyek', 'Nama Proyek', 'text'],
  ];

  const statusItems = [
    ['statusPend', 'Ada Pendingan'],
    ['statusTidakPend', 'Tidak Ada Pendingan'],
    ['statusAntiRayap', 'Ada Anti Rayap'],
    ['statusTidakAntiRayap', 'Tidak Anti Rayap'],
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={isProjectForm ? {} : s.page}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      {!isProjectForm && (
        <div style={s.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={s.pageTitle}>Spek Proyek</span>
            <button style={s.btnSm} onClick={() => setShowTpl(true)}>⚙ Konfigurasi Template</button>
            <button style={{ ...s.btnSm, background: COLOR.blueBg, color: COLOR.blue, borderColor: COLOR.blueBorder }} onClick={() => setShowModulRef(true)}>📁 Referensi Modul</button>
          </div>
          <button style={s.btnPrimary} onClick={openNew}>+ Buat Spek</button>
        </div>
      )}

      {isProjectForm && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, gap: 8 }}>
          <button style={s.btnSm} onClick={() => setShowTpl(true)}>⚙ Konfigurasi Template</button>
          <button style={{ ...s.btnSm, background: COLOR.blueBg, color: COLOR.blue, borderColor: COLOR.blueBorder }} onClick={() => setShowModulRef(true)}>📁 Referensi Modul</button>
        </div>
      )}

      <div style={{ display: isProjectForm ? 'block' : 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        {!isProjectForm && (
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div style={{ padding: '10px 14px', background: COLOR.sectionHeader, borderBottom: `1px solid ${COLOR.border}`, fontSize: 10, fontWeight: 700, color: COLOR.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Daftar Spek</div>
            {speks.length === 0 ? (
              <div style={{ padding: '14px', fontSize: 12, color: COLOR.textFaint, textAlign: 'center' }}>Belum ada spek</div>
            ) : speks.map((sp, i) => (
              <div key={i}
                style={{ padding: '9px 14px', borderBottom: `1px solid ${COLOR.borderLight}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeIdx === i ? '#f0f0ec' : 'transparent' }}
                onClick={() => selectSpek(i)}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: activeIdx === i ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLOR.text }}>{sp.norekap || 'Tanpa No'}</div>
                  <div style={{ fontSize: 11, color: COLOR.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.produk || sp.proyek}</div>
                </div>
                <button style={{ ...s.iconBtn, color: '#b91c1c', fontSize: 11, flexShrink: 0 }} onClick={e => { e.stopPropagation(); deleteSpek(i); }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Main content ───────────────────────────────────────────────── */}
        {activeIdx === null || !speks[activeIdx] ? (
          <div style={{ ...s.empty, border: `1px solid ${COLOR.border}`, borderRadius: 12, background: COLOR.surface }}>Pilih spek dari kiri atau buat spek baru</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Spek header bar (non-project form) */}
            {!isProjectForm && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: COLOR.text }}>{localInfo.norekap || 'Tanpa No Rekap'}</div>
                  <div style={{ fontSize: 12, color: COLOR.textMuted, marginTop: 2 }}>{localInfo.produk}{localInfo.produk && localInfo.proyek ? ' — ' : ''}{localInfo.proyek}</div>
                </div>
                <button style={{ ...s.btnPrimary, background: saved ? COLOR.green : COLOR.accent, borderColor: saved ? COLOR.green : COLOR.accent }} onClick={saveValues}>
                  {saved ? '✓ Tersimpan' : 'Simpan'}
                </button>
              </div>
            )}

            {/* ── Card: Info Proyek ───────────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <span style={sectionTitleStyle}>Info Proyek</span>
              </div>
              <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                {infoFields.map(([k, lbl, type]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLOR.textMuted, marginBottom: 5, letterSpacing: '0.02em' }}>{lbl}</div>
                    <input
                      type={type}
                      style={baseInputStyle}
                      value={localInfo[k] || ''}
                      onChange={setInfo(k)}
                      onFocus={e => (e.target.style.borderColor = COLOR.blue)}
                      onBlur={e => (e.target.style.borderColor = COLOR.border)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Card: Status Proyek ─────────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <span style={sectionTitleStyle}>Status Proyek</span>
              </div>
              <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                {statusItems.map(([k, lbl]) => (
                  <label key={k} htmlFor={'cb-' + k}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${localInfo[k] ? COLOR.blue : COLOR.borderLight}`, background: localInfo[k] ? COLOR.blueBg : '#fafaf8', cursor: 'pointer', fontSize: 13, color: localInfo[k] ? COLOR.blue : COLOR.text, transition: 'all 0.15s', userSelect: 'none' }}>
                    <input type="checkbox" id={'cb-' + k} checked={!!localInfo[k]} onChange={setInfo(k)}
                      style={{ width: 15, height: 15, accentColor: COLOR.blue, cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ fontWeight: localInfo[k] ? 600 : 400 }}>{lbl}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Dynamic sections ────────────────────────────────────────── */}
            {sections.length === 0 ? (
              <div style={{ ...cardStyle, padding: 20, fontSize: 14, color: COLOR.textMuted, textAlign: 'center' }}>
                Belum ada template. Klik <strong>⚙ Konfigurasi Template</strong> di atas untuk membuat template.
              </div>
            ) : sections.map((sec, si) => (
              <div key={si} style={cardStyle}>
                {/* Section header */}
                <div style={sectionHeaderStyle} onClick={() => toggleSection(sec.name)}>
                  <span style={sectionTitleStyle}>{sec.name}</span>
                  <span style={{ fontSize: 10, color: COLOR.textFaint, fontWeight: 500 }}>
                    {collapsedSections[sec.name] ? '▼ BUKA' : '▲ TUTUP'}
                  </span>
                </div>

                {!collapsedSections[sec.name] && (
                  <>
                    {sec.rows.length === 0 ? (
                      <div style={{ padding: '14px 20px', fontSize: 12, color: COLOR.textFaint, fontStyle: 'italic' }}>Belum ada baris di section ini</div>
                    ) : (
                      <>
                        {tableColHeader}
                        {sec.rows.map((row, ri) => {
                          const key = makeRowKey(sec.name, sec.rows, row, ri);
                          const isCustom = localKodes[key] !== undefined && localKodes[key] !== '';
                          const isComputedStandard = !isCustom && ['lap_blk_pintu', 'lap_inv_kab', 'lap_pintu_mlp'].includes(row.alias);
                          let curVal = localVals[key] !== undefined ? localVals[key] : '';
                          if (isComputedStandard) {
                            if (row.alias === 'lap_blk_pintu') {
                              const kab1Key = Object.keys(localInfo.aliases || {}).find(k => localInfo.aliases[k] === 'kabinet1');
                              curVal = kab1Key ? (localVals[kab1Key] || 'Polos') : 'Polos';
                            } else {
                              curVal = 'Polos';
                            }
                          }
                          const cat = getCat(row.source);
                          const useFreeText = sec.name === 'Spesifikasi Produk' || sec.name === 'Spesifikasi tebal bahan' || sec.name === 'Referensi jarak/ukuran';
                          const hideCatBadge = useFreeText;
                          let field;
                          if (isComputedStandard) {
                            field = <span style={{ fontSize: 13, color: COLOR.text, fontStyle: 'italic', fontWeight: 500 }}>{curVal}</span>;
                          } else if (useFreeText) {
                            field = <input type="text" style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)} placeholder="isi manual" />;
                          } else if (cat && cat.fieldtype === 'select') {
                            field = (
                              <select style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)}>
                                <option value="">-- pilih --</option>
                                {cat.items.map((item, index) => {
                                  const normalizedItem = typeof item === 'string'
                                    ? { code: '', val: index + 1, name: item }
                                    : item;
                                  const itemValue = normalizedItem.name || '';
                                  const itemLabel = normalizedItem.code !== '' && normalizedItem.code !== undefined
                                    ? `${normalizedItem.name} (${normalizedItem.code})`
                                    : normalizedItem.name;
                                  return (
                                    <option key={index} value={itemValue}>{itemLabel}</option>
                                  );
                                })}
                              </select>
                            );
                          } else if (cat && cat.fieldtype === 'number') {
                            field = <input type="number" style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)} />;
                          } else if (cat && cat.fieldtype === 'checkbox') {
                            field = <input type="checkbox" checked={!!curVal} onChange={e => setVal(key, e.target.checked)} style={{ width: 15, height: 15, accentColor: COLOR.blue }} />;
                          } else {
                            field = <input type="text" style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)} placeholder={cat ? cat.name : 'isi manual'} />;
                          }
                          const isHighlighted = tempHighlight === key;
                          return (
                            <div 
                              key={ri} 
                              id={key}
                              style={{ 
                                display: 'grid',
                                gridTemplateColumns: '60px 240px 1fr 80px',
                                background: isHighlighted 
                                  ? '#eff6ff' 
                                  : (ri % 2 === 0 ? COLOR.surface : '#fafaf8'),
                                border: isHighlighted 
                                  ? '2px solid #2563eb' 
                                  : 'none',
                                boxSizing: 'border-box',
                                transition: 'background-color 0.3s, border 0.3s'
                              }}
                            >
                              {(() => {
                                const isStandardSection = sec.name === 'Lapisan Standard';
                                const staticCode = getStaticSpekCode(row.alias);
                                if (isStandardSection) {
                                  return (
                                    <div style={kodeStyle}>
                                      <input
                                        type="text"
                                        style={{
                                          width: '45px',
                                          textAlign: 'center',
                                          padding: '3px 0',
                                          border: `1.5px solid ${COLOR.border}`,
                                          borderRadius: '4px',
                                          background: '#ffffff',
                                          fontFamily: 'inherit',
                                          fontSize: 13,
                                          fontWeight: '700',
                                          color: COLOR.text,
                                          outline: 'none',
                                          transition: 'border-color 0.15s, box-shadow 0.15s',
                                        }}
                                        value={localKodes[key] || ''}
                                        placeholder={staticCode || ''}
                                        onChange={e => handleStandardKodeChange(key, e.target.value)}
                                        onFocus={e => {
                                          e.target.style.borderColor = COLOR.blue;
                                          e.target.style.boxShadow = `0 0 0 2px ${COLOR.blueBg}`;
                                        }}
                                        onBlur={e => {
                                          e.target.style.borderColor = COLOR.border;
                                          e.target.style.boxShadow = 'none';
                                        }}
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div style={kodeStyle}>
                                    {staticCode && (
                                      <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>{staticCode}</span>
                                    )}
                                  </div>
                                );
                              })()}
                              <div style={lblStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                  <div
                                    style={{ cursor: 'pointer', color: aliasKey === key ? COLOR.blue : '#d1d5db', fontSize: 14, userSelect: 'none', lineHeight: 1 }}
                                    onClick={(e) => { e.stopPropagation(); setAliasKey(aliasKey === key ? null : key); }}
                                    title="Tentukan nama variabel untuk rumus"
                                  >⋮⋮</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontWeight: 500, color: COLOR.text }}>{row.label}</span>
                                    {((localInfo.aliases && localInfo.aliases[key]) || aliasKey === key) && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {aliasKey === key ? (
                                          <input
                                            autoFocus
                                            style={{ border: `1px solid ${COLOR.blue}`, background: '#fff', fontSize: 10, color: COLOR.blue, padding: '1px 4px', borderRadius: 4, outline: 'none', width: 100 }}
                                            placeholder="VAR_NAME"
                                            value={(localInfo.aliases && localInfo.aliases[key]) || ''}
                                            onChange={e => setAlias(key, e.target.value)}
                                            onBlur={() => setAliasKey(null)}
                                            onKeyDown={e => e.key === 'Enter' && setAliasKey(null)}
                                          />
                                        ) : (
                                          <span style={{ fontSize: 10, color: COLOR.blue, fontWeight: 700, background: COLOR.blueBg, padding: '1px 5px', borderRadius: 4 }}>
                                            {(localInfo.aliases && localInfo.aliases[key])}
                                          </span>
                                        )}
                                        {row.note && !aliasKey && <span style={{ fontSize: 10, color: COLOR.textFaint, fontStyle: 'italic' }}>({row.note})</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {!hideCatBadge && cat && <Badge color="amber">{cat.code}</Badge>}
                              </div>
                              <div style={valStyle}>{field}</div>
                              {(() => {
                                const isHpl = row.source === 'hpl';
                                let thicknessText = '';
                                let isNa = false;
                                if (isHpl) {
                                  thicknessText = getHplThicknessText(curVal, categories);
                                  isNa = thicknessText === '#N/A';
                                }
                                return (
                                  <div style={{
                                    padding: '4px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    background: isHpl ? (isNa ? '#fee2e2' : '#f0fdf4') : 'transparent',
                                    color: isHpl ? (isNa ? '#ef4444' : '#166534') : COLOR.text
                                  }}>
                                    {thicknessText}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Bottom save bar */}
            {!isProjectForm && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
                <button style={{ ...s.btnPrimary, background: saved ? COLOR.green : COLOR.accent, borderColor: saved ? COLOR.green : COLOR.accent }} onClick={saveValues}>
                  {saved ? '✓ Tersimpan' : 'Simpan Spek'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <Modal open={showTpl} onClose={() => setShowTpl(false)} title="Konfigurasi Template Spek" size="large">
        <div style={{ margin: '-20px' }}>
          <TemplatePage sections={sections} categories={categories} onChange={onTplChange} />
        </div>
      </Modal>

      <Modal open={newModal} onClose={() => setNewModal(false)} title="Buat Spek Baru">
        <FormRow>
          <FormGroup label="Tanggal"><input type="date" style={s.input} value={newForm.tanggal} onChange={e => setNewForm(p => ({ ...p, tanggal: e.target.value }))} /></FormGroup>
          <FormGroup label="No Rekap"><input style={s.input} value={newForm.norekap} onChange={e => setNewForm(p => ({ ...p, norekap: e.target.value }))} placeholder="RZ0401" /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Estimator"><input style={s.input} value={newForm.estimator} onChange={e => setNewForm(p => ({ ...p, estimator: e.target.value }))} /></FormGroup>
          <FormGroup label="Koordinator Rekap"><input style={s.input} value={newForm.koord} onChange={e => setNewForm(p => ({ ...p, koord: e.target.value }))} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="No Kontrak"><input style={s.input} value={newForm.kontrak} onChange={e => setNewForm(p => ({ ...p, kontrak: e.target.value }))} /></FormGroup>
          <FormGroup label="NIP"><input style={s.input} value={newForm.nip} onChange={e => setNewForm(p => ({ ...p, nip: e.target.value }))} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Nama Produk"><input style={s.input} value={newForm.produk} onChange={e => setNewForm(p => ({ ...p, produk: e.target.value }))} placeholder="Pantry" /></FormGroup>
          <FormGroup label="Nama Proyek"><input style={s.input} value={newForm.proyek} onChange={e => setNewForm(p => ({ ...p, proyek: e.target.value }))} /></FormGroup>
        </FormRow>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setNewModal(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={saveNew}>Buat</button>
        </div>
      </Modal>

      {/* REFERENSI MODUL MODAL */}
      <Modal open={showModulRef} onClose={() => setShowModulRef(false)} title="Referensi Modul Proyek" size="medium">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: `1px solid ${COLOR.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-Generate</div>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>Ambil semua modul yang memiliki NIP sama dengan spek saat ini (<strong>{localInfo.nip || '-'}</strong>).</p>
            <button
              disabled={!localInfo.nip}
              style={{ ...s.btnSm, background: COLOR.blue, color: '#fff', width: '100%', justifyContent: 'center', opacity: !localInfo.nip ? 0.4 : 1 }}
              onClick={() => {
                const matched = moduls.filter(m => m.nip === localInfo.nip).map(m => m.kabinet);
                const currentRefs = localInfo.modulRefs || [];
                const nextRefs = [...currentRefs];
                matched.forEach(name => {
                  const exists = nextRefs.some(rn => (typeof rn === 'string' ? rn : rn.name) === name);
                  if (!exists) {
                    nextRefs.push({ name, qty: 1 });
                  }
                });
                setLocalInfo(p => ({ ...p, modulRefs: nextRefs }));
                if (isProjectForm) onChange([{ ...speks[0], ...localInfo, modulRefs: nextRefs }]);
              }}
            >
              Cari &amp; Tambahkan Otomatis
            </button>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Modul Terpilih</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 40, padding: 10, border: `1px dashed #cbd5e1`, borderRadius: 8, background: '#fafafe' }}>
              {(!localInfo.modulRefs || localInfo.modulRefs.length === 0) ? (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Belum ada modul yang dipilih</span>
              ) : localInfo.modulRefs.map((m, i) => {
                const item = typeof m === 'string' ? { name: m, qty: 1 } : m;
                return (
                  <Badge key={i} color="blue" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px' }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <input
                      type="number"
                      min="1"
                      value={item.qty || 1}
                      onChange={e => {
                        const newQty = parseInt(e.target.value) || 1;
                        const next = (localInfo.modulRefs || []).map((rn, idx) => {
                          if (idx === i) {
                            return { name: item.name, qty: newQty };
                          }
                          return typeof rn === 'string' ? { name: rn, qty: 1 } : rn;
                        });
                        setLocalInfo(p => ({ ...p, modulRefs: next }));
                        if (isProjectForm) onChange([{ ...speks[0], ...localInfo, modulRefs: next }]);
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: 45,
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '1px 4px',
                        fontSize: 11,
                        textAlign: 'center',
                        background: '#fff',
                        color: '#334155',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                    <span style={{ cursor: 'pointer', fontWeight: 800, color: '#ef4444', marginLeft: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = localInfo.modulRefs.filter((_, idx) => idx !== i);
                        setLocalInfo(p => ({ ...p, modulRefs: next }));
                        if (isProjectForm) onChange([{ ...speks[0], ...localInfo, modulRefs: next }]);
                      }}>✕</span>
                  </Badge>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cari Modul Lainnya</div>
            <input
              style={{ ...s.input, marginBottom: 8 }}
              placeholder="Ketik nama modul..."
              value={refSearch}
              onChange={e => setRefSearch(e.target.value)}
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${COLOR.border}`, borderRadius: 8 }}>
              {moduls
                .filter(m => {
                  const name = m.kabinet || '';
                  return name.toLowerCase().includes(refSearch.toLowerCase()) && 
                    !(localInfo.modulRefs || []).some(rn => (typeof rn === 'string' ? rn : rn.name) === name);
                })
                .map((m, i) => (
                  <div
                    key={i}
                    style={{ padding: '9px 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLOR.borderLight}`, cursor: 'pointer' }}
                    onClick={() => {
                      const name = m.kabinet;
                      const next = [...(localInfo.modulRefs || []), { name, qty: 1 }];
                      setLocalInfo(p => ({ ...p, modulRefs: next }));
                      if (isProjectForm) onChange([{ ...speks[0], ...localInfo, modulRefs: next }]);
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ color: COLOR.text }}>{m.kabinet}</span>
                    <span style={{ color: COLOR.blue, fontSize: 11, fontWeight: 600 }}>+ Tambah</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
