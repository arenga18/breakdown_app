import React, { useState } from 'react';
import { s, Modal, FormGroup, FormRow, Badge } from './UI';

const empty = { id: '', kat: '', nama: '', tebal: '', sat: '', ket: '' };

function getPageNumbers(current, total) {
  const pages = [];
  const delta = 1;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
}

export default function StockPage({ data, onChange, readOnly = false }) {
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editIdx, setEditIdx] = useState(null);

  const filtered = data.filter(s =>
    s.nama.toLowerCase().includes(filter.toLowerCase()) || 
    (s.id && s.id.toString().includes(filter)) ||
    (s.kat && s.kat.toLowerCase().includes(filter.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

  function handleUpdate(idx, key, val) {
    const next = [...data];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  }

  function openAdd() { setForm(empty); setEditIdx(null); setModal(true); }
  function save() {
    if (!form.nama) return;
    const next = [...data];
    next.push(form);
    onChange(next); setModal(false);
  }
  function del(idx) { 
    const next = data.filter((_, i) => i !== idx);
    onChange(next); 
  }
  function f(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })); }

  const cellInput = { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', fontFamily: 'inherit' };

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>Kebutuhan Material (Stock)</h2>
        {!readOnly && (
          <button 
            onClick={openAdd}
            style={{ 
              background: '#059669', color: '#fff', border: 'none', 
              padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' 
            }}
          >
            + Tambah Item
          </button>
        )}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input 
          style={s.searchInput} 
          placeholder="Cari kategori, nama barang, atau ID..." 
          value={filter} 
          onChange={e => { setFilter(e.target.value); setCurrentPage(1); }} 
        />
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #ddd', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9f9f7', borderBottom: '0.5px solid #ddd' }}>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, width: 40 }}>No</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: 140 }}>Kategori</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: 100 }}>ID Barang</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Nama Barang</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, width: 70 }}>Tebal</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: 80 }}>Satuan</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Keterangan</th>
              {!readOnly && <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, width: 60 }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
              {filtered.length === 0 ? (
              <tr><td colSpan={readOnly ? 6 : 7} style={s.empty}>Data tidak ditemukan</td></tr>
            ) : paginatedData.map((item, i) => {
              const realIdx = data.indexOf(item);
              return (
                <tr key={i} style={{ borderBottom: '0.5px solid #eee' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#999' }}>{startIndex + i + 1}</td>
                  <td style={{ padding: '6px 14px' }}>
                    <input 
                      style={cellInput} 
                      value={item.kat} 
                      onChange={e => handleUpdate(realIdx, 'kat', e.target.value)} 
                      placeholder=""
                    />
                  </td>
                  <td style={{ padding: '6px 14px' }}>
                    <input 
                      style={{ ...cellInput, fontFamily: 'monospace', fontSize: 12 }} 
                      value={item.id} 
                      onChange={e => handleUpdate(realIdx, 'id', e.target.value)} 
                      placeholder=""
                    />
                  </td>
                  <td style={{ padding: '6px 14px' }}>
                    <input 
                      style={{ ...cellInput, fontWeight: 500 }} 
                      value={item.nama} 
                      onChange={e => handleUpdate(realIdx, 'nama', e.target.value)} 
                      placeholder=""
                    />
                  </td>
                  <td style={{ padding: '6px 14px', textAlign: 'center' }}>
                    <input 
                      style={{ ...cellInput, textAlign: 'center' }} 
                      type="number"
                      value={item.tebal} 
                      onChange={e => handleUpdate(realIdx, 'tebal', e.target.value)} 
                    />
                  </td>
                  <td style={{ padding: '6px 14px' }}>
                    <input 
                      style={cellInput} 
                      value={item.sat} 
                      onChange={e => handleUpdate(realIdx, 'sat', e.target.value)} 
                      placeholder=""
                    />
                  </td>
                  <td style={{ padding: '6px 14px' }}>
                    <input 
                      style={{ ...cellInput, color: '#666', fontSize: 12 }} 
                      value={item.ket} 
                      onChange={e => handleUpdate(realIdx, 'ket', e.target.value)} 
                      placeholder=""
                    />
                  </td>
                  {!readOnly && (
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button 
                        onClick={() => del(realIdx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {(totalPages > 1 || filtered.length > 0) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          padding: '12px 16px',
          background: '#fff',
          borderRadius: 8,
          border: '0.5px solid #e0e0d8',
          flexWrap: 'wrap',
          gap: 12,
          fontFamily: 'inherit'
        }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            Menampilkan <span style={{ fontWeight: 600, color: '#111' }}>{filtered.length === 0 ? 0 : startIndex + 1}</span> - <span style={{ fontWeight: 600, color: '#111' }}>{Math.min(startIndex + pageSize, filtered.length)}</span> dari <span style={{ fontWeight: 600, color: '#111' }}>{filtered.length}</span> item
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Tampilkan:</span>
              <select 
                value={pageSize} 
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '0.5px solid #d5d5cd',
                  background: '#fafaf7',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                  color: '#111'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                disabled={activePage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '0.5px solid ' + (activePage === 1 ? '#e0e0d8' : '#d5d5cd'),
                  background: activePage === 1 ? '#fafaf7' : '#fff',
                  color: activePage === 1 ? '#bbb' : '#111',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
              >
                Sebelumnya
              </button>

              {getPageNumbers(activePage, totalPages).map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} style={{ padding: '4px 6px', fontSize: 12, color: '#999' }}>
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '0.5px solid ' + (activePage === p ? '#111' : '#d5d5cd'),
                      background: activePage === p ? '#111' : '#fff',
                      color: activePage === p ? '#fff' : '#111',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: activePage === p ? 600 : 400,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '0.5px solid ' + (activePage === totalPages ? '#e0e0d8' : '#d5d5cd'),
                  background: activePage === totalPages ? '#fafaf7' : '#fff',
                  color: activePage === totalPages ? '#bbb' : '#111',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Tambah Item Baru">
        <FormGroup label="Kategori">
          <input style={s.input} value={form.kat} onChange={f('kat')} placeholder="Plywood / Fitting / dll" />
        </FormGroup>
        <FormRow>
          <FormGroup label="ID Barang">
            <input style={s.input} value={form.id} onChange={f('id')} placeholder="ID" />
          </FormGroup>
          <FormGroup label="Nama Barang">
            <input style={s.input} value={form.nama} onChange={f('nama')} placeholder="Nama Barang" />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Tebal">
            <input style={s.input} type="number" value={form.tebal} onChange={f('tebal')} placeholder="0" />
          </FormGroup>
          <FormGroup label="Satuan">
            <input style={s.input} value={form.sat} onChange={f('sat')} placeholder="Lbr / pcs / mtr" />
          </FormGroup>
        </FormRow>
        <FormGroup label="Keterangan">
          <input style={s.input} value={form.ket} onChange={f('ket')} placeholder="Catatan tambahan" />
        </FormGroup>
        <div style={s.modalActions}>
          <button style={s.btn} onClick={() => setModal(false)}>Batal</button>
          <button style={s.btnPrimary} onClick={save}>Tambah ke Stock</button>
        </div>
      </Modal>
    </div>
  );
}
