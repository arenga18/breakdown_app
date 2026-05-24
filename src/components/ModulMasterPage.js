import React, { useState } from 'react';
import { s, Badge, Modal, FormGroup } from './UI';

export default function ModulMasterPage({ data, onChange }) {
  const [activeCat, setActiveCat] = useState('deskripsiUnit');
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const cats = [
    { key: 'deskripsiUnit', label: 'Deskripsi Unit' },
    { key: 'bentukBox', label: 'Bentuk Box/Carcase' },
    { key: 'finishing', label: 'Finishing' },
    { key: 'posisiLapisan', label: 'Posisi Lapisan' },
    { key: 'isiBox', label: 'Isi Box/Carcase' },
    { key: 'sistemTutup', label: 'Sistem Tutup' },
    { key: 'jumlahTutup', label: 'Jumlah Tutup' },
    { key: 'jenisTutup', label: 'Jenis Tutup' },
    { key: 'handle', label: 'Handle' },
    { key: 'accessories', label: 'Accessories' },
    { key: 'lampu', label: 'Lampu' },
    { key: 'plinth', label: 'Plinth' },
  ];

  const currentItems = data[activeCat] || [];

  // Filter based on search query
  const filteredItems = currentItems.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.code || '').toLowerCase().includes(q)
    );
  });

  function save() {
    const next = { ...data };
    if (isNew) {
      next[activeCat] = [...currentItems, formData];
    } else {
      const idx = currentItems.indexOf(editItem);
      next[activeCat] = [...currentItems];
      next[activeCat][idx] = formData;
    }
    onChange(next);
    close();
  }

  function del(item) {
    if (!window.confirm('Hapus item ini?')) return;
    const next = { ...data };
    next[activeCat] = currentItems.filter(i => i !== item);
    onChange(next);
  }

  function close() {
    setEditItem(null);
    setIsNew(false);
    setFormData({ name: '', code: '' });
  }

  return (
    <div style={{ ...s.page, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ ...s.pageHeader, flexShrink: 0 }}>
        <span style={s.pageTitle}>Modul Master Data</span>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
        {/* Sidebar categories */}
        <div style={{ width: 220, border: '0.5px solid #e0e0d8', borderRadius: 10, background: '#fff', overflowY: 'auto', flexShrink: 0 }}>
          {cats.map(c => (
            <div
              key={c.key}
              onClick={() => {
                setActiveCat(c.key);
                setSearchQuery(''); // Reset search when category changes
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 13,
                background: activeCat === c.key ? '#f0f0ec' : 'transparent',
                borderBottom: '0.5px solid #eeeee8',
                color: activeCat === c.key ? '#111' : '#666',
                fontWeight: activeCat === c.key ? 500 : 400,
              }}
            >
              {c.label}
              <span style={{ float: 'right', fontSize: 11, color: '#999', background: '#f5f5f0', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>
                {(data[c.key] || []).length}
              </span>
            </div>
          ))}
        </div>

        {/* Content list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center', flexShrink: 0, gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
                {cats.find(c => c.key === activeCat)?.label}
              </span>
              <input
                style={{ ...s.searchInput, maxWidth: 300 }}
                placeholder="Cari nama atau kode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  style={{ ...s.btnSm, border: 'none', background: '#f3f4f6', color: '#4b5563' }}
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </button>
              )}
            </div>
            <button style={s.btnPrimary} onClick={() => { setIsNew(true); setEditItem({}); }}>
              + Tambah
            </button>
          </div>

          <div style={{ ...s.tableWrap, flex: 1, overflow: 'auto', background: '#fff' }}>
            <table style={{ ...s.table, borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fafaf7' }}>
                <tr>
                  <th style={{ ...s.th, borderBottom: '1px solid #d5d5cd' }}>Nama</th>
                  <th style={{ ...s.th, borderBottom: '1px solid #d5d5cd' }}>Kode</th>
                  <th style={{ ...s.th, borderBottom: '1px solid #d5d5cd', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={s.empty}>
                      {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada data'}
                    </td>
                  </tr>
                ) : filteredItems.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf9' }}>
                    <td style={{ ...s.td, borderBottom: '0.5px solid #eeeee8' }}>{item.name}</td>
                    <td style={{ ...s.td, borderBottom: '0.5px solid #eeeee8' }}>
                      <Badge color="amber">{item.code}</Badge>
                    </td>
                    <td style={{ ...s.td, borderBottom: '0.5px solid #eeeee8', textAlign: 'right' }}>
                      <button style={s.btnSm} onClick={() => { setEditItem(item); setFormData(item); setIsNew(false); }}>
                        Edit
                      </button>
                      <button style={{ ...s.btnSm, marginLeft: 4, color: '#b91c1c' }} onClick={() => del(item)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={!!editItem}
        onClose={close}
        title={(isNew ? 'Tambah ' : 'Edit ') + cats.find(c => c.key === activeCat)?.label}
      >
        <FormGroup label="Nama">
          <input
            style={s.input}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Rak Botol"
          />
        </FormGroup>
        <FormGroup label="Kode">
          <input
            style={s.input}
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            placeholder="Contoh: br"
          />
        </FormGroup>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={close}>Batal</button>
          <button style={s.btnPrimary} onClick={save}>Simpan</button>
        </div>
      </Modal>
    </div>
  );
}
