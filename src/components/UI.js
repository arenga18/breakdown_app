import React, { useState } from 'react';

export const s = {
  nav: { display:'flex', gap:4, padding:'10px 14px', borderBottom:'0.5px solid #e0e0d8', background:'#fff', position:'sticky', top:0, zIndex:10, flexWrap:'wrap' },
  navBtn: (active) => ({ padding:'5px 14px', borderRadius:7, border:'0.5px solid '+(active?'#aaa':'#ddd'), background: active?'#f0f0ec':'transparent', cursor:'pointer', fontSize:13, fontWeight: active?500:400, color: active?'#111':'#666', fontFamily:'inherit' }),
  page: { padding:16, flex:1 },
  pageHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 },
  pageTitle: { fontSize:15, fontWeight:500 },
  btnPrimary: { padding:'5px 14px', borderRadius:7, border:'0.5px solid #111', background:'#111', color:'#fff', cursor:'pointer', fontSize:13, fontFamily:'inherit' },
  btn: { padding:'5px 14px', borderRadius:7, border:'0.5px solid #ccc', background:'transparent', cursor:'pointer', fontSize:13, color:'#111', fontFamily:'inherit' },
  btnSm: { padding:'3px 10px', borderRadius:6, border:'0.5px solid #ccc', background:'transparent', cursor:'pointer', fontSize:12, color:'#111', fontFamily:'inherit' },
  btnSmPrimary: { padding:'3px 10px', borderRadius:6, border:'0.5px solid #111', background:'#111', color:'#fff', cursor:'pointer', fontSize:12, fontFamily:'inherit' },
  btnDanger: { padding:'3px 7px', borderRadius:6, border:'0.5px solid transparent', background:'transparent', cursor:'pointer', fontSize:12, color:'#b91c1c' },
  iconBtn: { padding:'3px 7px', borderRadius:6, border:'0.5px solid transparent', background:'transparent', cursor:'pointer', fontSize:12, color:'#666' },
  tableWrap: { border:'0.5px solid #e0e0d8', borderRadius:10, overflow:'hidden', overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th: { textAlign:'left', padding:'7px 10px', borderBottom:'0.5px solid #d5d5cd', color:'#666', fontWeight:500, fontSize:12, whiteSpace:'nowrap', background:'#fafaf7' },
  td: { padding:'6px 10px', borderBottom:'0.5px solid #eeeee8', verticalAlign:'middle' },
  searchInput: { flex:1, padding:'6px 10px', borderRadius:7, border:'0.5px solid #d5d5cd', background:'#fafaf7', fontFamily:'inherit', fontSize:13, color:'#111', outline:'none' },
  input: { width:'100%', padding:'6px 9px', borderRadius:7, border:'0.5px solid #d5d5cd', background:'#fafaf7', fontFamily:'inherit', fontSize:13, color:'#111', outline:'none' },
  inputMinimal: { width:'100%', padding:'3px 5px', border:'none', background:'transparent', fontFamily:'inherit', fontSize:13, color:'#111', outline:'none' },
  select: { width:'100%', padding:'6px 9px', borderRadius:7, border:'0.5px solid #d5d5cd', background:'#fafaf7', fontFamily:'inherit', fontSize:13, color:'#111', outline:'none' },
  badge: (color) => {
    const map = { blue:{bg:'#e6f1fb',color:'#0c447c'}, green:{bg:'#eaf3de',color:'#27500a'}, gray:{bg:'#f1efe8',color:'#5f5e5a'}, amber:{bg:'#faeeda',color:'#633806'} };
    const c = map[color]||map.gray;
    return { display:'inline-block', padding:'2px 7px', borderRadius:6, fontSize:11, fontWeight:500, background:c.bg, color:c.color };
  },
  modalBg: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' },
  modal: { background:'#fff', borderRadius:12, border:'0.5px solid #d5d5cd', display: 'flex', flexDirection: 'column', width:500, maxWidth:'95vw', maxHeight:'90vh', overflow:'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' },
  modalLarge: { background:'#fff', borderRadius:12, border:'0.5px solid #d5d5cd', display: 'flex', flexDirection: 'column', width:1000, maxWidth:'95vw', maxHeight:'90vh', overflow:'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' },
  modalTitle: { fontSize:15, fontWeight:600, padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', flexShrink: 0 },
  modalBody: { padding: 20, overflowY: 'auto', flex: 1 },
  fg: { marginBottom:11 },
  fgLabel: { display:'block', fontSize:11, color:'#666', marginBottom:3 },
  fr: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 },
  modalActions: { display:'flex', gap:8, justifyContent:'flex-end', marginTop:14, paddingTop:14, borderTop:'0.5px solid #eeeee8', flexShrink: 0 },
  empty: { padding:36, textAlign:'center', color:'#888', fontSize:13 },
};

export function Modal({ open, onClose, title, children, size = 'medium' }) {
  if (!open) return null;
  const modalStyle = size === 'large' ? s.modalLarge : s.modal;
  return (
    <div style={s.modalBg} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={s.modalTitle}>{title}</div>
        <div style={s.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormGroup({ label, children }) {
  return (
    <div style={s.fg}>
      <label style={s.fgLabel}>{label}</label>
      {children}
    </div>
  );
}

export function FormRow({ children }) {
  return <div style={s.fr}>{children}</div>;
}

export function Badge({ color = 'gray', children }) {
  return <span style={s.badge(color)}>{children}</span>;
}

export function SearchableSelect({ value, options, placeholder = "Select an option", onChange, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(opt => {
    const text = (typeof opt === 'object' ? opt.name : opt).toLowerCase();
    const q = searchTerm.toLowerCase();
    return text.includes(q);
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...s.select,
          cursor: 'pointer',
          background: '#fafaf7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          ...style
        }}
      >
        <span style={{ color: value ? '#111' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 8 }}>
          {value || placeholder}
        </span>
        <span style={{ fontSize: 10, color: '#666' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => { setIsOpen(false); setSearchTerm(''); }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '0.5px solid #d5d5cd',
              borderRadius: 8,
              marginTop: 4,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              zIndex: 1000,
              maxHeight: 250,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: 6, borderBottom: '0.5px solid #eee', flexShrink: 0 }}>
              <input
                autoFocus
                style={{ ...s.input, padding: '4px 8px', fontSize: 12 }}
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', textAlign: 'center' }}>No matches found</div>
              ) : (
                filteredOptions.map((opt, i) => {
                  const val = typeof opt === 'object' ? opt.name : opt;
                  const code = typeof opt === 'object' ? opt.code : null;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        onChange(val);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        borderBottom: '0.5px solid #f9fafb',
                        color: '#374151',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: value === val ? '#f3f4f6' : 'transparent'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={e => e.currentTarget.style.background = value === val ? '#f3f4f6' : 'transparent'}
                    >
                      <span style={{ fontWeight: value === val ? 600 : 400 }}>{val}</span>
                      {code && <span style={{ fontSize: 10, color: '#633806', background: '#faeeda', padding: '1px 5px', borderRadius: 4 }}>{code}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
