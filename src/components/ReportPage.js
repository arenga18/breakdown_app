import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { s, Badge } from './UI';
import { calcBreakdownItem } from '../utils/breakdownCalc';
import RekapPage from './RekapPage'; // Reusing existing RekapPage for BOM
import bpbSettingTemplate from '../utils/bpb_setting_full.json';
import { calculateBpbRows } from '../utils/bpbCalc';
import bomSettingTemplate from '../utils/bom_setting_full.json';
import { calculateBomRows } from '../utils/bomCalc';
import VariablesPanel from './VariablesPanel';


const EditableDiv = React.forwardRef(({ children, style, compact, ...props }, ref) => (
  <div 
    ref={ref}
    contentEditable 
    suppressContentEditableWarning 
    style={{ outline: 'none', minHeight: compact ? '12px' : '18px', display: 'inline-block', minWidth: '100%', ...style }} 
    {...props}
  >
    {children}
  </div>
));

const LookupCell = ({ value, style }) => (
  <span style={{ display: 'block', minHeight: 18, ...style }}>{value ?? ''}</span>
);

const BpbEditableCell = ({ rawValue, displayValue, onSave, style, displayOnly = false, onContextMenu }) => {
  const [isEditing, setIsEditing] = useState(false);
  const editStartRef = React.useRef('');
  const ref = React.useRef(null);

  const shownValue = displayValue ?? '';
  const valueToShow = displayOnly
    ? shownValue
    : (isEditing ? (rawValue || '') : shownValue);

  React.useEffect(() => {
    if (!isEditing && ref.current) {
      ref.current.innerText = shownValue;
    }
  }, [shownValue, isEditing]);

  return (
    <EditableDiv
      ref={ref}
      style={style}
      onFocus={() => {
        setIsEditing(true);
        editStartRef.current = shownValue;
        setTimeout(() => {
          if (ref.current) {
            ref.current.innerText = displayOnly ? shownValue : (rawValue || '');
          }
        }, 0);
      }}
      onBlur={(e) => {
        setIsEditing(false);
        const nextVal = e.target.innerText;
        if (nextVal !== editStartRef.current) {
          onSave(nextVal);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
      }}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e); } : undefined}
    >
      {valueToShow}
    </EditableDiv>
  );
};

const REPORT_COL_KEYS = ['no', 'id_barang', 'nama_barang', 'jml', 'satuan', 'keterangan'];
const DEFAULT_REPORT_COL_WIDTHS = {
  no: 50,
  id_barang: 120,
  nama_barang: 280,
  jml: 70,
  satuan: 80,
  keterangan: 180,
};

function useColumnWidths(storageKey) {
  const [widths, setWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...DEFAULT_REPORT_COL_WIDTHS, ...JSON.parse(saved) } : { ...DEFAULT_REPORT_COL_WIDTHS };
    } catch (_) {
      return { ...DEFAULT_REPORT_COL_WIDTHS };
    }
  });

  const startResize = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[colKey];
    const onMove = (ev) => {
      const next = Math.max(36, startW + ev.clientX - startX);
      setWidths((w) => ({ ...w, [colKey]: next }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setWidths((w) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(w));
        } catch (err) {
          console.error(err);
        }
        return w;
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return { widths, startResize };
}

const ResizableTh = ({ colKey, widths, startResize, children, style, className }) => (
  <th
    className={className}
    style={{
      ...style,
      width: widths[colKey],
      position: 'relative',
      userSelect: 'none',
      overflow: 'hidden',
    }}
  >
    {children}
    <span
      className="no-print col-resize-handle"
      onMouseDown={(e) => startResize(colKey, e)}
      title="Drag untuk ubah lebar kolom"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 8,
        cursor: 'col-resize',
        zIndex: 2,
      }}
    />
  </th>
);

