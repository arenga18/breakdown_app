import { api } from './client';
import { calcBreakdownItem } from '../utils/breakdownCalc';
import { resolveBreakdownItem, buildAliasMap } from '../utils/resolveAlias';
import { syncCategoriesWithSpek } from '../utils/categorySync';
import { evaluateFormula } from '../utils/calc';

/**
 * syncStateWithDB — Syncs React state changes with PostgreSQL database in the background.
 * Uses diffing to detect created, updated, and deleted records.
 *
 * @param {string} key       - State key ('projects', 'moduls', 'stock', 'parts', 'setupItems', 'categories', 'tplSections', 'modulMasterData')
 * @param {Array} prev       - Previous state array
 * @param {Array} next       - Next state array
 * @param {object} state     - Current React state object
 * @param {function} setState - React setState updater function
 */
export async function syncStateWithDB(key, prev, next, state, setState) {
  const pArr = prev || [];
  const nArr = next || [];

  if (key === 'moduls') {
    // 1. Modul templates (Modul Kodifikasi)
    // Deleted
    const deleted = pArr.filter(p => !nArr.some(n => n.id === p.id));
    for (const m of deleted) {
      if (typeof m.id === 'string') {
        console.log(`🗑 DB Delete Modul: ${m.kabinet}`);
        await api.delete(`/moduls/${m.id}`).catch(console.error);
      }
    }

    // Created
    const created = nArr.filter(n => !pArr.some(p => p.id === n.id));
    for (const m of created) {
      console.log(`➕ DB Create Modul: ${m.kabinet}`);
      // Find or create project dynamically
      const projName = m.proyek || 'Master Templates';
      let projectId = null;
      const existingProj = (state.projects || []).find(p => p.name.toLowerCase() === projName.toLowerCase());
      
      if (existingProj) {
        projectId = existingProj.id;
      } else {
        const newProj = await api.post('/projects', { name: projName, client: projName }).catch(console.error);
        if (newProj) {
          projectId = newProj.id;
          setState(prev => ({
            ...prev,
            projects: [...(prev.projects || []), { ...newProj, speks: [], breakdown: [] }]
          }));
        }
      }

      if (projectId) {
        const payload = {
          project_id: projectId,
          tgl: m.tgl || new Date().toISOString().slice(0, 10),
          nip: m.nip || '',
          proyek: m.proyek || projName,
          produk: m.produk || m.name || '',
          kabinet: m.kabinet || '',
          tinggi: m.tinggi || '',
          p: parseFloat(m.p) || null,
          l: parseFloat(m.l) || null,
          t: parseFloat(m.t) || null,
          jml: parseInt(m.jml) || 1,
          dunit: m.dunit || '',
          bbox: m.bbox || '',
          fin: m.fin || '',
          plap: m.plap || '',
          ibox: m.ibox || '',
          stup: m.stup || '',
          jtutup: m.jtutup || '',
          jnistutup: m.jnistutup || '',
          hndl: m.hndl || '',
          acc: m.acc || '',
          lmp: m.lmp || '',
          plnt: m.plnt || '',
          keterangan: m.keterangan || ''
        };
        const res = await api.post('/moduls', payload).catch(console.error);
        if (res) {
          // Replace temp ID with the database UUID in local state
          setState(prev => ({
            ...prev,
            moduls: (prev.moduls || []).map(x => x.id === m.id ? { ...x, id: res.id } : x)
          }));
          // Now save template parts
          if (m.komponen && m.komponen.length > 0) {
            await api.post(`/moduls/${res.id}/template-parts/bulk`, { parts: m.komponen }).catch(console.error);
          }
        }
      }
    }

    // Updated
    const updated = nArr.filter(n => pArr.some(p => p.id === n.id && p !== n));
    for (const m of updated) {
      if (typeof m.id === 'string') {
        console.log(`✏️ DB Update Modul: ${m.kabinet}`);
        await api.put(`/moduls/${m.id}`, m).catch(console.error);
        // Also save template parts (komponen)
        await api.post(`/moduls/${m.id}/template-parts/bulk`, { parts: m.komponen || [] }).catch(console.error);
      }
    }
  }

  else if (key === 'projects') {
    // 2. Active Projects & their breakdowns
    // Deleted
    const deleted = pArr.filter(p => !nArr.some(n => n.id === p.id));
    for (const p of deleted) {
      if (typeof p.id === 'string') {
        console.log(`🗑 DB Delete Project: ${p.name}`);
        await api.delete(`/projects/${p.id}`).catch(console.error);
      }
    }

    // Created
    const created = nArr.filter(n => !pArr.some(p => p.id === n.id));
    for (const p of created) {
      console.log(`➕ DB Create Project: ${p.name}`);
      const res = await api.post('/projects', {
        name: p.name || 'Project Baru',
        client: p.client || '',
        status: p.status || 'active',
        speks: p.speks && p.speks[0] ? p.speks[0] : {}
      }).catch(console.error);
      if (res) {
        // Replace temp ID with the database UUID in local state
        setState(prev => ({
          ...prev,
          projects: (prev.projects || []).map(x => x.id === p.id ? { ...x, id: res.id, breakdown: p.breakdown || [] } : x)
        }));
        // Save breakdown if any
        if (p.breakdown && p.breakdown.length > 0) {
          await saveProjectBreakdown(res.id, p.breakdown, state, setState).catch(console.error);
        }
      }
    }

    // Updated
    const updated = nArr.filter(n => pArr.some(p => p.id === n.id && p !== n));
    for (const p of updated) {
      if (typeof p.id === 'string') {
        const prevProj = pArr.find(x => x.id === p.id);
        
        // Only update project metadata if name, client, or speks changed
        const metaChanged = !prevProj ||
          prevProj.name !== p.name ||
          prevProj.client !== p.client ||
          prevProj.speks !== p.speks;

        if (metaChanged) {
          console.log(`✏️ DB Update Project: ${p.name}`);
          await api.put(`/projects/${p.id}`, {
            name: p.name,
            client: p.client,
            status: p.status || 'active',
            speks: p.speks && p.speks[0] ? p.speks[0] : {}
          }).catch(console.error);
        }

        // Only update breakdown if the breakdown array reference changed
        if (prevProj && prevProj.breakdown !== p.breakdown) {
          console.log('🧩 DB Update Breakdown for project:', p.name);
          await saveProjectBreakdown(p.id, p.breakdown || [], state, setState).catch(console.error);
        }
      }
    }
  }

  else if (key === 'stock') {
    // 3. Stock / Inventory
    // Helper: gunakan _uuid (UUID DB) sebagai identifier unik, fallback ke id (kode)
    const getId = s => s._uuid || s.id;

    // Deleted
    const deleted = pArr.filter(p => !nArr.some(n => getId(n) === getId(p)));
    for (const s of deleted) {
      const uid = getId(s);
      if (uid) {
        console.log(`🗑 DB Delete Stock: ${s.nama}`);
        await api.delete(`/stock/${uid}`).catch(console.error);
      }
    }

    // Created
    const created = nArr.filter(n => !pArr.some(p => getId(p) === getId(n)));
    for (const s of created) {
      console.log(`➕ DB Create Stock: ${s.nama}`);
      const payload = {
        nama: s.nama,
        kode: s.kode || '',
        tebal: parseFloat(s.tebal) || 0,
        satuan: s.satuan || s.sat || '',
        harga: parseFloat(s.harga) || 0,
        keterangan: s.keterangan || s.ket || ''
      };
      const res = await api.post('/stock', payload).catch(console.error);
      if (res) {
        setState(prev => ({
          ...prev,
          stock: (prev.stock || []).map(x => getId(x) === getId(s) ? { ...x, id: x.kode || '', _uuid: res.id } : x)
        }));
      }
    }

    // Updated
    const updated = nArr.filter(n => pArr.some(p => getId(p) === getId(n) && JSON.stringify(p) !== JSON.stringify(n)));
    for (const s of updated) {
      const uid = getId(s);
      if (uid) {
        console.log(`✏️ DB Update Stock: ${s.nama}`);
        const payload = {
          nama: s.nama,
          kode: s.kode || '',
          tebal: parseFloat(s.tebal) || 0,
          satuan: s.satuan || s.sat || '',
          harga: parseFloat(s.harga) || 0,
          keterangan: s.keterangan || s.ket || ''
        };
        await api.put(`/stock/${uid}`, payload).catch(console.error);
      }
    }
  }

  else if (key === 'parts') {
    // 4. Parts master templates
    // Deleted
    const deleted = pArr.filter(p => !nArr.some(n => n.id === p.id));
    for (const p of deleted) {
      if (typeof p.id === 'string') {
        console.log(`🗑 DB Delete Part: ${p.val || p.name}`);
        await api.delete(`/parts/${p.id}`).catch(console.error);
      }
    }

    // Created
    const created = nArr.filter(n => !pArr.some(p => p.id === n.id));
    for (const p of created) {
      console.log(`➕ DB Create Part: ${p.name || p.val}`);
      const payload = {
        val: p.val || '',
        name: p.name || '',
        code: p.code || '',
        ks: p.ks || '',
        lap_luar: p.lap_luar || '',
        edg: p.edg || p.edg_p1 || '',
        alias: p.alias || '',
        opt: typeof p.opt === 'number' ? p.opt : 0,
        keterangan: JSON.stringify(p)
      };
      const res = await api.post('/parts', payload).catch(console.error);
      if (res) {
        setState(prev => ({
          ...prev,
          parts: (prev.parts || []).map(x => x.id === p.id ? { ...x, id: res.id } : x)
        }));
      }
    }

    // Updated
    const updated = nArr.filter(n => pArr.some(p => p.id === n.id && JSON.stringify(p) !== JSON.stringify(n)));
    for (const p of updated) {
      if (typeof p.id === 'string') {
        console.log(`✏️ DB Update Part: ${p.name || p.val}`);
        const payload = {
          val: p.val || '',
          name: p.name || '',
          code: p.code || '',
          ks: p.ks || '',
          lap_luar: p.lap_luar || '',
          edg: p.edg || p.edg_p1 || '',
          alias: p.alias || '',
          opt: typeof p.opt === 'number' ? p.opt : 0,
          keterangan: JSON.stringify(p)
        };
        await api.put(`/parts/${p.id}`, payload).catch(console.error);
      }
    }
  }

  else if (key === 'setupItems') {
    // 5. Setup Items
    // Deleted
    const deleted = pArr.filter(p => !nArr.some(n => n.id === p.id));
    for (const s of deleted) {
      if (typeof s.id === 'string') {
        console.log(`🗑 DB Delete SetupItem: ${s.name}`);
        await api.delete(`/setup-items/${s.id}`).catch(console.error);
      }
    }

    // Created
    const created = nArr.filter(n => !pArr.some(p => p.id === n.id));
    for (const s of created) {
      console.log(`➕ DB Create SetupItem: ${s.name}`);
      const res = await api.post('/setup-items', { name: s.name, no: s.no, ks: s.ks }).catch(console.error);
      if (res) {
        setState(prev => ({
          ...prev,
          setupItems: (prev.setupItems || []).map(x => x.id === s.id ? { ...x, id: res.id } : x)
        }));
      }
    }

    // Updated
    const updated = nArr.filter(n => pArr.some(p => p.id === n.id && JSON.stringify(p) !== JSON.stringify(n)));
    for (const s of updated) {
      if (typeof s.id === 'string') {
        console.log(`✏️ DB Update SetupItem: ${s.name}`);
        await api.put(`/setup-items/${s.id}`, { name: s.name, no: s.no, ks: s.ks }).catch(console.error);
      }
    }
  }

  else if (key === 'categories') {
    // 6. Categories (ON CONFLICT DO UPDATE so just upsert on any change)
    const updated = nArr.filter(n => {
      const prevCat = pArr.find(p => p.code === n.code);
      return !prevCat || JSON.stringify(prevCat) !== JSON.stringify(n);
    });
    for (const c of updated) {
      console.log(`📂 DB Upsert Category: ${c.name}`);
      await api.post('/categories', c).catch(console.error);
    }
  }

  else if (key === 'tplSections') {
    // 7. Template Sections specification structure
    console.log('📋 DB Sync tplSections');
    await api.put('/settings/tplSections', { value: nArr }).catch(console.error);
  }

  else if (key === 'modulMasterData') {
    // 8. Modul Master Data (Deskripsi Unit, Bentuk Box, etc.)
    console.log('🗂 DB Sync modulMasterData');
    await api.put('/settings/modulMasterData', { value: nArr }).catch(console.error);
  }

  else if (key === 'globalConstants') {
    // 9. Global Constants (Defined Names)
    console.log('📋 DB Sync globalConstants');
    await api.put('/settings/globalConstants', { value: next }).catch(console.error);
  }
}

