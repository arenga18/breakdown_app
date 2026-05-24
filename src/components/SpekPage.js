import React, { useState } from 'react';
import { s, Modal, FormGroup, FormRow, Badge } from './UI';
import TemplatePage from './TemplatePage';

const emptyInfo = { tanggal: '', norekap: '', estimator: '', koord: '', kontrak: '', nip: '', produk: '', proyek: '', statusPend: false, statusTidakPend: false, statusAntiRayap: false, statusTidakAntiRayap: false, modulRefs: [] };

function makeVals(sections) {
  const vals = {};
  sections.forEach(sec => sec.rows.forEach(row => { vals[sec.name + '||' + row.label] = ''; }));
  return vals;
}

export default function SpekPage({ speks, sections, categories, moduls = [], onChange, onTplChange, isProjectForm }) {
  const [activeIdx, setActiveIdx] = useState(isProjectForm ? 0 : null);
  const [newModal, setNewModal] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [newForm, setNewForm] = useState({ ...emptyInfo });
  const [localVals, setLocalVals] = useState({});
  const [localInfo, setLocalInfo] = useState({});
  const [saved, setSaved] = useState(false);
  const [aliasKey, setAliasKey] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [showModulRef, setShowModulRef] = useState(false);
  const [refSearch, setRefSearch] = useState('');

  const toggleSection = (name) => setCollapsedSections(prev => ({ ...prev, [name]: !prev[name] }));

  const getCat = code => categories.find(c => c.code === code) || null;

  function openNew() {
    setNewForm({ ...emptyInfo, tanggal: new Date().toISOString().slice(0, 10) });
    setNewModal(true);
  }
  function saveNew() {
    if (!newForm.norekap && !newForm.produk) return;
    const spek = { ...newForm, vals: makeVals(sections) };
    const next = [...speks, spek];
    onChange(next);
    setActiveIdx(next.length - 1);
    setLocalVals(spek.vals);
    setLocalInfo({ ...newForm });
    setNewModal(false);
  }
  function deleteSpek(i) {
    const next = [...speks]; next.splice(i, 1);
    onChange(next);
    setActiveIdx(next.length > 0 ? Math.min(i, next.length - 1) : null);
  }
  function selectSpek(i) {
    setActiveIdx(i);
    setLocalVals({ ...speks[i].vals });
    setLocalInfo({ ...speks[i] });
    setSaved(false);
  }
  function saveValues() {
    if (activeIdx === null) return;
    const next = speks.map((sp, i) => i === activeIdx ? { ...sp, ...localInfo, vals: { ...localVals } } : sp);
    onChange(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  function setVal(key, val) {
    setLocalVals(p => ({ ...p, [key]: val }));
    setSaved(false);
    if (isProjectForm) {
      const nextVals = { ...localVals, [key]: val };
      const nextAliases = { ...(speks[0].aliases || {}) };
      onChange([{ ...speks[0], ...localInfo, vals: nextVals, aliases: nextAliases }]);
    }
  }
  function setAlias(key, alias) {
    const cleanAlias = alias.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    setSaved(false);
    const nextAliases = { ...(localInfo.aliases || {}), [key]: cleanAlias };
    setLocalInfo(p => ({ ...p, aliases: nextAliases }));
    if (isProjectForm) {
      onChange([{ ...speks[0], ...localInfo, vals: { ...localVals }, aliases: nextAliases }]);
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

  // Effect to load data if isProjectForm
  React.useEffect(() => {
    if (isProjectForm && speks.length > 0) {
      const currentSpek = speks[0];
      setLocalVals({ ...currentSpek.vals });

      // Initialize aliases from template if not already present
      const nextAliases = { ...(currentSpek.aliases || {}) };
      let changed = false;
      sections.forEach(sec => {
        sec.rows.forEach(row => {
          const key = sec.name + '||' + row.label;
          if (row.alias && !nextAliases[key]) {
            nextAliases[key] = row.alias;
            changed = true;
          }
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

  const infoStyle = { width: '100%', padding: '5px 8px', borderRadius: 7, border: '0.5px solid #d5d5cd', background: '#fafaf7', fontFamily: 'inherit', fontSize: 13, color: '#111', outline: 'none' };
  const secTitleStyle = { padding: '7px 16px', background: '#fafaf7', borderTop: '0.5px solid #d5d5cd', borderBottom: '0.5px solid #e0e0d8', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' };
  const rowStyle = { display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '0.5px solid #eeeee8' };
  const lblStyle = { padding: '7px 16px', color: '#666', fontSize: 13, borderRight: '0.5px solid #e0e0d8', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 };
  const valStyle = { padding: '5px 10px', display: 'flex', alignItems: 'center' };
  const fieldStyle = { width: '100%', padding: '4px 8px', borderRadius: 7, border: '0.5px solid #d5d5cd', background: '#fafaf7', fontFamily: 'inherit', fontSize: 13, color: '#111', outline: 'none' };

  return (
    <div style={isProjectForm ? {} : s.page}>
      {!isProjectForm && (
        <div style={s.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={s.pageTitle}>Spek Proyek</span>
            <button style={s.btnSm} onClick={() => setShowTpl(true)}>⚙ Konfigurasi Template</button>
            <button style={{ ...s.btnSm, background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }} onClick={() => setShowModulRef(true)}>📁 Referensi Modul</button>
          </div>
          <button style={s.btnPrimary} onClick={openNew}>+ Buat Spek</button>
        </div>
      )}

      {isProjectForm && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, gap: 8 }}>
          <button style={s.btnSm} onClick={() => setShowTpl(true)}>⚙ Konfigurasi Template</button>
          <button style={{ ...s.btnSm, background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }} onClick={() => setShowModulRef(true)}>📁 Referensi Modul</button>
        </div>
      )}

      <div style={{ display: isProjectForm ? 'block' : 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'start' }}>
        {/* sidebar */}
        {!isProjectForm && (
          <div style={{ border: '0.5px solid #e0e0d8', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '8px 12px', background: '#fafaf7', borderBottom: '0.5px solid #e0e0d8', fontSize: 11, fontWeight: 500, color: '#888' }}>Daftar Spek</div>
            {speks.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>Belum ada spek</div>
            ) : speks.map((sp, i) => (
              <div key={i} style={{ padding: '7px 12px', borderBottom: '0.5px solid #eeeee8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeIdx === i ? '#f0f0ec' : 'transparent' }}
                onClick={() => selectSpek(i)}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: activeIdx === i ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.norekap || 'Tanpa No'}</div>
                  <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.produk || sp.proyek}</div>
                </div>
                <button style={{ ...s.iconBtn, color: '#b91c1c', fontSize: 11, flexShrink: 0 }} onClick={e => { e.stopPropagation(); deleteSpek(i); }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* main */}
        {activeIdx === null || !speks[activeIdx] ? (
          <div style={{ ...s.empty, border: '0.5px solid #e0e0d8', borderRadius: 10, background: '#fff' }}>Pilih spek dari kiri atau buat spek baru</div>
        ) : (
          <div style={{ border: '0.5px solid #e0e0d8', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {!isProjectForm && (
              <div style={{ padding: '10px 16px', background: '#fafaf7', borderBottom: '0.5px solid #e0e0d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{localInfo.norekap || 'Tanpa No Rekap'}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{localInfo.produk}{localInfo.produk && localInfo.proyek ? ' — ' : ''}{localInfo.proyek}</div>
                </div>
                <button style={{ ...s.btnPrimary, background: saved ? '#166534' : '#111', borderColor: saved ? '#166534' : '#111' }} onClick={saveValues}>
                  {saved ? '✓ Tersimpan' : 'Simpan'}
                </button>
              </div>
            )}

            {/* info proyek */}
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #d5d5cd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['tanggal', 'Tanggal', 'date'], ['norekap', 'No Rekap', 'text'], ['estimator', 'Estimator', 'text'], ['koord', 'Koordinator Rekap', 'text'], ['kontrak', 'No Kontrak', 'text'], ['nip', 'NIP', 'text'], ['produk', 'Nama Produk', 'text'], ['proyek', 'Nama Proyek', 'text']].map(([k, lbl, type]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{lbl}</div>
                    <input type={type} style={infoStyle} value={localInfo[k] || ''} onChange={setInfo(k)} />
                  </div>
                ))}
              </div>
            </div>

            {/* status proyek */}
            <div style={secTitleStyle}>Status Proyek</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[['statusPend', 'Ada Pendingan'], ['statusTidakPend', 'Tidak Ada Pendingan'], ['statusAntiRayap', 'Ada Anti Rayap'], ['statusTidakAntiRayap', 'Tidak Anti Rayap']].map(([k, lbl]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderBottom: '0.5px solid #eeeee8', fontSize: 13 }}>
                  <input type="checkbox" id={'cb-' + k} checked={!!localInfo[k]} onChange={setInfo(k)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                  <label htmlFor={'cb-' + k} style={{ cursor: 'pointer' }}>{lbl}</label>
                </div>
              ))}
            </div>

            {/* dynamic sections dari template */}
            {sections.length === 0 ? (
              <div style={{ padding: '16px', fontSize: 14, color: '#888' }}>
                Belum ada template. Klik <strong>⚙ Konfigurasi Template</strong> di atas untuk membuat template.
              </div>
            ) : sections.map((sec, si) => (
              <div key={si}>
                <div style={secTitleStyle} onClick={() => toggleSection(sec.name)}>
                  <span>{sec.name}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{collapsedSections[sec.name] ? '▼ BUKA' : '▲ TUTUP'}</span>
                </div>
                {!collapsedSections[sec.name] && (
                  <div>
                    {sec.rows.length === 0 ? (
                      <div style={{ padding: '8px 16px', fontSize: 12, color: '#aaa' }}>Belum ada baris di section ini</div>
                    ) : sec.rows.map((row, ri) => {
                      const key = sec.name + '||' + row.label;
                      const curVal = localVals[key] !== undefined ? localVals[key] : '';
                      const cat = getCat(row.source);
                      // Force free text for Spesifikasi Produk, Spesifikasi tebal bahan, and Referensi jarak/ukuran
                      const useFreeText = sec.name === 'Spesifikasi Produk' || sec.name === 'Spesifikasi tebal bahan' || sec.name === 'Referensi jarak/ukuran';
                      const hideCatBadge = useFreeText;
                      let field;
                      if (useFreeText) {
                        field = <input type="text" style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)} placeholder="isi manual" />;
                      } else if (cat && cat.fieldtype === 'select') {
                        field = (
                          <select style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)}>
                            <option value="">-- pilih --</option>
                            {cat.items.map(item => <option key={item} value={item}>{item}</option>)}
                          </select>
                        );
                      } else if (cat && cat.fieldtype === 'number') {
                        field = <input type="number" style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)} />;
                      } else if (cat && cat.fieldtype === 'checkbox') {
                        field = <input type="checkbox" checked={!!curVal} onChange={e => setVal(key, e.target.checked)} style={{ width: 15, height: 15 }} />;
                      } else {
                        field = <input type="text" style={fieldStyle} value={curVal} onChange={e => setVal(key, e.target.value)} placeholder={cat ? cat.name : 'isi manual'} />;
                      }
                      return (
                        <div key={ri} style={rowStyle}>
                          <div style={lblStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                              <div
                                style={{ cursor: 'pointer', color: aliasKey === key ? '#2563eb' : '#cbd5e1', fontSize: 14, userSelect: 'none' }}
                                onClick={(e) => { e.stopPropagation(); setAliasKey(aliasKey === key ? null : key); }}
                                title="Tentukan nama variabel untuk rumus"
                              >
                                ⋮⋮
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <span style={{ fontWeight: 500 }}>{row.label}</span>
                                {((localInfo.aliases && localInfo.aliases[key]) || aliasKey === key) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {aliasKey === key ? (
                                      <input
                                        autoFocus
                                        style={{ border: '1px solid #2563eb', background: '#fff', fontSize: 10, color: '#2563eb', padding: '1px 4px', borderRadius: 4, outline: 'none', width: 100 }}
                                        placeholder="VAR_NAME"
                                        value={(localInfo.aliases && localInfo.aliases[key]) || ''}
                                        onChange={e => setAlias(key, e.target.value)}
                                        onBlur={() => setAliasKey(null)}
                                        onKeyDown={e => e.key === 'Enter' && setAliasKey(null)}
                                      />
                                    ) : (
                                      <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '0 4px', borderRadius: 4 }}>
                                        {(localInfo.aliases && localInfo.aliases[key])}
                                      </span>
                                    )}
                                    {row.note && !aliasKey && <span style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>({row.note})</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!hideCatBadge && cat && <Badge color="amber">{cat.code}</Badge>}
                          </div>
                          <div style={valStyle}>{field}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {!isProjectForm && (
              <div style={{ padding: '10px 16px', borderTop: '0.5px solid #e0e0d8', display: 'flex', gap: 8 }}>
                <button style={{ ...s.btnPrimary, background: saved ? '#166534' : '#111', borderColor: saved ? '#166534' : '#111' }} onClick={saveValues}>
                  {saved ? '✓ Tersimpan' : 'Simpan Spek'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#475569' }}>Auto-Generate</div>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Ambil semua modul yang memiliki NIP sama dengan spek saat ini (<strong>{localInfo.nip || '-'}</strong>).</p>
            <button 
              disabled={!localInfo.nip}
              style={{ ...s.btnSm, background: '#2563eb', color: '#fff', width: '100%', opacity: !localInfo.nip ? 0.5 : 1 }}
              onClick={() => {
                const matched = moduls.filter(m => m.nip === localInfo.nip).map(m => m.kabinet);
                const currentRefs = localInfo.modulRefs || [];
                const combined = Array.from(new Set([...currentRefs, ...matched]));
                
                setLocalInfo(p => ({ ...p, modulRefs: combined }));
                if (isProjectForm) {
                  onChange([{ ...speks[0], ...localInfo, modulRefs: combined }]);
                }
              }}
            >
              Cari & Tambahkan Otomatis
            </button>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#475569' }}>Daftar Modul Terpilih</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 40, padding: 8, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
              {(!localInfo.modulRefs || localInfo.modulRefs.length === 0) ? (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Belum ada modul yang dipilih</span>
              ) : localInfo.modulRefs.map((m, i) => (
                <Badge key={i} color="blue" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m}
                  <span 
                    style={{ cursor: 'pointer', fontWeight: 800 }} 
                    onClick={() => {
                      const next = localInfo.modulRefs.filter(rn => rn !== m);
                      setLocalInfo(p => ({ ...p, modulRefs: next }));
                      if (isProjectForm) onChange([{ ...speks[0], ...localInfo, modulRefs: next }]);
                    }}
                  >✕</span>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#475569' }}>Cari Modul Lainnya</div>
            <input 
              style={{ ...s.input, marginBottom: 8 }} 
              placeholder="Ketik nama modul..." 
              value={refSearch}
              onChange={e => setRefSearch(e.target.value)}
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {moduls
                .filter(m => {
                  const name = m.kabinet || '';
                  return name.toLowerCase().includes(refSearch.toLowerCase()) && !(localInfo.modulRefs || []).includes(name);
                })
                .map((m, i) => (
                  <div 
                    key={i} 
                    style={{ padding: '8px 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => {
                      const name = m.kabinet;
                      const next = Array.from(new Set([...(localInfo.modulRefs || []), name]));
                      setLocalInfo(p => ({ ...p, modulRefs: next }));
                      if (isProjectForm) onChange([{ ...speks[0], ...localInfo, modulRefs: next }]);
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{m.kabinet}</span>
                    <span style={{ color: '#2563eb', fontSize: 11, fontWeight: 600 }}>+ Tambah</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