const MaterialReportTable = ({
  rows,
  colWidths,
  startResize,
  onDeleteRow,
  onUpdateCell,
  onCellContextMenu,
  thStyle,
  tdStyle,
  variant = 'bpb',
}) => {
  const colLabels = {
    no: 'NO',
    id_barang: 'ID BARANG',
    nama_barang: 'NAMA BARANG',
    jml: 'JML',
    satuan: 'SATUAN',
    keterangan: 'KETERANGAN',
  };

  const cellOverflow = { overflow: 'hidden', textOverflow: 'ellipsis' };

  const renderRow = (row) => {
    const rowKey = row.row_idx;
    const isEmptyRow = !row.id_barang_display && !row.nama_barang_display && !row.satuan_display && !row.keterangan;
    const isHeaderRow = variant === 'bom'
      && !row.id_barang_display
      && !row.satuan_display
      && !row.keterangan
      && (row.jml_display === '' || row.jml_display === undefined || row.jml_display === 0);
    const isZero = row.jml_display === 0;
    const rowBg = variant === 'bom' && isHeaderRow ? '#f8fafc' : '#fff';

    const deleteBtn = (
      <td className="td-print no-print" style={{ ...tdStyle, width: 36, padding: '4px 6px' }}>
        <button
          type="button"
          title="Hapus baris"
          onClick={() => onDeleteRow(row.row_idx)}
          style={{
            width: 24,
            height: 24,
            border: '1px solid #fecaca',
            borderRadius: 4,
            background: '#fff',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </td>
    );

    if (isEmptyRow) {
      return (
        <tr key={rowKey} style={{ background: rowBg }}>
          <td className="td-print" style={{ ...tdStyle, fontWeight: 700, ...cellOverflow }}>{row.line_no || ''}</td>
          <td className="td-print" style={{ ...tdStyle, fontFamily: 'monospace', ...cellOverflow }}>
            <LookupCell value={row.id_barang_display} />
          </td>
          <td className="td-print" style={{ ...tdStyle, textAlign: 'left', ...cellOverflow }}>
            <BpbEditableCell
              rawValue={row.manual_nama !== undefined ? row.manual_nama : (row.nama_barang || '')}
              displayValue={row.nama_barang_display}
              onSave={(val) => onUpdateCell(row.row_idx, 'nama', val)}
            />
          </td>
          <td className="td-print" style={{ ...tdStyle, ...cellOverflow }}>
            <BpbEditableCell
              displayOnly
              rawValue={row.manual_jml ?? row.jml_display}
              displayValue={row.jml_display}
              onSave={(val) => onUpdateCell(row.row_idx, 'jml', val)}
              onContextMenu={onCellContextMenu ? (e) => onCellContextMenu(e, row.row_idx) : undefined}
            />
          </td>
          <td className="td-print" style={{ ...tdStyle, ...cellOverflow }}>
            <LookupCell value={row.satuan_display} />
          </td>
          <td className="td-print" style={{ ...tdStyle, textAlign: 'left', ...cellOverflow }}>
            <BpbEditableCell
              rawValue={row.manual_keterangan !== undefined ? row.manual_keterangan : (row.keterangan || '')}
              displayValue={row.keterangan}
              onSave={(val) => onUpdateCell(row.row_idx, 'keterangan', val)}
            />
          </td>
          {deleteBtn}
        </tr>
      );
    }

    return (
      <tr key={rowKey} style={{ background: rowBg }}>
        <td className="td-print" style={{ ...tdStyle, fontWeight: 700, ...cellOverflow }}>{row.line_no || ''}</td>
        <td className="td-print" style={{ ...tdStyle, fontFamily: 'monospace', ...cellOverflow }}>
          <LookupCell value={row.id_barang_display} />
        </td>
        <td className="td-print" style={{
          ...tdStyle,
          textAlign: 'left',
          fontWeight: (row.line_no || isHeaderRow) ? 600 : 400,
          fontStyle: isHeaderRow ? 'italic' : 'normal',
          ...cellOverflow,
        }}>
          <BpbEditableCell
            rawValue={row.manual_nama !== undefined ? row.manual_nama : (row.nama_barang || '')}
            displayValue={row.nama_barang_display}
            onSave={(val) => onUpdateCell(row.row_idx, 'nama', val)}
          />
        </td>
        <td className="td-print" style={{
          ...tdStyle,
          fontWeight: 700,
          color: isZero ? '#94a3b8' : '#e11d48',
          fontStyle: isZero ? 'italic' : 'normal',
          ...cellOverflow,
        }}>
          <BpbEditableCell
            displayOnly
            rawValue={row.manual_jml ?? row.jml_display}
            displayValue={row.jml_display}
            onSave={(val) => onUpdateCell(row.row_idx, 'jml', val)}
            onContextMenu={onCellContextMenu ? (e) => onCellContextMenu(e, row.row_idx) : undefined}
          />
        </td>
        <td className="td-print" style={{ ...tdStyle, ...cellOverflow }}>
          <LookupCell value={row.satuan_display} />
        </td>
        <td className="td-print" style={{ ...tdStyle, textAlign: 'left', ...cellOverflow }}>
          <BpbEditableCell
            rawValue={row.manual_keterangan !== undefined ? row.manual_keterangan : (row.keterangan || '')}
            displayValue={row.keterangan}
            onSave={(val) => onUpdateCell(row.row_idx, 'keterangan', val)}
          />
        </td>
        {deleteBtn}
      </tr>
    );
  };

  return (
    <table className="table-print" style={{ ...s.table, borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
      <colgroup>
        {REPORT_COL_KEYS.map((key) => (
          <col key={key} style={{ width: colWidths[key] }} />
        ))}
        <col className="no-print" style={{ width: 36 }} />
      </colgroup>
      <thead>
        <tr>
          {REPORT_COL_KEYS.map((key) => (
            <ResizableTh
              key={key}
              colKey={key}
              widths={colWidths}
              startResize={startResize}
              className="th-print"
              style={{
                ...thStyle,
                textAlign: key === 'nama_barang' || key === 'keterangan' ? 'left' : thStyle.textAlign,
              }}
            >
              {colLabels[key]}
            </ResizableTh>
          ))}
          <th className="th-print no-print" style={{ ...thStyle, width: 36 }} title="Hapus baris" />
        </tr>
      </thead>
      <tbody>
        {rows.map(renderRow)}
      </tbody>
    </table>
  );
};

const REKAP_BORDER = '1px solid #000';
const REKAP_FONT = "'Times New Roman', Times, serif";
const REKAP_PRINT_PAGE = '216mm 279mm'; // US Letter
const REKAP_PRINT_MARGIN = '30px 16px'; // atas/bawah kiri/kanan

const formatOrderDate = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  const parts = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).split(' ');
  return parts.length === 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : val;
};

const buildRowSpanMap = (items, getter) => {
  const map = {};
  let i = 0;
  while (i < items.length) {
    const val = getter(items[i]);
    let j = i + 1;
    while (j < items.length && getter(items[j]) === val) j += 1;
    map[i] = { show: true, span: j - i };
    for (let k = i + 1; k < j; k += 1) map[k] = { show: false };
    i = j;
  }
  return map;
};

const RekapCheckRow = ({ checked, onClick, children }) => (
  <tr onClick={onClick} style={{ cursor: 'pointer' }}>
    <td style={{ border: REKAP_BORDER, width: 24, textAlign: 'center', padding: '4px 6px', fontWeight: 700 }}>
      {checked ? '√' : ''}
    </td>
    <td style={{ border: REKAP_BORDER, padding: '4px 8px' }}>{children}</td>
  </tr>
);

const StatusProyekBox = ({ statusPend, setStatusPend }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit' }}>
    <tbody>
      <tr>
        <td colSpan={2} style={{ border: REKAP_BORDER, fontWeight: 700, textAlign: 'center', padding: '5px 8px' }}>
          STATUS PROYEK
        </td>
      </tr>
      <RekapCheckRow checked={statusPend === 0} onClick={() => setStatusPend(0)}>ADA PENDINGAN</RekapCheckRow>
      <RekapCheckRow checked={statusPend === 1} onClick={() => setStatusPend(1)}>TIDAK ADA PEND.</RekapCheckRow>
    </tbody>
  </table>
);

const AntiRayapBox = ({ antiRayap, setAntiRayap }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit' }}>
    <tbody>
      <tr>
        <td colSpan={2} style={{ border: REKAP_BORDER, fontWeight: 700, textAlign: 'center', padding: '5px 8px' }}>
          ANTI RAYAP/TIDAK
        </td>
      </tr>
      <tr>
        <td
          style={{ border: REKAP_BORDER, width: '50%', padding: '4px 8px', cursor: 'pointer' }}
          onClick={() => setAntiRayap(0)}
        >
          <span style={{ display: 'inline-block', width: 16, fontWeight: 700 }}>{antiRayap === 0 ? '√' : ''}</span>
          YA
        </td>
        <td
          style={{ border: REKAP_BORDER, width: '50%', padding: '4px 8px', cursor: 'pointer' }}
          onClick={() => setAntiRayap(1)}
        >
          <span style={{ display: 'inline-block', width: 16, fontWeight: 700 }}>{antiRayap === 1 ? '√' : ''}</span>
          TIDAK
        </td>
      </tr>
    </tbody>
  </table>
);

const ReportHeader = ({ title, spec = {} }) => {
  const [statusPend, setStatusPend] = useState(() => (spec.statusPend ? 0 : spec.statusTidakPend ? 1 : 1));
  const [antiRayap, setAntiRayap] = useState(() => (spec.statusAntiRayap ? 0 : spec.statusTidakAntiRayap ? 1 : 1));
  const materialLines = String(spec.produk || '').split(/\r?\n/);
  const labelStyle = { padding: '5px 8px', whiteSpace: 'nowrap', verticalAlign: 'middle' };
  const valueStyle = { padding: '5px 8px', verticalAlign: 'middle' };

  return (
    <div className="rekap-report-header" style={{ fontFamily: REKAP_FONT, background: '#fff', color: '#000' }}>
      <div
        className="rekap-report-title"
        style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, textDecoration: 'underline', marginBottom: 24 }}
      >
        <EditableDiv style={{ textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{title}</EditableDiv>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '14%' }} />
          <col style={{ width: '46%' }} />
          <col style={{ width: '2%' }} />
          <col style={{ width: '38%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={labelStyle}>NO</td>
            <td style={valueStyle}><EditableDiv>{spec.norekap || ''}</EditableDiv></td>
            <td></td>
            <td rowSpan={3} style={{ padding: 0, verticalAlign: 'top' }}>
              <StatusProyekBox statusPend={statusPend} setStatusPend={setStatusPend} />
            </td>
          </tr>
          <tr>
            <td style={labelStyle}>NO KONTRAK</td>
            <td style={valueStyle}><EditableDiv>{spec.kontrak || ''}</EditableDiv></td>
            <td></td>
          </tr>
          <tr>
            <td style={labelStyle}>NIP</td>
            <td style={valueStyle}><EditableDiv>{spec.nip || ''}</EditableDiv></td>
            <td></td>
          </tr>
          <tr>
            <td style={labelStyle}>PROYEK</td>
            <td style={valueStyle}><EditableDiv>{spec.proyek || ''}</EditableDiv></td>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <td style={labelStyle}>TGL.ORDER</td>
            <td style={valueStyle}><EditableDiv>{formatOrderDate(spec.tanggal)}</EditableDiv></td>
            <td></td>
            <td rowSpan={2} style={{ padding: 0, verticalAlign: 'top' }}>
              <AntiRayapBox antiRayap={antiRayap} setAntiRayap={setAntiRayap} />
            </td>
          </tr>
          <tr>
            <td style={labelStyle}>TGL.SELESAI</td>
            <td style={valueStyle}><EditableDiv /></td>
            <td></td>
          </tr>
          <tr>
            <td style={{ ...labelStyle, fontWeight: 700 }}>ESTIMATOR PPIC</td>
            <td style={{ ...valueStyle, fontWeight: 700 }}><EditableDiv>{spec.estimator || ''}</EditableDiv></td>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <td style={{ ...labelStyle, fontWeight: 700 }}>BAHAN / MATERIAL</td>
            <td style={{ ...valueStyle, fontWeight: 700 }}><EditableDiv>{materialLines[0] || ''}</EditableDiv></td>
            <td colSpan={2}></td>
          </tr>
          <tr>
            <td></td>
            <td style={{ ...valueStyle, fontWeight: 700 }}><EditableDiv>{materialLines[1] || ''}</EditableDiv></td>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const KacaHeader = ({ spec = {} }) => {
  return (
    <div style={{ padding: '30px 30px 10px 30px', fontFamily: 'sans-serif', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#000', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td colSpan={3} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, textDecoration: 'underline', paddingBottom: 6 }}>
              BON PERMINTAAN PEMBELIAN
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 13, paddingBottom: 24 }}>
              (Purchase Request)
            </td>
          </tr>
          {[
            { label: 'NO GD', val: spec.norekap || '', extra: <span style={{ fontWeight: 'bold', color: '#000', fontSize: 13 }}>▶ Dept.Kaca</span> },
            { label: 'NO KONTRAK', val: spec.kontrak || '' },
            { label: 'NIP', val: spec.nip || '' },
            { label: 'PROYEK', val: spec.proyek || '' },
            { label: 'TGL. ORDER', val: spec.tanggal || '' },
            { label: 'TGL. SELESAI', val: '' },
            { label: 'ESTIMATOR PPIC', val: spec.estimator || '' }
          ].map((item, idx) => (
            <tr key={idx}>
              <td style={{ width: '200px', padding: '6px 0', fontWeight: 'bold', fontSize: 12 }}>{item.label}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '350px' }}>
                <EditableDiv>{item.val}</EditableDiv>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{item.extra || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const formatDisplayValue = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const num = Number(val);
  if (!isNaN(num) && typeof val !== 'boolean') {
    if (Number.isInteger(num)) return String(num);
    const rounded = Math.round(num * 10) / 10;
    if (Number.isInteger(rounded)) return String(rounded);
    return String(rounded).replace('.', ',');
  }
  return val;
};

const ChecklistHeader = ({ spec = {} }) => {
  return (
    <div style={{ padding: '30px 30px 10px 30px', fontFamily: 'sans-serif', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#000', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td colSpan={3} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, textDecoration: 'underline', paddingBottom: 24 }}>
              CHEKLIST PENGIRIMAN BARANG
            </td>
          </tr>
          {[
            { label: 'NO', val: spec.norekap || '' },
            { label: 'NO KONTRAK', val: spec.kontrak || '' },
            { label: 'NIP', val: spec.nip || '' },
            { label: 'PROYEK', val: spec.proyek || '' },
            { label: 'TGL. ORDER', val: spec.tanggal || '' },
            { label: 'TGL. SELESAI', val: '' },
            { label: 'KOORDINATOR REKAP', val: spec.koord || '' },
            { label: 'MONITORING', val: '' },
            { label: 'TUKANG RAKIT', val: '' }
          ].map((item, idx) => (
            <tr key={idx}>
              <td style={{ width: '200px', padding: '6px 0', fontWeight: 'bold', fontSize: 12 }}>{item.label}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '350px' }}>
                <EditableDiv>{item.val}</EditableDiv>
              </td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BpbHeader = ({ spec = {}, componentCount = 0 }) => {
  const [tukang, setTukang] = useState(localStorage.getItem(`bpb_tukang_${spec.id || 'default'}`) || '');

  useEffect(() => {
    localStorage.setItem(`bpb_tukang_${spec.id || 'default'}`, tukang);
  }, [tukang, spec.id]);

  const dateStr = spec.tanggal ? new Date(spec.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{ padding: '30px 30px 10px 30px', fontFamily: 'sans-serif', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#000', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td colSpan={6} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, textDecoration: 'underline', paddingBottom: 15 }}>
              BUKTI PENGAMBILAN BARANG
            </td>
          </tr>
          <tr>
            <td colSpan={4}></td>
            <td style={{ fontWeight: 'bold', fontSize: 12, width: '150px', padding: '4px 0' }}>JUMLAH KOMPONEN :</td>
            <td style={{ fontWeight: 'bold', fontSize: 13, width: '120px', padding: '4px 8px', borderBottom: '1px dashed #ccc', textAlign: 'left', color: '#16a34a' }}>
              {componentCount}
            </td>
          </tr>
          <tr>
            <td style={{ width: '150px', padding: '6px 0', fontWeight: 'bold' }}>DEPARTEMENT</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '250px' }}>
              RAKIT
            </td>
            <td style={{ width: '40px' }}></td>
            <td style={{ width: '100px' }}></td>
            <td style={{ width: '100px', fontWeight: 'bold' }}>NO.</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '150px' }}>
              <EditableDiv>{spec.norekap ? `${spec.norekap}B` : 'RZ0458B'}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>NO.KONTRAK</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              <EditableDiv>{spec.kontrak || ''}</EditableDiv>
            </td>
            <td></td>
            <td></td>
            <td style={{ fontWeight: 'bold' }}>TGL :</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              {dateStr || '21-May-2026'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>NIP</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              <EditableDiv>{spec.nip || ''}</EditableDiv>
            </td>
            <td></td>
            <td></td>
            <td style={{ fontWeight: 'bold' }}>Tukang :</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              <EditableDiv style={{ fontWeight: 'bold' }} onBlur={(e) => setTukang(e.target.innerText)}>{tukang}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>PROYEK</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }} colSpan={5}>
              <EditableDiv>{spec.proyek || ''}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>ESTIMATOR</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }} colSpan={5}>
              <EditableDiv>{spec.estimator || ''}</EditableDiv>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const BomHeader = ({ spec = {}, componentCount = 0 }) => {
  const [tukang, setTukang] = useState(localStorage.getItem(`bom_tukang_${spec.id || 'default'}`) || '');

  useEffect(() => {
    localStorage.setItem(`bom_tukang_${spec.id || 'default'}`, tukang);
  }, [tukang, spec.id]);

  const dateStr = spec.tanggal ? new Date(spec.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{ padding: '30px 30px 10px 30px', fontFamily: 'sans-serif', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#000', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td colSpan={6} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, textDecoration: 'underline', paddingBottom: 15 }}>
              Bill Of Material
            </td>
          </tr>
          <tr>
            <td colSpan={4}></td>
            <td style={{ fontWeight: 'bold', fontSize: 12, width: '150px', padding: '4px 0' }}>JUMLAH KOMPONEN :</td>
            <td style={{ fontWeight: 'bold', fontSize: 13, width: '120px', padding: '4px 8px', borderBottom: '1px dashed #ccc', textAlign: 'left', color: '#16a34a' }}>
              {componentCount}
            </td>
          </tr>
          <tr>
            <td style={{ width: '150px', padding: '6px 0', fontWeight: 'bold' }}>DEPARTEMENT</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '250px' }}>
              RAKIT
            </td>
            <td style={{ width: '40px' }}></td>
            <td style={{ width: '100px' }}></td>
            <td style={{ width: '100px', fontWeight: 'bold' }}>NO.</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '150px' }}>
              <EditableDiv>{spec.norekap ? `${spec.norekap}` : 'RZ0458'}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>NO.KONTRAK</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              <EditableDiv>{spec.kontrak || ''}</EditableDiv>
            </td>
            <td></td>
            <td></td>
            <td style={{ fontWeight: 'bold' }}>TGL :</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              {dateStr || '21-May-2026'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>NIP</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              <EditableDiv>{spec.nip || ''}</EditableDiv>
            </td>
            <td></td>
            <td></td>
            <td style={{ fontWeight: 'bold' }}>Tukang :</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }}>
              <EditableDiv style={{ fontWeight: 'bold' }} onBlur={(e) => setTukang(e.target.innerText)}>{tukang}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>PROYEK</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }} colSpan={5}>
              <EditableDiv>{spec.proyek || ''}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0', fontWeight: 'bold' }}>ESTIMATOR</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc' }} colSpan={5}>
              <EditableDiv>{spec.estimator || ''}</EditableDiv>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const BpbSignatures = () => (
  <div
    className="signature-box"
    style={{
      marginTop: 40,
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 16,
      textAlign: 'center'
    }}
  >
    {[
      { role: 'KA. GUDANG', desc: 'DIKETAHUI' },
      { role: 'KA. DEPARTEMENT', desc: 'DIKETAHUI' },
      { role: 'KA. PPIC', desc: 'DISETUJUI' },
      { role: 'PET. GUDANG', desc: 'DI SERAHKAN' },
      { role: '.............................', desc: 'DIAMBIL' }
    ].map((dept, i) => (
      <div
        key={i}
        style={{
          padding: 12,
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 100
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
          {dept.desc}
        </div>
        <div style={{ borderTop: '1px dashed #64748b', fontSize: 11, paddingTop: 4, fontWeight: 600, color: '#334155', marginTop: 30 }}>
          {dept.role}
        </div>
      </div>
    ))}
  </div>
);

export default function ReportPage({ breakdown = [], parts = [], stock = [], spec = {}, sections = [] }) {
  const [activeTab, setActiveTab] = useState('full_rekap');
  const [hideZeroQty, setHideZeroQty] = useState(false);

  const [showVariables, setShowVariables] = useState(false);

  // Interactive Checklist states persisted via localStorage per project id
  const projectId = spec.id || 'default';
  
  const [checklistQC, setChecklistQC] = useState(() => {
    try {
      const saved = localStorage.getItem(`checklist_qc_${projectId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const [checklistDriv, setChecklistDriv] = useState(() => {
    try {
      const saved = localStorage.getItem(`checklist_driv_${projectId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const [checklistSPV, setChecklistSPV] = useState(() => {
    try {
      const saved = localStorage.getItem(`checklist_spv_${projectId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(`checklist_qc_${projectId}`, JSON.stringify(checklistQC));
  }, [checklistQC, projectId]);

  useEffect(() => {
    localStorage.setItem(`checklist_driv_${projectId}`, JSON.stringify(checklistDriv));
  }, [checklistDriv, projectId]);

  useEffect(() => {
    localStorage.setItem(`checklist_spv_${projectId}`, JSON.stringify(checklistSPV));
  }, [checklistSPV, projectId]);

  const [customBpbRows, setCustomBpbRows] = useState(() => {
    try {
      const saved = localStorage.getItem(`bpb_custom_rows_${projectId}`);
      return saved ? JSON.parse(saved) : bpbSettingTemplate;
    } catch (_) {
      return bpbSettingTemplate;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bpb_custom_rows_${projectId}`);
      setCustomBpbRows(saved ? JSON.parse(saved) : bpbSettingTemplate);
    } catch (_) {
      setCustomBpbRows(bpbSettingTemplate);
    }
  }, [projectId]);

  const updateBpbCell = (rowIdx, field, value) => {
    const nextRows = customBpbRows.map(row => {
      if (row.row_idx === rowIdx) {
        const keyMap = {
          id: 'manual_id',
          nama: 'manual_nama',
          jml: 'manual_jml',
          satuan: 'manual_satuan',
          keterangan: 'manual_keterangan'
        };
        const rawKey = keyMap[field];
        const defaultKeyMap = {
          id: 'id_barang',
          nama: 'nama_barang',
          jml: 'jml_formula',
          satuan: 'satuan',
          keterangan: 'keterangan'
        };
        const defaultKey = defaultKeyMap[field];
        const defaultValue = row[defaultKey] || '';
        const nextVal = (value === '' || value === defaultValue) ? undefined : value;
        return {
          ...row,
          [rawKey]: nextVal
        };
      }
      return row;
    });
    setCustomBpbRows(nextRows);
    try {
      localStorage.setItem(`bpb_custom_rows_${projectId}`, JSON.stringify(nextRows));
    } catch (e) {
      console.error(e);
    }
  };

  const resetBpbTemplate = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan tabel BPB ke setting template bawaan (menghapus semua edit manual)?")) {
      setCustomBpbRows(bpbSettingTemplate);
      try {
        localStorage.removeItem(`bpb_custom_rows_${projectId}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [customBomRows, setCustomBomRows] = useState(() => {
    try {
      const saved = localStorage.getItem(`bom_custom_rows_${projectId}`);
      return saved ? JSON.parse(saved) : bomSettingTemplate;
    } catch (_) {
      return bomSettingTemplate;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bom_custom_rows_${projectId}`);
      setCustomBomRows(saved ? JSON.parse(saved) : bomSettingTemplate);
    } catch (_) {
      setCustomBomRows(bomSettingTemplate);
    }
  }, [projectId]);

  const updateBomCell = (rowIdx, field, value) => {
    const nextRows = customBomRows.map(row => {
      if (row.row_idx === rowIdx) {
        const keyMap = {
          id: 'manual_id',
          nama: 'manual_nama',
          jml: 'manual_jml',
          satuan: 'manual_satuan',
          keterangan: 'manual_keterangan'
        };
        const rawKey = keyMap[field];
        const defaultKeyMap = {
          id: 'id_barang',
          nama: 'nama_barang',
          jml: 'jml_formula',
          satuan: 'satuan',
          keterangan: 'keterangan'
        };
        const defaultKey = defaultKeyMap[field];
        const defaultValue = row[defaultKey] || '';
        const nextVal = (value === '' || value === defaultValue) ? undefined : value;
        return {
          ...row,
          [rawKey]: nextVal
        };
      }
      return row;
    });
    setCustomBomRows(nextRows);
    try {
      localStorage.setItem(`bom_custom_rows_${projectId}`, JSON.stringify(nextRows));
    } catch (e) {
      console.error(e);
    }
  };

  const resetBomTemplate = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan tabel BOM ke setting template bawaan (menghapus semua edit manual)?")) {
      setCustomBomRows(bomSettingTemplate);
      try {
        localStorage.removeItem(`bom_custom_rows_${projectId}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const { widths: bomColWidths, startResize: startBomColResize } = useColumnWidths(`bom_col_widths_${projectId}`);
  const { widths: bpbColWidths, startResize: startBpbColResize } = useColumnWidths(`bpb_col_widths_${projectId}`);

  // Context menu for JML Calculate Source
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, rowIdx, variant }
  const [csModal, setCsModal] = useState(false);
  const [csRowIdx, setCsRowIdx] = useState(null);
  const [csVariant, setCsVariant] = useState(''); // 'bpb' or 'bom'
  const [csStep, setCsStep] = useState('type');
  const [csType, setCsType] = useState('');
  const [csSection, setCsSection] = useState('');
  const [csRow, setCsRow] = useState('');
  const [csColumn, setCsColumn] = useState('');

  const spekSections = useMemo(() => {
    const aliases = spec.aliases || {};
    const s = sections || [];
    return s.map(sec => ({
      name: sec.name,
      rows: (sec.rows || []).filter(r => aliases[r.alias]),
    }));
  }, [spec, sections]);

  const onCellContextMenu = useCallback((e, rowIdx) => {
    e.preventDefault();
    const variant = document.getElementById('print-bom-sheet')?.offsetParent !== null ? 'bom' : 'bpb';
    setCtxMenu({ x: e.clientX, y: e.clientY, rowIdx, variant });
  }, []);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const openCalcSource = useCallback(() => {
    if (!ctxMenu) return;
    setCsRowIdx(ctxMenu.rowIdx);
    setCsVariant(ctxMenu.variant);
    setCsStep('type');
    setCsType('');
    setCsSection('');
    setCsRow('');
    setCsColumn('');
    setCsModal(true);
    closeCtxMenu();
  }, [ctxMenu, closeCtxMenu]);

  const setCalcSource = useCallback((typeOverride, columnOverride, sectionOverride, rowOverride) => {
    const srcType = typeOverride || csType;
    const srcColumn = columnOverride || csColumn;
    const srcSection = sectionOverride || csSection;
    const srcRow = rowOverride || csRow;
    let value = '';
    if (srcType === 'Breakdown') {
      value = `Breakdown:${srcColumn}`;
    } else if (srcType === 'Spek' && srcSection && srcRow) {
      value = `Spek:${srcSection}:${srcRow}`;
    } else if (srcType === 'CNC') {
      value = `CNC:${srcColumn}`;
    } else if (srcType === 'Report') {
      value = `Report:${srcColumn}`;
    }
    if (value && csRowIdx != null) {
      const updater = csVariant === 'bom' ? updateBomCell : updateBpbCell;
      updater(csRowIdx, 'jml', value);
    }
    setCsModal(false);
  }, [csType, csColumn, csSection, csRow, csRowIdx, csVariant, updateBomCell, updateBpbCell]);

  const deleteBpbRow = (rowIdx) => {
    if (!window.confirm('Hapus baris ini dari tabel BPB?')) return;
    const nextRows = customBpbRows.filter((r) => r.row_idx !== rowIdx);
    setCustomBpbRows(nextRows);
    try {
      localStorage.setItem(`bpb_custom_rows_${projectId}`, JSON.stringify(nextRows));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteBomRow = (rowIdx) => {
    if (!window.confirm('Hapus baris ini dari tabel BOM?')) return;
    const nextRows = customBomRows.filter((r) => r.row_idx !== rowIdx);
    setCustomBomRows(nextRows);
    try {
      localStorage.setItem(`bom_custom_rows_${projectId}`, JSON.stringify(nextRows));
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk action helpers
  const checkAllQC = (items) => {
    const next = {};
    items.forEach((item, idx) => {
      const key = `${item.id || idx}`;
      next[key] = true;
    });
    setChecklistQC(next);
  };

  const checkAllDriv = (items) => {
    const next = {};
    items.forEach((item, idx) => {
      const key = `${item.id || idx}`;
      next[key] = true;
    });
    setChecklistDriv(next);
  };

  const checkAllSPV = (items) => {
    const next = {};
    items.forEach((item, idx) => {
      const key = `${item.id || idx}`;
      next[key] = true;
    });
    setChecklistSPV(next);
  };

  const resetAllChecklists = () => {
    if (window.confirm("Apakah Anda yakin ingin mengosongkan semua tanda centang pada checklist ini?")) {
      setChecklistQC({});
      setChecklistDriv({});
      setChecklistSPV({});
    }
  };

  // Process all breakdown data to get real numbers & auto calculations
  const processedData = useMemo(() => {
    let lastParent = null;
    return breakdown.map(item => {
      if (item.isParent) {
        lastParent = item;
        return { ...item, isParent: true };
      }
      
      const calcRes = calcBreakdownItem(item, breakdown, spec, lastParent || {});
      return {
        ...item,
        ...calcRes,
        _p: calcRes.p_val,
        _l: calcRes.l_val,
        _t: calcRes.t_val,
        _sub: calcRes.sub_val,
        _jml: calcRes.jml_val
      };
    });
  }, [breakdown, spec]);

  // All processed items (parents + children)
  const filteredComponents = useMemo(() => {
    if (activeTab === 'ks') {
      return processedData.filter(d => !d.isParent && d.komp && (d.kode === 'KS' || d.ks === 'KS'));
    }
    if (activeTab === 'non_ks') {
      return processedData.filter(d => !d.isParent && d.komp && (d.kode === '─' || d.kode === '-' || d.ks === '─' || d.ks === '-'));
    }
    if (activeTab === 'kaca') {
      const targetCodes = ['kc', 'k¢', 'kcf'];
      return processedData.filter(d => 
        !d.isParent && 
        d.komp && 
        (targetCodes.includes(String(d.kode || '').toLowerCase().trim()) || 
         targetCodes.includes(String(d.ks || '').toLowerCase().trim()))
      );
    }
    if (activeTab === 'checklist') {
      const checklistNoFilters = ['.', '..', '...', 'fr', 'ft', '•', '••', '•••'];
      return processedData.filter(d => 
        !d.isParent && 
        d.komp && 
        d.no && 
        checklistNoFilters.includes(String(d.no).trim().toLowerCase())
      );
    }
    // full_rekap -> Only parent modules
    return processedData.filter(d => d.isParent).map((p, i) => ({
      ...p,
      no: p.no || '1',
      nama_komp: p.komp || p.modul || p.kabinet,
      _p: p.p || 0,
      _l: p.l || 0,
      _t: p.t || 0,
      tpk: p.tpk || '-',
      kode: '(ks)',
      qty_total: p.jml || 1,
      keterangan: p.keterangan || '-'
    }));
  }, [processedData, activeTab]);

  // Group components by name, but distinct by size, tpk, kode
  const groupedComponents = useMemo(() => {
    if (activeTab === 'checklist') return []; // Checklist has flat list layout, no need for grouped components
    const groups = [];
    filteredComponents.forEach((item) => {
      const name = item.nama_komp || item.komp || '-';
      const sizeStr = `${item._p} x ${item._l} x ${item._t}`;
      const tpk = item.tpk || '-';
      const kode = item.kode || '-';
      const qty = Number(item.qty_total) || Number(item._jml) || Number(item.jml) || 1;

      let existingGroup = groups.find(g => g.name === name);
      if (!existingGroup) {
        existingGroup = { name, items: [] };
        groups.push(existingGroup);
      }

      let existingItem = existingGroup.items.find(i => 
        `${i._p} x ${i._l} x ${i._t}` === sizeStr && 
        (i.tpk || '-') === tpk && 
        (i.kode || '-') === kode
      );

      if (existingItem) {
        existingItem.qty_grouped += qty;
      } else {
        existingGroup.items.push({ ...item, qty_grouped: qty });
      }
    });
    return groups;
  }, [filteredComponents, activeTab]);

  const bpbRows = useMemo(() => {
    return calculateBpbRows(processedData, spec, stock, customBpbRows);
  }, [processedData, spec, stock, customBpbRows]);

  const visibleBpbRows = useMemo(() => {
    if (!hideZeroQty) return bpbRows;
    return bpbRows.filter(row => {
      const isEmpty = !row.id_barang_display && !row.nama_barang_display && !row.satuan_display && !row.keterangan;
      if (isEmpty) return false;
      return Number(row.jml_display) > 0;
    });
  }, [bpbRows, hideZeroQty]);

  const bomRows = useMemo(() => {
    return calculateBomRows(processedData, spec, stock, customBomRows);
  }, [processedData, spec, stock, customBomRows]);

  const [hideZeroQtyBom, setHideZeroQtyBom] = useState(false);

  const visibleBomRows = useMemo(() => {
    if (!hideZeroQtyBom) return bomRows;
    return bomRows.filter(row => {
      const isEmpty = !row.id_barang_display && !row.nama_barang_display && !row.satuan_display && !row.keterangan;
      if (isEmpty) return false;
      const isHeader = !row.id_barang_display && row.nama_barang_display && !row.satuan_display && !row.keterangan && isNaN(Number(row.jml_display));
      if (isHeader) return true;
      return Number(row.jml_display) > 0;
    });
  }, [bomRows, hideZeroQtyBom]);

  const thStyle = { ...s.th, padding: '10px 14px', fontSize: 13, border: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc', color: '#334155' };
  const tdStyle = { ...s.td, padding: '10px 14px', fontSize: 13, border: '1px solid #cbd5e1', textAlign: 'center', color: '#0f172a' };
  const rekapThStyle = {
    padding: '7px 6px', fontSize: 13, lineHeight: 1.35, border: REKAP_BORDER,
    textAlign: 'center', background: '#fff', color: '#000', fontWeight: 700, fontFamily: REKAP_FONT,
  };
  const rekapTdStyle = {
    padding: '6px 6px', fontSize: 13, lineHeight: 1.35, border: REKAP_BORDER,
    textAlign: 'center', color: '#000', verticalAlign: 'middle', fontFamily: REKAP_FONT,
  };

  const REKAP_PRINT_CSS = [
    `#print-report { padding: ${REKAP_PRINT_MARGIN} !important; box-sizing: border-box !important; min-height: 279mm !important; display: flex !important; flex-direction: column !important; }`,
    `#print-report, #print-report * { font-family: ${REKAP_FONT} !important; font-size: 12px !important; line-height: 1.35 !important; }`,
    '#print-report .rekap-document-body { padding: 0 !important; flex: 1 !important; display: flex !important; flex-direction: column !important; }',
    '#print-report .rekap-report-header table td { padding: 2px 5px !important; }',
    '#print-report .rekap-report-title, #print-report .rekap-report-title * { font-size: 16px !important; font-weight: 700 !important; }',
    '#print-report .rekap-report-title { margin-bottom: 6mm !important; padding: 0 !important; }',
    '#print-report .rekap-table-wrap { flex: 1 !important; padding: 0 !important; margin-top: 2mm !important; }',
    '#print-report .rekap-table th, #print-report .rekap-table td { padding: 3px 5px !important; font-size: 12px !important; }',
  ].join('\n');

  // Helper: print only the target section, hiding all other app UI.
  // Uses visibility (not display) so nested elements remain renderable
  // even though their ancestor containers are hidden.
  function printArea(id, { pageSize, margin, extraPrintCss } = {}) {
    const STYLE_ID = '__print_area_style__';
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    const pageRule = pageSize
      ? `@page { size: ${pageSize}; margin: ${margin || '5mm'}; }`
      : `@page { margin: ${margin || '15mm'}; }`;
    style.innerHTML = [
      '@media print {',
      '  body * { visibility: hidden !important; }',
      `  #${id} { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff; }`,
      `  #${id} * { visibility: visible !important; box-sizing: border-box; }`,
      `  #${id} .no-print { visibility: hidden !important; height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }`,
      `  ${pageRule}`,
      extraPrintCss || '',
      '}'
    ].join('\n');
    window.print();
    // Clean up injected style after printing
    setTimeout(() => { if (style && style.parentNode) style.parentNode.removeChild(style); }, 1500);
  }

  return (
    <div style={{ ...s.page, maxWidth: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div className="no-print" style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginRight: 8 }}>Pilih Report:</span>
          {['full_rekap', 'ks', 'non_ks', 'kaca', 'checklist', 'bpb', 'bom_sheet', 'bom'].map(tab => {
            const label = {
              full_rekap: 'Full Rekap',
              ks: 'KS',
              non_ks: 'Non KS',
              kaca: 'Kaca',
              checklist: 'Checklist',
              bpb: 'BPB',
              bom_sheet: 'BOM Sheet',
              bom: 'BOM (Stok & Rekap)'
            }[tab];
            return (
              <button
                key={tab}
                style={{
                  padding: '8px 20px', borderRadius: '999px', 
                  border: activeTab === tab ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  background: activeTab === tab ? '#eff6ff' : '#fff',
                  color: activeTab === tab ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === tab ? 700 : 500,
                  cursor: 'pointer', fontSize: 13, 
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === tab ? '0 1px 2px rgba(59, 130, 246, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)'
                }}
                onClick={() => setActiveTab(tab)}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.background = '#fff';
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: showVariables ? '1px solid #3b82f6' : '1px solid #cbd5e1',
            background: showVariables ? '#eff6ff' : '#fff',
            color: showVariables ? '#2563eb' : '#475569',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          onClick={() => setShowVariables(!showVariables)}
        >
          🏷️ {showVariables ? 'Sembunyikan Variabel' : 'Lihat Variabel'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'bom' ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <RekapPage breakdown={breakdown} parts={parts} stock={stock} spec={spec} sections={sections} />
          </div>
        ) : activeTab === 'bom_sheet' ? (
          <div id="print-bom-sheet" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                .no-print {
                  display: none !important;
                }
                body {
                  background: #fff !important;
                  color: #000 !important;
                }
                .print-full-width {
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .table-print {
                  border: 2px solid #000 !important;
                  width: 100% !important;
                }
                .th-print {
                  border: 1px solid #000 !important;
                  background: #f1f5f9 !important;
                  color: #000 !important;
                }
                .td-print {
                  border: 1px solid #000 !important;
                  color: #000 !important;
                  background: transparent !important;
                }
                .signature-box {
                  break-inside: avoid;
                }
              }
            `}} />

            <div className="print-full-width" style={{ padding: 20 }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hideZeroQtyBom} 
                      onChange={(e) => setHideZeroQtyBom(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    Tampilkan Hanya Item dengan Jumlah &gt; 0
                  </label>
                  <button 
                    style={{ ...s.btnSm, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 }}
                    onClick={resetBomTemplate}
                  >
                    Reset Template BOM
                  </button>
                </div>
                <button style={{ ...s.btnSm, background: '#0f172a', color: '#fff', border: 'none', fontWeight: 600 }} onClick={() => printArea('print-bom-sheet')}>
                  ⎙ Cetak BOM / Simpan PDF
                </button>
              </div>

              <BomHeader spec={spec} componentCount={processedData.filter(d => !d.isParent && d.komp).length} />

              <div style={{ ...s.tableWrap, padding: '0 20px 20px 20px', overflowX: 'auto' }}>
                <MaterialReportTable
                  rows={visibleBomRows}
                  colWidths={bomColWidths}
                  startResize={startBomColResize}
                  onDeleteRow={deleteBomRow}
                  onUpdateCell={updateBomCell}
                  onCellContextMenu={onCellContextMenu}
                  thStyle={thStyle}
                  tdStyle={tdStyle}
                  variant="bom"
                />
              </div>

              <BpbSignatures />
            </div>
          </div>
        ) : activeTab === 'bpb' ? (
          <div id="print-bpb" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                .no-print {
                  display: none !important;
                }
                body {
                  background: #fff !important;
                  color: #000 !important;
                }
                .print-full-width {
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .table-print {
                  border: 2px solid #000 !important;
                  width: 100% !important;
                }
                .th-print {
                  border: 1px solid #000 !important;
                  background: #f1f5f9 !important;
                  color: #000 !important;
                }
                .td-print {
                  border: 1px solid #000 !important;
                  color: #000 !important;
                  background: transparent !important;
                }
                .signature-box {
                  break-inside: avoid;
                }
              }
            `}} />

            <div className="print-full-width" style={{ padding: 20 }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hideZeroQty} 
                      onChange={(e) => setHideZeroQty(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    Tampilkan Hanya Item dengan Jumlah &gt; 0
                  </label>
                  <button 
                    style={{ ...s.btnSm, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 }}
                    onClick={resetBpbTemplate}
                  >
                    Reset Template BPB
                  </button>
                </div>
                <button style={{ ...s.btnSm, background: '#0f172a', color: '#fff', border: 'none', fontWeight: 600 }} onClick={() => printArea('print-bpb')}>
                  ⎙ Cetak BPB / Simpan PDF
                </button>
              </div>

              <BpbHeader spec={spec} componentCount={processedData.filter(d => !d.isParent && d.komp).length} />

              <div style={{ ...s.tableWrap, padding: '0 20px 20px 20px', overflowX: 'auto' }}>
                <MaterialReportTable
                  rows={visibleBpbRows}
                  colWidths={bpbColWidths}
                  startResize={startBpbColResize}
                  onDeleteRow={deleteBpbRow}
                  onUpdateCell={updateBpbCell}
                  onCellContextMenu={onCellContextMenu}
                  thStyle={thStyle}
                  tdStyle={tdStyle}
                  variant="bpb"
                />
              </div>

              <BpbSignatures />
            </div>
          </div>
        ) : activeTab === 'checklist' ? (
          <div id="print-checklist" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                .no-print {
                  display: none !important;
                }
                body {
                  background: #fff !important;
                  color: #000 !important;
                }
                .print-full-width {
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .table-print {
                  border: 2px solid #000 !important;
                  width: 100% !important;
                }
                .th-print {
                  border: 1px solid #000 !important;
                  background: #f1f5f9 !important;
                  color: #000 !important;
                }
                .td-print {
                  border: 1px solid #000 !important;
                  color: #000 !important;
                  background: transparent !important;
                }
                .signature-box {
                  break-inside: avoid;
                }
              }
            `}} />

            <div className="print-full-width" style={{ padding: 20 }}>
              
              {/* Header Title & Bulk Actions (no-print) */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ ...s.btnSm, background: '#10b981', color: '#fff', border: 'none' }} onClick={() => checkAllQC(filteredComponents)}>QC Selesai Semua</button>
                  <button style={{ ...s.btnSm, background: '#0ea5e9', color: '#fff', border: 'none' }} onClick={() => checkAllDriv(filteredComponents)}>Driver Selesai Semua</button>
                  <button style={{ ...s.btnSm, background: '#6366f1', color: '#fff', border: 'none' }} onClick={() => checkAllSPV(filteredComponents)}>SPV Selesai Semua</button>
                  <button style={{ ...s.btnSm, background: '#ef4444', color: '#fff', border: 'none' }} onClick={resetAllChecklists}>Reset Checks</button>
                </div>
                <button style={{ ...s.btnSm, background: '#0f172a', color: '#fff', border: 'none', fontWeight: 600 }} onClick={() => printArea('print-checklist')}>
                  ⎙ Cetak Checklist / Simpan PDF
                </button>
              </div>

              {/* Header Metadata Section */}
              <ChecklistHeader spec={spec} />

              {/* Checklist Table */}
              <div style={{ ...s.tableWrap, overflowX: 'auto', paddingBottom: 20 }}>
                <table className="table-print" style={{ ...s.table, borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th className="th-print" style={{ ...thStyle, width: 40 }} rowSpan={2}>√</th>
                      <th className="th-print" style={{ ...thStyle, textAlign: 'left', minWidth: 200 }} rowSpan={2}>Komponen</th>
                      <th className="th-print" style={{ ...thStyle, width: 150 }} rowSpan={2}>Ukuran</th>
                      <th className="th-print" style={{ ...thStyle, width: 40 }} rowSpan={2}>T</th>
                      <th className="th-print" style={{ ...thStyle, width: 45 }} rowSpan={2}>k</th>
                      <th className="th-print" style={{ ...thStyle, width: 55 }} rowSpan={2}>Total</th>
                      <th className="th-print" style={{ ...thStyle, width: 60 }} rowSpan={2}>COLY</th>
                      <th className="th-print" style={{ ...thStyle, borderBottom: 'none' }} colSpan={3}>√</th>
                    </tr>
                    <tr>
                      <th className="th-print" style={{ ...thStyle, width: 65, borderTop: 'none', fontSize: 10 }}>QC<br/><span style={{ fontSize: 8, fontWeight: 400 }}>ADA / TDK</span></th>
                      <th className="th-print" style={{ ...thStyle, width: 65, borderTop: 'none', fontSize: 10 }}>Driv.<br/><span style={{ fontSize: 8, fontWeight: 400 }}>ADA / TDK</span></th>
                      <th className="th-print" style={{ ...thStyle, width: 65, borderTop: 'none', fontSize: 10 }}>SPV<br/><span style={{ fontSize: 8, fontWeight: 400 }}>ADA / TDK</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComponents.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ ...s.empty, padding: 30 }}>
                          Tidak ada komponen checklist (nilai No* tidak mengandung •••, ••, fr, •)
                        </td>
                      </tr>
                    ) : (
                      filteredComponents.map((item, i) => {
                        const key = `${item.id || i}`;
                        const isCheckedQC = !!checklistQC[key];
                        const isCheckedDriv = !!checklistDriv[key];
                        const isCheckedSPV = !!checklistSPV[key];

                        return (
                          <tr
                            key={key}
                            style={{
                              background: (isCheckedQC && isCheckedDriv && isCheckedSPV) ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#f8fafc'),
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <td className="td-print" style={{ ...tdStyle, fontWeight: 700 }}>{item.no}</td>
                            <td className="td-print" style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{item.komp}</td>
                            <td className="td-print" style={{ ...tdStyle, fontFamily: 'monospace' }}>
                              {formatDisplayValue(item._p)} x {formatDisplayValue(item._l)} x {formatDisplayValue(item._t)}
                            </td>
                            <td className="td-print" style={tdStyle}>{item.tpk || '-'}</td>
                            <td className="td-print" style={{ ...tdStyle, fontWeight: 600 }}>{item.kode || '-'}</td>
                            <td className="td-print" style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>{item.qty_total || (Number(item._sub) * Number(item._jml)) || 1}</td>
                            <td className="td-print" style={tdStyle}>
                              <EditableDiv style={{ textAlign: 'center' }} />
                            </td>
                            
                            {/* QC checkbox */}
                            <td className="td-print" style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => setChecklistQC(p => ({ ...p, [key]: !p[key] }))}>
                              <div className="no-print" style={{
                                width: 18, height: 18, border: isCheckedQC ? '2px solid #10b981' : '2px solid #cbd5e1',
                                borderRadius: 4, background: isCheckedQC ? '#10b981' : '#fff', margin: 'auto',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 11
                              }}>
                                {isCheckedQC && '✓'}
                              </div>
                              <div className="print-only" style={{ display: 'none', width: 14, height: 14, border: '1.5px solid #000', margin: 'auto', fontSize: 10, lineHeight: '14px', textAlign: 'center' }}>
                                {isCheckedQC ? '✓' : ''}
                              </div>
                            </td>

                            {/* Driver checkbox */}
                            <td className="td-print" style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => setChecklistDriv(p => ({ ...p, [key]: !p[key] }))}>
                              <div className="no-print" style={{
                                width: 18, height: 18, border: isCheckedDriv ? '2px solid #0ea5e9' : '2px solid #cbd5e1',
                                borderRadius: 4, background: isCheckedDriv ? '#0ea5e9' : '#fff', margin: 'auto',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 11
                              }}>
                                {isCheckedDriv && '✓'}
                              </div>
                              <div className="print-only" style={{ display: 'none', width: 14, height: 14, border: '1.5px solid #000', margin: 'auto', fontSize: 10, lineHeight: '14px', textAlign: 'center' }}>
                                {isCheckedDriv ? '✓' : ''}
                              </div>
                            </td>

                            {/* SPV checkbox */}
                            <td className="td-print" style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => setChecklistSPV(p => ({ ...p, [key]: !p[key] }))}>
                              <div className="no-print" style={{
                                width: 18, height: 18, border: isCheckedSPV ? '2px solid #6366f1' : '2px solid #cbd5e1',
                                borderRadius: 4, background: isCheckedSPV ? '#6366f1' : '#fff', margin: 'auto',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 11
                              }}>
                                {isCheckedSPV && '✓'}
                              </div>
                              <div className="print-only" style={{ display: 'none', width: 14, height: 14, border: '1.5px solid #000', margin: 'auto', fontSize: 10, lineHeight: '14px', textAlign: 'center' }}>
                                {isCheckedSPV ? '✓' : ''}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div
                className="signature-box"
                style={{
                  marginTop: 40,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 24,
                  textAlign: 'center'
                }}
              >
                {[
                  { role: 'Yang Menerima (Client)', desc: 'Penerima Barang' },
                  { role: 'Driver (Sopir)', desc: 'Pengirim' },
                  { role: 'QC Checker', desc: 'Mutu & Kelayakan' },
                  { role: 'Supervisor (SPV)', desc: 'Penanggung Jawab' }
                ].map((dept, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: 110
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                      {dept.role}
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', marginBottom: 16 }}>
                      {dept.desc}
                    </div>
                    <div style={{ borderTop: '1px dashed #64748b', fontSize: 11, paddingTop: 4, fontWeight: 600, color: '#334155' }}>
                      ( ................................... )
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        ) : (
          <div id="print-report" className="rekap-preview-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', overflow: 'visible' }}>
            <div className="no-print" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                Report {activeTab === 'full_rekap' ? 'Full Rekap' : activeTab === 'ks' ? 'KS' : activeTab === 'non_ks' ? 'Non KS' : 'Kaca'}
              </h3>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Badge color="blue">{filteredComponents.length} Komponen</Badge>
                <button style={{ ...s.btnSm, background: '#0f172a', color: '#fff', border: 'none', fontWeight: 600 }} onClick={() => printArea('print-report', { pageSize: REKAP_PRINT_PAGE, margin: '0', extraPrintCss: REKAP_PRINT_CSS })}>
                  ⎙ Cetak / PDF (Letter)
                </button>
              </div>
            </div>

            <div className="rekap-document-body" style={{ padding: REKAP_PRINT_MARGIN, fontFamily: REKAP_FONT, boxSizing: 'border-box' }}>
              {activeTab === 'kaca' ? (
                <KacaHeader spec={spec} />
              ) : (
                <ReportHeader title={`REKAPITULASI PEMAKAIAN BAHAN (${activeTab === 'full_rekap' ? 'FULL REKAP' : activeTab === 'ks' ? 'KS' : 'NON KS'})`} spec={spec} />
              )}

              <div className="rekap-table-wrap" style={{ marginTop: 4, width: '100%', overflow: 'visible' }}>
                <table className="rekap-table" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', wordBreak: 'break-word' }}>
                  <colgroup>
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '21%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={rekapThStyle}>No</th>
                      <th style={{ ...rekapThStyle, textAlign: 'left', padding: '7px 8px' }}>Nama Komponen</th>
                      <th style={rekapThStyle}>Ukuran</th>
                      <th style={rekapThStyle}>{activeTab === 'kaca' ? 'T' : 'Tpk'}</th>
                      <th style={rekapThStyle}>{activeTab === 'kaca' ? 'k¢' : 'kode'}</th>
                      <th style={rekapThStyle}>Total</th>
                      <th style={rekapThStyle}>√</th>
                      <th style={rekapThStyle}>KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedComponents.length === 0 ? (
                      <tr><td colSpan={8} style={{ ...rekapTdStyle, padding: 20, textAlign: 'center' }}>Tidak ada data.</td></tr>
                    ) : groupedComponents.map((group, gIdx) => {
                      const tpkSpans = buildRowSpanMap(group.items, (item) => item.tpk || '-');
                      const kodeSpans = buildRowSpanMap(group.items, (item) => item.kode || '-');
                      return (
                        <React.Fragment key={gIdx}>
                          {group.items.map((item, iIdx) => (
                            <tr key={`${gIdx}-${iIdx}`}>
                              {iIdx === 0 && (
                                <td rowSpan={group.items.length} style={rekapTdStyle}>
                                  <EditableDiv>{gIdx + 1}</EditableDiv>
                                </td>
                              )}
                              {iIdx === 0 && (
                                <td rowSpan={group.items.length} style={{ ...rekapTdStyle, textAlign: 'left', verticalAlign: 'top', padding: '6px 8px', maxWidth: 0 }}>
                                  <EditableDiv>{group.name}</EditableDiv>
                                </td>
                              )}
                              <td style={rekapTdStyle}>
                                <EditableDiv>{formatDisplayValue(item._p)} x {formatDisplayValue(item._l)} x {formatDisplayValue(item._t)}</EditableDiv>
                              </td>
                              {tpkSpans[iIdx]?.show && (
                                <td rowSpan={tpkSpans[iIdx].span} style={rekapTdStyle}>
                                  <EditableDiv>{item.tpk || '-'}</EditableDiv>
                                </td>
                              )}
                              {kodeSpans[iIdx]?.show && (
                                <td rowSpan={kodeSpans[iIdx].span} style={rekapTdStyle}>
                                  <EditableDiv>{item.kode || '-'}</EditableDiv>
                                </td>
                              )}
                              <td style={{ ...rekapTdStyle, fontWeight: 700 }}>
                                <EditableDiv>{item.qty_grouped}</EditableDiv>
                              </td>
                              <td style={rekapTdStyle}></td>
                              <td style={{ ...rekapTdStyle, textAlign: 'left', maxWidth: 0 }}>
                                <EditableDiv>{item.keterangan && item.keterangan !== '-' ? item.keterangan : ''}</EditableDiv>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Variables Panel */}
      {showVariables && (
        <VariablesPanel spec={spec} sections={sections} />
      )}

      {/* JML Calculate Source Modal */}
      <div style={{ display: csModal ? 'block' : 'none' }}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setCsModal(false)}
        >
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, minWidth: 280, maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1e293b' }}>Pilih Sumber Kalkulasi</div>
            {csStep === 'type' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {['Breakdown', 'Spek', 'CNC', 'Report'].map(t => (
                  <button key={t} onClick={() => { setCsType(t); setCsStep(t.toLowerCase()); }}
                    style={{ background: '#f3f4f6', border: '0.5px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: 13 }}
                  >{t}</button>
                ))}
              </div>
            )}
            {csStep === 'breakdown' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {[{key:'minifix@',label:'minifix @'},{key:'dowel@',label:'dowel @'},{key:'qty_total',label:'Qty Total'},{key:'p_gross',label:'P Gross (m)'},{key:'l_gross',label:'L Gross (m)'},{key:'keliling',label:'Keliling (m)'},{key:'area_m2',label:'Area (m²)'},{key:'vol_m3',label:'Volume (m³)'},{key:'q_minifix_total',label:'Minifix Total'},{key:'q_dowel_total',label:'Dowel Total'}].map(r => (
                  <button key={r.key} onClick={() => setCalcSource('Breakdown', r.key)}
                    style={{ background: '#f3f4f6', border: '0.5px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                  >{r.label}</button>
                ))}
                <button onClick={() => setCsStep('type')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>← Kembali</button>
              </div>
            )}
            {csStep === 'spek' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {spekSections.length === 0 && <span style={{ color: '#94a3b8', fontSize: 13 }}>Tidak ada section</span>}
                {spekSections.map(s => (
                  <button key={s.name} onClick={() => { setCsSection(s.name); setCsStep('spekSection'); }}
                    style={{ background: '#f3f4f6', border: '0.5px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                  >{s.name}</button>
                ))}
                <button onClick={() => setCsStep('type')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>← Kembali</button>
              </div>
            )}
            {csStep === 'spekSection' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {spekSections.find(s => s.name === csSection)?.rows.map(r => (
                  <button key={r.alias} onClick={() => setCalcSource('Spek', null, csSection, r.alias)}
                    style={{ background: '#f3f4f6', border: '0.5px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                  >{r.label || r.alias}</button>
                ))}
                <button onClick={() => setCsStep('spek')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>← Kembali</button>
              </div>
            )}
            {csStep === 'cnc' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[{key:'p_cnc',label:'P CNC'},{key:'l_cnc',label:'L CNC'},{key:'ukuran_cnc',label:'Ukuran CNC'}].map(r => (
                  <button key={r.key} onClick={() => setCalcSource('CNC', r.key)}
                    style={{ background: '#f3f4f6', border: '0.5px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                  >{r.label}</button>
                ))}
                <button onClick={() => setCsStep('type')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>← Kembali</button>
              </div>
            )}
            {csStep === 'report' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[{key:'qty_order',label:'Qty Order'},{key:'qty_produksi',label:'Qty Produksi'},{key:'total_part',label:'Total Part'}].map(r => (
                  <button key={r.key} onClick={() => setCalcSource('Report', r.key)}
                    style={{ background: '#f3f4f6', border: '0.5px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                  >{r.label}</button>
                ))}
                <button onClick={() => setCsStep('type')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>← Kembali</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x,
            background: '#fff', border: '0.5px solid #ccc', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2001, minWidth: 160, padding: '4px 0',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={openCalcSource}
            style={{ display: 'block', width: '100%', background: 'none', border: 'none', padding: '8px 16px', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >Input Calculate Source</button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {ctxMenu && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, background: 'transparent' }} onClick={closeCtxMenu} />}
      </div>
    </div>
  );
}

