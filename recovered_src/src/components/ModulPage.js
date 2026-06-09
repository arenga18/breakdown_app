import React, { useState, useEffect } from 'react';
import { s, Badge, Modal, FormGroup, FormRow, SearchableSelect } from './UI';
import ModulTemplatePage from './ModulTemplatePage';

export default function ModulPage({ data, parts, masterData, setupItems = [], subModuls = [], onChange }) {
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

  if (editingTemplateId) {
    const modul = data.find(m => m.id === editingTemplateId);
    return <ModulTemplatePage modul={modul} parts={parts} setupItems={setupItems} subModuls={subModuls} onBack={() => setEditingTemplateId(null)} onSave={saveTemplate} />;
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
                  <td style={{ ...s.td, color: '#b91c1c', background: bgColors.kode, fontWeight: '500' }}>
                    {m.kabinet}
                  </td>
                  <td style={{ ...s.td, background: bgColors.desc }}>{m.dunit || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.desc }}>{m.bbox || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.desc }}>{m.fin || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.desc }}>{m.plap || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.desc }}>{m.ibox || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.tutup }}>{m.stup || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.tutup }}>{m.jtutup || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.tutup }}>{m.jnistutup || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.tutup }}>{m.hndl || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.acc }}>{m.acc || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.acc }}>{m.lmp || '-'}</td>
                  <td style={{ ...s.td, background: bgColors.acc }}>{m.plnt || '-'}</td>
                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 'bold', background: bgColors.count }}>{count}</td>
                  <td style={{ ...s.td, textAlign:'right' }}>
                    <button style={s.btnSm} onClick={() => setEditingTemplateId(m.id)}>
                      Atur Template ({m.komponen ? m.komponen.length : 0})
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
