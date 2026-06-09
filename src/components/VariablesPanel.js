import React, { useState, useMemo } from 'react';
import { Badge } from './UI';

export default function VariablesPanel({ spec = {}, sections = [], onVariableClick, width = 320 }) {
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const variables = useMemo(() => {
    const vars = [];
    const sVals = spec.vals || {};
    const sAliases = spec.aliases || {};

    const definedKeys = new Set();
    (sections.length ? sections : spec.sections || []).forEach(sec => {
      if (!sec.rows) return;
      sec.rows.forEach(row => {
        const k = sec.name + '||' + row.label;
        definedKeys.add(k);
        vars.push({ key: sAliases[k] || row.alias || row.label.toUpperCase().replace(/\s+/g, '_'), val: sVals[k] || '', specKey: k, group: 'Spek' });
      });
    });

    Object.keys(sVals).forEach(k => {
      if (!definedKeys.has(k)) {
        const label = k.split('||').pop();
        vars.push({ key: sAliases[k] || label.toUpperCase().replace(/\s+/g, '_'), val: sVals[k], specKey: k, group: 'Spek' });
      }
    });

    const gc = spec.globalConstants || {};
    Object.entries(gc).forEach(([key, val]) => {
      vars.push({ key, val: String(val), specKey: '', group: 'Konstanta' });
    });

    return vars;
  }, [spec, sections]);

  const filteredSpek = useMemo(() => {
    return variables.filter(v => v.group === 'Spek' && (v.key.toLowerCase().includes(search.toLowerCase()) || String(v.val).toLowerCase().includes(search.toLowerCase())));
  }, [variables, search]);

  const filteredKonstanta = useMemo(() => {
    return variables.filter(v => v.group === 'Konstanta' && (v.key.toLowerCase().includes(search.toLowerCase()) || String(v.val).toLowerCase().includes(search.toLowerCase())));
  }, [variables, search]);

  const handleCopy = (varKey, e) => {
    const text = '=' + varKey;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(varKey);
      setTimeout(() => setCopiedKey(null), 1500);
    }).catch(err => console.error('Copy failed:', err));
  };

  return (
    <div style={{
      width, background: '#fff', borderLeft: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', height: '100%',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Daftar Variabel</span>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          {variables.filter(v => v.group === 'Spek').length} Spek · {variables.filter(v => v.group === 'Konstanta').length} Konstanta
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <input
          type="text"
          placeholder="Cari variabel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
          Klik nama variabel untuk menyalin formula (awalan '=').
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredSpek.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>Dari Spek</span>
              <Badge color="blue">{filteredSpek.length}</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredSpek.map(v => (
                <div
                  key={v.key}
                  onClick={(e) => {
                    if (onVariableClick && v.specKey) onVariableClick(v.specKey);
                    else handleCopy(v.key, e);
                  }}
                  style={{
                    padding: '6px 8px', background: '#f9fafb', borderRadius: 6,
                    border: '1px solid #f3f4f6', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#eff6ff';
                    e.currentTarget.style.borderColor = '#bfdbfe';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#f3f4f6';
                  }}
                  title={v.specKey ? `Klik untuk redirect atau salin =${v.key}` : `Klik untuk salin =${v.key}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <code style={{ color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, maxWidth: '140px' }} title={v.key}>{v.key}</code>
                    <span style={{ fontSize: 13, color: '#334155', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.val}>{v.val}</span>
                  </div>
                  {copiedKey === v.key && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(240, 253, 244, 0.95)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6, color: '#15803d', fontWeight: 700, fontSize: 11,
                    }}>
                      ✓ Tersalin!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredKonstanta.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>Konstanta Global</span>
              <Badge color="green">{filteredKonstanta.length}</Badge>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {filteredKonstanta.map(v => (
                <div
                  key={v.key}
                  onClick={(e) => handleCopy(v.key, e)}
                  style={{
                    padding: '3px 8px', background: '#f0fdf4', borderRadius: 4,
                    border: '1px solid #d1fae5', fontSize: 12, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative',
                  }}
                >
                  <code style={{ color: '#059669', fontWeight: 600, fontSize: 11 }}>{v.key}</code>
                  <span style={{ color: '#334155' }}>=</span>
                  <span style={{ color: '#334155', fontWeight: 500 }}>{v.val}</span>
                  {copiedKey === v.key && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(240, 253, 244, 0.95)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 4, color: '#15803d', fontWeight: 700, fontSize: 10,
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredSpek.length === 0 && filteredKonstanta.length === 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0', textAlign: 'center' }}>
            Tidak ada hasil
          </div>
        )}
      </div>
    </div>
  );
}
