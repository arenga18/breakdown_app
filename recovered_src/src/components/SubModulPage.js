import React, { useState } from 'react';
import { s, Badge, Modal, FormGroup } from './UI';
import SubModulTemplatePage from './SubModulTemplatePage';
import { SearchableCell } from './SharedModuleTable';

export default function SubModulPage({ data = [], parts = [], setupItems = [], categories = [], sections = [], stock = [], onChange }) {
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  function save() {
    if (!name) return;
    const next = [...data, { id: Date.now(), name, komponen: [] }];
    onChange(next);
    setIsAdding(false);
    setName('');
  }

  function del(id) {
    if (!window.confirm('Hapus sub-modul ini?')) return;
    onChange(data.filter(m => m.id !== id));
  }

  function saveTemplate(updated) {
    onChange(data.map(m => m.id === updated.id ? updated : m));
    setEditingTemplateId(null);
  }

  if (editingTemplateId) {
    const sub = data.find(m => m.id === editingTemplateId);
    return (
      <SubModulTemplatePage 
        modul={sub} 
        parts={parts} 
        setupItems={setupItems}
        categories={categories}
        sections={sections}
        stock={stock}
        onBack={() => setEditingTemplateId(null)} 
        onSave={saveTemplate} 
      />
    );
  }

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={s.pageHeader}>
        <span style={s.pageTitle}>Template Sub-Modul</span>
        <button style={s.btnPrimary} onClick={() => setIsAdding(true)}>+ Create Sub-Modul</button>
      </div>

      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
        Sub-Modul adalah kumpulan komponen yang sering digunakan bersama (contoh: Pintu Kaca, Drawer Box). 
        Anda bisa memasukkan sub-modul ini ke dalam Modul Utama atau langsung di Breakdown Project.
      </p>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nama Sub-Modul</th>
              <th style={s.th}>Jumlah Komponen</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={3} style={s.empty}>Belum ada data sub-modul</td></tr>
            ) : data.map((m) => (
              <tr key={m.id}>
                <td style={{ ...s.td, fontWeight: 600 }}>{m.name}</td>
                <td style={s.td}><Badge color="blue">{m.komponen ? m.komponen.length : 0} items</Badge></td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  <button style={s.btnSm} onClick={() => setEditingTemplateId(m.id)}>Atur Isi Template</button>
                  <button style={{ ...s.btnSm, marginLeft: 8, color: '#b91c1c' }} onClick={() => del(m.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="Tambah Sub-Modul Baru">
        <FormGroup label="Pilih dari Setup Komponen (Nama Sub-Modul)">
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 12px' }}>
            <SearchableCell 
              value={name || '...'} 
              options={setupItems.map(s => s.name)} 
              onSelect={v => setName(v)} 
            />
          </div>
        </FormGroup>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setIsAdding(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={save}>Simpan & Lanjut</button>
        </div>
      </Modal>
    </div>
  );
}
