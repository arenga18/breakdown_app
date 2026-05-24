import React, { useState } from 'react';
import { initialState } from './initialState';
import { s } from './components/UI';
import StockPage from './components/StockPage';
import PartPage from './components/PartPage';
import CategoryPage from './components/CategoryPage';
import ModulPage from './components/ModulPage';
import ModulMasterPage from './components/ModulMasterPage';
import ProjectPage from './components/ProjectPage';
import SubModulPage from './components/SubModulPage';
import SetupItemPage from './components/SetupItemPage';

const PAGES = [
  { key: 'modul', label: 'Modul' },
  { key: 'project', label: 'Project' },
];

export default function App() {
  const [page, setPage] = useState('modul');
  const [state, setState] = useState(initialState);
  const [showModulMaster, setShowModulMaster] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  function update(key) {
    return (val) => setState(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f0', fontFamily: "'Times New Roman', Times, serif", overflow: 'hidden' }}>
      <nav style={s.nav}>
        {PAGES.map(p => (
          <button key={p.key} style={s.navBtn(page === p.key)} onClick={() => { setPage(p.key); setShowModulMaster(false); setShowConfig(false); }}>
            {p.label}
          </button>
        ))}

        {/* Master Data Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            style={s.navBtn(page === 'masterModul')}
            onClick={() => { setShowModulMaster(!showModulMaster); setShowConfig(false); }}
          >
            Modul Master data {showModulMaster ? '▴' : '▾'}
          </button>
          {showModulMaster && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: '#fff',
              border: '0.5px solid #ddd', borderRadius: 8, marginTop: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 200, padding: '4px 0'
            }}>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }} onClick={() => { setPage('masterModul'); setShowModulMaster(false); }}>📁 All Categories</div>
            </div>
          )}
        </div>

        {/* Configuration Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            style={s.navBtn(['category', 'stock', 'part', 'submodul'].includes(page))}
            onClick={() => { setShowConfig(!showConfig); setShowModulMaster(false); }}
          >
            Configuration {showConfig ? '▴' : '▾'}
          </button>
          {showConfig && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: '#fff',
              border: '0.5px solid #ddd', borderRadius: 8, marginTop: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 200, padding: '4px 0'
            }}>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { setPage('category'); setShowConfig(false); }}>🏷 Category</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { setPage('stock'); setShowConfig(false); }}>📦 Stock / Inventory</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { setPage('part'); setShowConfig(false); }}>🧩 Part Components</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { setPage('submodul'); setShowConfig(false); }}>🧊 Sub-Modul Template</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }} onClick={() => { setPage('setup'); setShowConfig(false); }}>🛠 Setup Items</div>
            </div>
          )}
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {page === 'modul' && <ModulPage data={state.moduls} masterData={state.modulMasterData} parts={state.parts} setupItems={state.setupItems} subModuls={state.subModuls} onChange={update('moduls')} />}
        {page === 'project' && (
          <ProjectPage
            projects={state.projects}
            moduls={state.moduls}
            subModuls={state.subModuls}
            sections={state.tplSections}
            categories={state.categories}
            parts={state.parts}
            stock={state.stock}
            setupItems={state.setupItems}
            onChange={update('projects')}
            onTplChange={update('tplSections')}
          />
        )}
        {page === 'masterModul' && <ModulMasterPage data={state.modulMasterData} onChange={update('modulMasterData')} />}
        {page === 'category' && <CategoryPage data={state.categories} onChange={update('categories')} />}
        {page === 'stock' && <StockPage data={state.stock} onChange={update('stock')} />}
        {page === 'part' && <PartPage data={state.parts} onChange={update('parts')} />}
        {page === 'submodul' && <SubModulPage data={state.subModuls} parts={state.parts} setupItems={state.setupItems} onChange={update('subModuls')} />}
        {page === 'setup' && <SetupItemPage data={state.setupItems} onChange={update('setupItems')} />}
      </div>
    </div>
  );
}
