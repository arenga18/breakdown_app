import React from 'react';
import { s } from './UI';

export default function SetupItemPage({ data, onChange }) {
  function handleAdd() {
    onChange([...data, { name: '', no: '•', ks: '[ks]' }]);
  }

  function handleUpdate(idx, key, val) {
    const next = [...data];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  }

  function handleDelete(idx) {
    onChange(data.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>Set-up / Accessory Items</h2>
        <button 
          onClick={handleAdd}
          style={{ 
            background: '#059669', color: '#fff', border: 'none', 
            padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' 
          }}
        >
          + Tambah Item
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #ddd', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9f9f7', borderBottom: '0.5px solid #ddd' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: 40 }}>#</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Nama Item / Komponen</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: 80 }}>No</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, width: 80 }}>KS</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, width: 60 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '0.5px solid #eee' }}>
                <td style={{ padding: '10px 14px', color: '#666' }}>{idx + 1}</td>
                <td style={{ padding: '10px 14px' }}>
                  <input 
                    style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} 
                    value={item.name} 
                    onChange={e => handleUpdate(idx, 'name', e.target.value)}
                    placeholder="Masukkan nama..."
                  />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <input 
                    style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} 
                    value={item.no} 
                    onChange={e => handleUpdate(idx, 'no', e.target.value)}
                  />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <input 
                    style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} 
                    value={item.ks} 
                    onChange={e => handleUpdate(idx, 'ks', e.target.value)}
                  />
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleDelete(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                  Belum ada data. Klik "+ Tambah Item" untuk memulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
