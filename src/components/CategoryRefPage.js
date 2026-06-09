import React, { useMemo } from 'react';

const C = {
  bg: '#f7f7f5',
  surface: '#ffffff',
  border: '#e8e8e2',
  borderLight: '#f0f0ea',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  sectionBg: '#f4f4f0',
};

const typeLabel = {
  select: 'Dropdown',
  text: 'Teks',
  number: 'Angka',
  checkbox: 'Checkbox',
};

const TF_MAP = {
  '1': 'lapisan1',
  '11': 'kabinet1',
  '2': 'lapisan2',
  '9': 'tip_lap_inv',
  '3': 'lapisan3',
  '22': 'kabinet2',
  '4': 'lapisan4',
  '5': 'lapisan5',
  '6': 'lapisan6',
  '33': 'kabinet3',
  '7': 'lapisan7'
};

const TE_MAP = {
  '11': 'edgingkab1',
  '9': 'edginginv', 
  '1': 'edging1',
  '7': 'trim21',
  '8': 'trim22',
  '6': 'trim38',
  '2': 'edging2',
  '3': 'edging3',
  '4': 'edging4',
  '22': 'edgingkab2',
  '5': 'edging5',
  '33': 'edgingkab3',
  '66': 'edging6'
};

function getSpekRelation(catCode, itemCode) {
  if (!itemCode) return null;
  const strCode = String(itemCode).trim();
  if (catCode === 'tf' || catCode === 'lap_luar' || catCode === 'lap_dalam') {
    return TF_MAP[strCode] ? `${TF_MAP[strCode]} (HPL)` : null;
  }
  if (catCode === 'te' || catCode === 'edg') {
    return TE_MAP[strCode] ? `${TE_MAP[strCode]} (Edg)` : null;
  }
  return null;
}

function normalizeItems(items = []) {
  return items.map((item, i) => {
    if (typeof item === 'string') return { code: '', val: i + 1, name: item, tebal: 0.0 };
    return {
      code: item.code ?? '',
      val: item.val ?? i + 1,
      name: item.name ?? '',
      tebal: item.tebal !== undefined ? parseFloat(item.tebal) || 0.0 : 0.0
    };
  });
}

export default function CategoryRefPage({ categories = [] }) {
  const normalized = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      items: normalizeItems(cat.items || []),
    })),
    [categories]
  );

  if (normalized.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>
        Belum ada category. Tambahkan melalui halaman <strong>Category</strong>.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', background: C.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Referensi Category</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>
          Daftar seluruh tabel referensi yang digunakan di breakdown. Edit melalui halaman Category.
        </p>
      </div>

      {/* Grid of category tables */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        alignItems: 'start',
      }}>
        {normalized.map((cat, ci) => {
          const isThkCat = ['tf', 'lap_luar', 'lap_dalam', 'te', 'edg'].includes(cat.code);
          return (
            <div
              key={ci}
              style={{
                background: C.surface,
                border: `0.5px solid ${C.border}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div style={{
                padding: '10px 14px',
                background: C.sectionBg,
                borderBottom: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{cat.name}</span>
                  <span style={{ fontSize: 11, color: C.blue, marginLeft: 8, fontFamily: 'monospace' }}>{cat.code}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: C.textMuted,
                    background: C.borderLight, padding: '2px 7px', borderRadius: 20,
                    border: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {typeLabel[cat.fieldtype] || cat.fieldtype}
                  </span>
                  <span style={{ fontSize: 11, color: C.textFaint }}>{cat.items.length} item</span>
                </div>
              </div>

              {/* Table */}
              {cat.items.length === 0 ? (
                <div style={{ padding: '14px 16px', fontSize: 12, color: C.textFaint, textAlign: 'center' }}>
                  Belum ada item.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'inherit' }}>
                  <thead>
                    <tr style={{ background: C.sectionBg }}>
                      <th style={{
                        padding: '6px 8px', textAlign: 'center', width: 36,
                        fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em',
                        textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`,
                        borderRight: `1px solid ${C.borderLight}`,
                      }}>Val</th>
                      <th style={{
                        padding: '6px 10px', textAlign: 'left',
                        fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em',
                        textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`,
                        borderRight: `1px solid ${C.borderLight}`,
                      }}>Name / Value</th>
                      {isThkCat && (
                        <th style={{
                          padding: '6px 8px', textAlign: 'center', width: 44,
                          fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em',
                          textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`,
                          borderRight: `1px solid ${C.borderLight}`,
                        }}>Tebal</th>
                      )}
                      <th style={{
                        padding: '6px 8px', textAlign: 'center', width: 50,
                        fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em',
                        textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`,
                      }}>
                        Code
                        <span
                          title="Angka lookup key dari breakdown (index/match)."
                          style={{ marginLeft: 3, fontSize: 10, color: C.blue, cursor: 'help' }}
                        >?</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, ii) => (
                      <tr
                        key={ii}
                        style={{
                          borderBottom: ii < cat.items.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                          background: ii % 2 === 0 ? C.surface : '#fafaf8',
                        }}
                      >
                        <td style={{
                          padding: '5px 8px', textAlign: 'center',
                          borderRight: `1px solid ${C.borderLight}`,
                          fontSize: 12, fontWeight: 600, color: C.textMuted,
                        }}>
                          {item.val}
                        </td>
                        <td style={{
                          padding: '5px 10px',
                          borderRight: `1px solid ${C.borderLight}`,
                          fontSize: 12, color: C.text,
                        }}>
                          <div>{item.name || <span style={{ color: C.textFaint, fontStyle: 'italic' }}>—</span>}</div>
                          {(() => {
                            const relation = getSpekRelation(cat.code, item.code);
                            if (relation) {
                              return (
                                <div style={{ fontSize: 10, color: C.blue, fontWeight: 600, marginTop: 3, display: 'inline-block', background: C.blueBg, padding: '1px 5px', borderRadius: 4 }}>
                                  🔗 Spek: {relation}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        {isThkCat && (
                          <td style={{
                            padding: '5px 8px', textAlign: 'center',
                            borderRight: `1px solid ${C.borderLight}`,
                            fontSize: 12, color: '#16a34a', fontWeight: 600,
                          }}>
                            {item.tebal}
                          </td>
                        )}
                        <td style={{
                          padding: '5px 8px', textAlign: 'center',
                          fontSize: 12, fontWeight: 700, color: C.blue, fontFamily: 'monospace',
                        }}>
                          {item.code !== '' && item.code !== undefined
                            ? item.code
                            : <span style={{ color: C.textFaint, fontWeight: 400 }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
