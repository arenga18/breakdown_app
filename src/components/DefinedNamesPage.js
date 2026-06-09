import React, { useState, useEffect, useMemo } from 'react';
import { s, Modal, FormGroup } from './UI';

const C = {
  bg: '#f7f7f5',
  surface: '#ffffff',
  border: '#e8e8e2',
  borderLight: '#f0f0ea',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  accent: '#111827',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  blueBorder: '#dbeafe',
  red: '#b91c1c',
  redBg: '#fef2f2',
  sectionBg: '#f4f4f0',
};

export default function DefinedNamesPage({ globalConstants = {}, onChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize local rows from globalConstants prop when keys change or on mount
  useEffect(() => {
    const currentKeys = rows.map(r => r.key).sort().join(',');
    const propKeys = Object.keys(globalConstants).sort().join(',');
    if (currentKeys !== propKeys || rows.length === 0) {
      setRows(Object.entries(globalConstants).map(([k, v]) => ({
        id: Math.random().toString(36).substring(2, 9),
        key: k.toUpperCase(),
        value: String(v)
      })));
    }
  }, [globalConstants]);

  // Propagate changes to parent
  const propagateChanges = (currentRows) => {
    const obj = {};
    const seenKeys = new Set();
    let hasDuplicate = false;

    currentRows.forEach(r => {
      const trimmedKey = r.key.trim().toUpperCase();
      if (trimmedKey) {
        if (seenKeys.has(trimmedKey)) {
          hasDuplicate = true;
        }
        seenKeys.add(trimmedKey);
        obj[trimmedKey] = parseFloat(r.value) || 0;
      }
    });

    if (hasDuplicate) {
      setErrorMsg('Peringatan: Ada nama defined name yang duplikat!');
    } else {
      setErrorMsg('');
    }

    onChange(obj);
  };

  const handleRowChange = (id, field, val) => {
    let sanitized = val;
    if (field === 'key') {
      sanitized = val.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    }
    const nextRows = rows.map(r => r.id === id ? { ...r, [field]: sanitized } : r);
    setRows(nextRows);
    propagateChanges(nextRows);
  };

  const handleAdd = () => {
    // Generate a unique key name
    let index = 1;
    let newKey = `NEW_CONSTANT_${index}`;
    const existingKeys = new Set(rows.map(r => r.key));
    while (existingKeys.has(newKey)) {
      index++;
      newKey = `NEW_CONSTANT_${index}`;
    }

    const nextRows = [
      ...rows,
      {
        id: Math.random().toString(36).substring(2, 9),
        key: newKey,
        value: '0'
      }
    ];
    setRows(nextRows);
    propagateChanges(nextRows);
  };

  const handleDelete = (id) => {
    const nextRows = rows.filter(r => r.id !== id);
    setRows(nextRows);
    propagateChanges(nextRows);
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r => r.key.toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      <div style={s.pageHeader}>
        <div>
          <span style={s.pageTitle}>🏷 Defined Names (Global Constants)</span>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            Kelola konstanta global yang dapat digunakan di seluruh sheet dan langkah modul dalam formula Excel (misalnya `=TRIM`, `=MINIFIX_HETTICH`).
          </div>
        </div>
        <button style={s.btnPrimary} onClick={handleAdd}>
          + Tambah Constant
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          style={{ ...s.searchInput, maxWidth: 320 }}
          placeholder="Cari nama konstanta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {errorMsg && (
          <span style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>
            ⚠️ {errorMsg}
          </span>
        )}
      </div>

      <div style={{ ...s.tableWrap, background: C.surface }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: '40%', borderRight: `1px solid ${C.borderLight}` }}>Nama Konstanta (Key)</th>
              <th style={{ ...s.th, width: '40%', borderRight: `1px solid ${C.borderLight}` }}>Nilai (Value)</th>
              <th style={{ ...s.th, width: '20%', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={3} style={s.empty}>
                  {search ? 'Tidak ada konstanta yang cocok dengan pencarian.' : 'Belum ada konstanta global. Klik "+ Tambah Constant" untuk membuat.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  {/* Key */}
                  <td style={{ ...s.td, borderRight: `1px solid ${C.borderLight}`, padding: 4 }}>
                    <input
                      value={row.key}
                      onChange={e => handleRowChange(row.id, 'key', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        outline: 'none',
                        padding: '6px 8px',
                        boxSizing: 'border-box'
                      }}
                      placeholder="NAMA_KONSTANTA"
                    />
                  </td>
                  {/* Value */}
                  <td style={{ ...s.td, borderRight: `1px solid ${C.borderLight}`, padding: 4 }}>
                    <input
                      value={row.value}
                      onChange={e => handleRowChange(row.id, 'value', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: '#16a34a',
                        fontWeight: 600,
                        outline: 'none',
                        padding: '6px 8px',
                        boxSizing: 'border-box'
                      }}
                      placeholder="0"
                    />
                  </td>
                  {/* Action */}
                  <td style={{ ...s.td, textAlign: 'center', padding: '4px 8px' }}>
                    <button
                      title="Hapus Konstanta"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: C.textMuted,
                        fontSize: 13,
                        transition: 'all 0.1s'
                      }}
                      onClick={() => handleDelete(row.id)}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = C.redBg;
                        e.currentTarget.style.color = C.red;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = C.textMuted;
                      }}
                    >
                      ✕ Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
