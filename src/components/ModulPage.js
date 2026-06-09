import React, { useState, useEffect } from 'react';
import { s, Badge, Modal, FormGroup, FormRow, SearchableSelect } from './UI';
import ModulTemplatePage from './ModulTemplatePage';

export default function ModulPage({ data, parts, masterData, setupItems = [], subModuls = [], categories = [], sections = [], stock = [], onChange }) {
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(getEmpty());

  const [searchTerm, setSearchTerm] = useState('');

  function getEmpty() {
    return {
      tgl: new Date().toISOString().split('T')[0],
      nip: '',
      tinggi: '',
      proyek: '',
      produk: '',
      kabinet: '',
      dunit: '', bbox: '', fin: '', plap: '',
      ibox: '', stup: '', jtutup: '', jnistutup: '',
      hndl: '', acc: '', lmp: '', plnt: ''
    };
  }

  const dropdowns = [
    { key: 'dunit', label: 'Deskripsi Unit', source: 'deskripsiUnit' },
    { key: 'bbox', label: 'Bentuk Box/Carcase', source: 'bentukBox' },
    { key: 'fin', label: 'Finishing', source: 'finishing' },
    { key: 'plap', label: 'Posisi Lapisan', source: 'posisiLapisan' },
    { key: 'ibox', label: 'Isi Box/Carcase', source: 'isiBox' },
    { key: 'stup', label: 'Sistem Tutup', source: 'sistemTutup' },
    { key: 'jtutup', label: 'Jumlah Tutup', source: 'jumlahTutup' },
    { key: 'jnistutup', label: 'Jenis Tutup', source: 'jenisTutup' },
    { key: 'hndl', label: 'Handle', source: 'handle' },
    { key: 'acc', label: 'Accessories', source: 'accessories' },
    { key: 'lmp', label: 'Lampu', source: 'lampu' },
    { key: 'plnt', label: 'Plinth', source: 'plinth' },
  ];

  // Auto-generate cabinet code
  useEffect(() => {
    const getCode = (key) => {
      const field = dropdowns.find(d => d.key === key);
      const items = masterData[field.source] || [];
      const item = items.find(i => i.name === formData[key]);
      return item ? item.code : '';
    };

    const p1 = getCode('dunit');
    const p2 = getCode('bbox') + getCode('fin') + getCode('plap') + getCode('ibox');
    const p3 = getCode('stup') + getCode('jtutup') + getCode('jnistutup') + getCode('hndl');
    const p4 = getCode('acc') + getCode('lmp') + getCode('plnt');

    // Pattern 1-4-4-3: P1-P2-P3-P4
    const code = [p1, p2, p3, p4].filter(p => p !== '').join('-');
    
    if (code !== formData.kabinet) {
      setFormData(prev => ({ ...prev, kabinet: code }));
    }
  }, [formData.dunit, formData.bbox, formData.fin, formData.plap, formData.ibox, formData.stup, formData.jtutup, formData.jnistutup, formData.hndl, formData.acc, formData.lmp, formData.plnt]);

  function save() {
    onChange([...data, { ...formData, id: Date.now() }]);
    setIsEditing(false);
    setFormData(getEmpty());
  }

  function saveTemplate(updatedModul) {
    const next = data.map(m => m.id === updatedModul.id ? updatedModul : m);
    onChange(next);
    setEditingTemplateId(null);
  }

  function deleteModul(id) {
    if (window.confirm("Apakah Anda yakin ingin menghapus modul master ini? Tindakan ini juga akan menghapus data di database.")) {
      const next = data.filter(m => m.id !== id);
      onChange(next);
    }
  }

  function generateCabinetCode(m) {
    const getCode = (key) => {
      const field = dropdowns.find(d => d.key === key);
      const items = masterData[field.source] || [];
      const item = items.find(i => i.name === m[key]);
      return item ? item.code : '';
    };

    const p1 = getCode('dunit');
    const p2 = getCode('bbox') + getCode('fin') + getCode('plap') + getCode('ibox');
    const p3 = getCode('stup') + getCode('jtutup') + getCode('jnistutup') + getCode('hndl');
    const p4 = getCode('acc') + getCode('lmp') + getCode('plnt');

    return [p1, p2, p3, p4].filter(p => p !== '').join('-');
  }

  function handleInlineChange(modulId, key, value) {
    const next = data.map(m => {
      if (m.id === modulId) {
        const updated = { ...m, [key]: value };
        updated.kabinet = generateCabinetCode(updated);
        return updated;
      }
      return m;
    });
    onChange(next);
  }

  if (editingTemplateId) {
    const modul = data.find(m => m.id === editingTemplateId);
    return (
      <ModulTemplatePage
        modul={modul}
        parts={parts}
        setupItems={setupItems}
        subModuls={subModuls}
        categories={categories}
        sections={sections}
        stock={stock}
        onBack={() => setEditingTemplateId(null)}
        onSave={saveTemplate}
      />
    );
  }

  const filteredData = data.filter(m => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      (m.kabinet || '').toLowerCase().includes(lower) ||
      (m.proyek || '').toLowerCase().includes(lower) ||
      (m.produk || '').toLowerCase().includes(lower) ||
      (m.dunit || '').toLowerCase().includes(lower) ||
      (m.nip || '').toLowerCase().includes(lower)
    );
  });

  const bgColors = {
    kode: '#ebd3d3',
    desc: '#e2e8f0',
    tutup: '#e9d8fd',
    acc: '#fed7aa',
    count: '#fdba74'
  };

  const selectStyle = {
    background: 'transparent',
    border: 'none',
    width: '100%',
    outline: 'none',
    fontSize: 12,
    padding: '3px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#333',
    fontWeight: 500
  };

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <span style={s.pageTitle}>Modul Kodifikasi</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <input 
            type="text" 
            placeholder="Search modul..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...s.input, width: 220, padding: '8px 12px', fontSize: 13 }}
          />
          <button style={s.btnPrimary} onClick={() => setIsEditing(true)}>+ Create Modul</button>
        </div>
      </div>

      <div style={{ ...s.tableWrap, overflowX: 'auto' }}>
        <table style={{ ...s.table, whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={s.th}>Tgl Input</th>
              <th style={s.th}>NIP</th>
              <th style={s.th}>H</th>
              <th style={s.th}>Nama Proyek</th>
              <th style={{ ...s.th, background: bgColors.kode }}>Kode Kabinet</th>
              <th style={{ ...s.th, background: bgColors.desc }}>Deskripsi Unit</th>
              <th style={{ ...s.th, background: bgColors.desc }}>Bentuk Box / Carcase</th>
              <th style={{ ...s.th, background: bgColors.desc }}>Finishing</th>
              <th style={{ ...s.th, background: bgColors.desc }}>Posisi Lapisan</th>
              <th style={{ ...s.th, background: bgColors.desc }}>Isi Box / Carcase</th>
              <th style={{ ...s.th, background: bgColors.tutup }}>Sistem Tutup</th>
              <th style={{ ...s.th, background: bgColors.tutup }}>Jumlah Tutup</th>
              <th style={{ ...s.th, background: bgColors.tutup }}>Jenis Tutup</th>
              <th style={{ ...s.th, background: bgColors.tutup }}>Handle</th>
              <th style={{ ...s.th, background: bgColors.acc }}>Assesories</th>
              <th style={{ ...s.th, background: bgColors.acc }}>Lampu</th>
              <th style={{ ...s.th, background: bgColors.acc }}>Plinth</th>
              <th style={{ ...s.th, background: bgColors.count }}>count</th>
              <th style={s.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan={19} style={s.empty}>Belum ada data modul</td></tr>
            ) : filteredData.map((m, i) => {
              const count = data.filter(d => d.kabinet === m.kabinet && m.kabinet !== '').length;
              return (
                <tr key={m.id || i}>
                  <td style={s.td}>{m.tgl}</td>
                  <td style={s.td}>{m.nip}</td>
                  <td style={s.td}>{m.tinggi}</td>
                  <td style={s.td}>{m.proyek}</td>
                  <td style={{ ...s.td, color: '#b91c1c', background: bgColors.kode, fontWeight: '600' }}>
                    {m.kabinet}
                  </td>
                  
                  {/* Deskripsi Unit */}
                  <td style={{ ...s.td, background: bgColors.desc, padding: '2px 4px' }}>
                    <select value={m.dunit || ''} onChange={e => handleInlineChange(m.id, 'dunit', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.deskripsiUnit || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Bentuk Box */}
                  <td style={{ ...s.td, background: bgColors.desc, padding: '2px 4px' }}>
                    <select value={m.bbox || ''} onChange={e => handleInlineChange(m.id, 'bbox', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.bentukBox || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Finishing */}
                  <td style={{ ...s.td, background: bgColors.desc, padding: '2px 4px' }}>
                    <select value={m.fin || ''} onChange={e => handleInlineChange(m.id, 'fin', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.finishing || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Posisi Lapisan */}
                  <td style={{ ...s.td, background: bgColors.desc, padding: '2px 4px' }}>
                    <select value={m.plap || ''} onChange={e => handleInlineChange(m.id, 'plap', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.posisiLapisan || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Isi Box */}
                  <td style={{ ...s.td, background: bgColors.desc, padding: '2px 4px' }}>
                    <select value={m.ibox || ''} onChange={e => handleInlineChange(m.id, 'ibox', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.isiBox || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Sistem Tutup */}
                  <td style={{ ...s.td, background: bgColors.tutup, padding: '2px 4px' }}>
                    <select value={m.stup || ''} onChange={e => handleInlineChange(m.id, 'stup', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.sistemTutup || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Jumlah Tutup */}
                  <td style={{ ...s.td, background: bgColors.tutup, padding: '2px 4px' }}>
                    <select value={m.jtutup || ''} onChange={e => handleInlineChange(m.id, 'jtutup', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.jumlahTutup || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Jenis Tutup */}
                  <td style={{ ...s.td, background: bgColors.tutup, padding: '2px 4px' }}>
                    <select value={m.jnistutup || ''} onChange={e => handleInlineChange(m.id, 'jnistutup', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.jenisTutup || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Handle */}
                  <td style={{ ...s.td, background: bgColors.tutup, padding: '2px 4px' }}>
                    <select value={m.hndl || ''} onChange={e => handleInlineChange(m.id, 'hndl', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.handle || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Accessories */}
                  <td style={{ ...s.td, background: bgColors.acc, padding: '2px 4px' }}>
                    <select value={m.acc || ''} onChange={e => handleInlineChange(m.id, 'acc', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.accessories || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Lampu */}
                  <td style={{ ...s.td, background: bgColors.acc, padding: '2px 4px' }}>
                    <select value={m.lmp || ''} onChange={e => handleInlineChange(m.id, 'lmp', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.lampu || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  {/* Plinth */}
                  <td style={{ ...s.td, background: bgColors.acc, padding: '2px 4px' }}>
                    <select value={m.plnt || ''} onChange={e => handleInlineChange(m.id, 'plnt', e.target.value)} style={selectStyle}>
                      <option value="">-</option>
                      {(masterData.plinth || []).map((opt, idx) => <option key={`${opt.code || ''}_${opt.name || ''}_${idx}`} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </td>

                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 'bold', background: bgColors.count }}>{count}</td>
                  <td style={{ ...s.td, textAlign:'right' }}>
                    <button style={s.btnSm} onClick={() => setEditingTemplateId(m.id)}>
                      Atur Template ({m.komponen ? m.komponen.length : 0})
                    </button>
                    <button
                      style={{ ...s.btnSm, background: '#ef4444', color: '#fff', border: 'none', marginLeft: 8 }}
                      onClick={() => deleteModul(m.id)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={isEditing} onClose={() => setIsEditing(false)} title="Create Modul">
        <div style={{ background: '#f9fafb', padding: 16, borderRadius: 10, marginBottom: 16, border: '0.5px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Informasi Data</div>
          <FormRow>
            <FormGroup label="Tanggal Input">
              <input style={s.input} type="date" value={formData.tgl} onChange={e => setFormData({ ...formData, tgl: e.target.value })} />
            </FormGroup>
            <FormGroup label="NIP">
              <input style={s.input} value={formData.nip} onChange={e => setFormData({ ...formData, nip: e.target.value })} />
            </FormGroup>
          </FormRow>
          <FormRow>
            <FormGroup label="Tinggi">
              <input style={s.input} value={formData.tinggi} onChange={e => setFormData({ ...formData, tinggi: e.target.value })} />
            </FormGroup>
            <FormGroup label="Nama Proyek">
              <input style={s.input} value={formData.proyek} onChange={e => setFormData({ ...formData, proyek: e.target.value })} />
            </FormGroup>
          </FormRow>
          <FormGroup label="Nama Produk">
            <input style={s.input} value={formData.produk} onChange={e => setFormData({ ...formData, produk: e.target.value })} />
          </FormGroup>
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 10, border: '0.5px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Komponen</div>
          <FormGroup label="Kode Cabinet">
            <input style={{ ...s.input, background: '#f3f4f6', fontWeight: 600 }} value={formData.kabinet} readOnly />
          </FormGroup>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {dropdowns.map(d => (
              <FormGroup key={d.key} label={d.label}>
                <SearchableSelect
                  value={formData[d.key]}
                  options={masterData[d.source] || []}
                  placeholder={`Select ${d.label}`}
                  onChange={val => setFormData({ ...formData, [d.key]: val })}
                />
              </FormGroup>
            ))}
          </div>
        </div>

        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setIsEditing(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={save}>Simpan Modul</button>
        </div>
      </Modal>
    </div>
  );
}