/**
 * saveProjectBreakdown — Groups a flat React project breakdown array into relational moduls & breakdown rows
 */
async function saveProjectBreakdown(projectId, breakdown, state, setState) {
  if (!breakdown) return;

  // Group rows by module.
  const groups = [];
  let currentGroup = null;

  for (const r of breakdown) {
    if (r.isParent) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        parent: r,
        rows: []
      };
    } else {
      if (currentGroup) {
        currentGroup.rows.push(r);
      } else {
        // Fallback for rows before any parent row
        currentGroup = {
          parent: { modul: 'Lepasan', komp: 'Part Lepasan', isParent: true },
          rows: [r]
        };
      }
    }
  }
  if (currentGroup) groups.push(currentGroup);

  // Resolve project spec aliases & synced categories
  const activeProject = (state.projects || []).find(p => p.id === projectId);
  const activeSpec = activeProject?.speks?.[0] || {};
  const syncedCategories = syncCategoriesWithSpek(state.categories || [], activeSpec, state.stock || []);
  const activeSpecWithGC = {
    ...activeSpec,
    globalConstants: state.globalConstants || {},
    stock: state.stock || [],
    categories: syncedCategories
  };
  const specAliases = buildAliasMap(activeSpecWithGC);

  // Get existing modules in this project
  const modRes = await api.get(`/moduls?project_id=${projectId}`).catch(() => []);
  const existingModuls = modRes.data || modRes || [];

  const allInsertedRows = [];
  const activeModulIds = new Set();

  for (const g of groups) {
    const cabinet = g.parent.modul || g.parent.kabinet || 'Lepasan';
    
    // 1. First try to find by ID
    let matchedModul = null;
    if (g.parent.modul_id) {
      matchedModul = existingModuls.find(m => m.id === g.parent.modul_id);
    }
    
    // 2. Fallback to matching by cabinet name
    if (!matchedModul) {
      matchedModul = existingModuls.find(m => m.kabinet === cabinet);
    }

    const payload = {
      project_id: projectId,
      tgl: g.parent.tgl || new Date().toISOString().slice(0, 10),
      nip: g.parent.nip || '',
      proyek: g.parent.proyek || '',
      produk: g.parent.komp || g.parent.produk || 'Custom Modul',
      kabinet: cabinet,
      tinggi: g.parent.tinggi || '',
      p: parseFloat(g.parent.p) || null,
      l: parseFloat(g.parent.l) || null,
      t: parseFloat(g.parent.t) || null,
      jml: parseInt(g.parent.jml) || 1,
      dunit: g.parent.dunit || '',
      bbox: g.parent.bbox || '',
      fin: g.parent.fin || '',
      plap: g.parent.plap || '',
      ibox: g.parent.ibox || '',
      stup: g.parent.stup || '',
      jtutup: g.parent.jtutup || '',
      jnistutup: g.parent.jnistutup || '',
      hndl: g.parent.hndl || '',
      acc: g.parent.acc || '',
      lmp: g.parent.lmp || '',
      plnt: g.parent.plnt || '',
      keterangan: g.parent.keterangan || ''
    };

    if (matchedModul) {
      // 3. Update existing modul name if it changed
      if (matchedModul.kabinet !== cabinet) {
        console.log(`✏️ DB Update Modul name: ${matchedModul.kabinet} -> ${cabinet}`);
        await api.put(`/moduls/${matchedModul.id}`, {
          ...payload,
          id: matchedModul.id
        }).catch(console.error);
        matchedModul.kabinet = cabinet;
      }
    } else {
      // 4. Create new modul in DB
      console.log(`➕ DB Create Modul: ${cabinet}`);
      const master = (state.moduls || []).find(m => m.kabinet === cabinet);
      matchedModul = await api.post('/moduls', {
        ...payload,
        produk: g.parent.komp || g.parent.produk || master?.produk || 'Custom Modul',
        tinggi: g.parent.tinggi || master?.tinggi || '',
        dunit: g.parent.dunit || master?.dunit || '',
        bbox: g.parent.bbox || master?.bbox || '',
        fin: g.parent.fin || master?.fin || '',
        plap: g.parent.plap || master?.plap || '',
        ibox: g.parent.ibox || master?.ibox || '',
        stup: g.parent.stup || master?.stup || '',
        jtutup: g.parent.jtutup || master?.jtutup || '',
        jnistutup: g.parent.jnistutup || master?.jnistutup || '',
        hndl: g.parent.hndl || master?.hndl || '',
        acc: g.parent.acc || master?.acc || '',
        lmp: g.parent.lmp || master?.lmp || '',
        plnt: g.parent.plnt || master?.plnt || '',
      }).catch(console.error);
    }

    if (matchedModul && matchedModul.id) {
      activeModulIds.add(matchedModul.id);
      // Re-include the parent row at the front of the rows list so it is saved in breakdown_rows
      const rowsToSave = [g.parent, ...g.rows];

      // Evaluate formulas on all breakdown rows to numbers/resolved strings
      const evaluatedRows = rowsToSave.map((r, idx) => {
        const resolvedRow = resolveBreakdownItem(r, specAliases);
        // calcBreakdownItem is designed for part/child rows, but run it safely
        const calc = !r.isParent ? calcBreakdownItem(r, breakdown, activeSpecWithGC, g.parent) : {};

        const evalNumOrNull = (val) => {
          if (val === undefined || val === null || val === '') return null;
          const evaled = evaluateFormula(val, breakdown, activeSpecWithGC, g.parent, 0, state.setupItems || []);
          const parsed = parseFloat(evaled);
          return isNaN(parsed) ? null : parsed;
        };

        return {
          ...r,
          // Text fields resolved to their spec values
          bhn: resolvedRow.bhn || '',
          lap_luar: resolvedRow.lap_luar || '',
          lap_dalam: resolvedRow.lap_dalam || '',
          edg_p1: resolvedRow.edg_p1 || '',
          edg_p2: resolvedRow.edg_p2 || '',
          edg_l1: resolvedRow.edg_l1 || '',
          edg_l2: resolvedRow.edg_l2 || '',

          // Save raw formula strings directly (or static values)
          p: r.p !== undefined && r.p !== null ? String(r.p) : null,
          l: r.l !== undefined && r.l !== null ? String(r.l) : null,
          t: r.t !== undefined && r.t !== null ? String(r.t) : null,
          sub: r.sub !== undefined && r.sub !== null ? String(r.sub) : null,
          jml: r.jml !== undefined && r.jml !== null ? String(r.jml) : null,

          // Remaining numeric fields saved as raw formula/value strings
          t_bhn: r.t_bhn !== undefined && r.t_bhn !== null ? String(r.t_bhn) : null,
          l_fin: r.l_fin !== undefined && r.l_fin !== null ? String(r.l_fin) : null,
          d_fin: r.d_fin !== undefined && r.d_fin !== null ? String(r.d_fin) : null,
          p1: r.p1 !== undefined && r.p1 !== null ? String(r.p1) : null,
          p2: r.p2 !== undefined && r.p2 !== null ? String(r.p2) : null,
          l1: r.l1 !== undefined && r.l1 !== null ? String(r.l1) : null,
          l2: r.l2 !== undefined && r.l2 !== null ? String(r.l2) : null,
          t_luar: evalNumOrNull(resolvedRow.t_luar),
          t_dalam: evalNumOrNull(resolvedRow.t_dalam),

          // Hardware quantities calculated to static numbers
          q_engsel: calc.hardware?.engsel ?? 0,
          q_rel: calc.hardware?.rel ?? 0,
          q_dormec: calc.hardware?.dormec ?? 0,
          q_minifix: calc.hardware?.minifix ?? 0,
          q_dowel: calc.hardware?.dowel ?? 0,
          q_siku: calc.hardware?.siku ?? 0,
          q_screw: calc.hardware?.screw ?? 0,

          is_parent: r.isParent || r.is_parent || false,
          urutan: idx,
        };
      });

      // Bulk insert all breakdown rows (including parent) for this module
      const bulkRes = await api.post('/breakdown/bulk', {
        modul_id: matchedModul.id,
        project_id: projectId,
        rows: evaluatedRows
      }).catch(console.error);

      if (bulkRes && Array.isArray(bulkRes.rows)) {
        const mapped = bulkRes.rows.map(row => ({
          ...row,
          modul: matchedModul.kabinet,
          kabinet: matchedModul.kabinet
        }));
        allInsertedRows.push(...mapped);
      }
    }
  }

  // 5. Delete modules that are no longer in the active groups
  const deletedModuls = existingModuls.filter(m => !activeModulIds.has(m.id));
  for (const m of deletedModuls) {
    console.log(`🗑️ DB Delete Modul (Project): ${m.kabinet}`);
    await api.delete(`/moduls/${m.id}`).catch(console.error);
  }

  // We skip updating local React state with fresh DB-inserted objects on every debounced sync.
  // This prevents React from forcing full-renders of the large breakdown table,
  // making background saves completely invisible and lag-free.
}

