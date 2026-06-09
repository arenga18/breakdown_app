/**
 * migrateAllToBackend — kirim semua data in-memory ke PostgreSQL backend.
 * Dipanggil dari tombol "Migrasi ke Database" di App.js.
 *
 * @param {object} state     - full React state dari App.js
 * @param {function} onLog   - callback(text) untuk progress reporting
 */

import { calcBreakdownItem } from '../utils/breakdownCalc';
import { resolveBreakdownItem, buildAliasMap } from '../utils/resolveAlias';
import { syncCategoriesWithSpek } from '../utils/categorySync';
import { evaluateFormula } from '../utils/calc';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `PUT ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function migrateAllToBackend(state, onLog) {
  const log = (msg) => { console.log(msg); onLog && onLog(msg); };
  const errors = [];

  // 1. Categories
  try {
    log('📂 Migrasi categories...');
    for (const cat of (state.categories || [])) {
      await post('/categories', {
        name: cat.name, code: cat.code,
        fieldtype: cat.fieldtype || 'select',
        items: cat.items || [],
      });
    }
    log(`  ✓ ${(state.categories || []).length} categories`);
  } catch (e) { errors.push('categories: ' + e.message); log('  ✗ ' + e.message); }

  // 2. TplSections (template struktur spek)
  try {
    log('📋 Migrasi tplSections...');
    await put('/settings/tplSections', { value: state.tplSections });
    log(`  ✓ tplSections (${(state.tplSections || []).length} sections)`);
  } catch (e) { errors.push('tplSections: ' + e.message); log('  ✗ ' + e.message); }

  // 3. ModulMasterData
  try {
    log('🗂 Migrasi modulMasterData...');
    await put('/settings/modulMasterData', { value: state.modulMasterData });
    log('  ✓ modulMasterData');
  } catch (e) { errors.push('modulMasterData: ' + e.message); log('  ✗ ' + e.message); }

  // 4. Setup Items
  try {
    log('🔧 Migrasi setupItems...');
    const items = state.setupItems || [];
    if (items.length > 0) {
      await post('/setup-items/bulk', { items });
      log(`  ✓ ${items.length} setup items`);
    } else {
      log('  — (kosong, skip)');
    }
  } catch (e) { errors.push('setupItems: ' + e.message); log('  ✗ ' + e.message); }

  // 5. Parts (template komponen — besar, ~12K records)
  try {
    log('🧩 Migrasi parts template...');
    const parts = state.parts || [];
    if (parts.length > 0) {
      // Kirim dalam batch 500 untuk menghindari timeout / body size limit
      const BATCH = 500;
      let sent = 0;
      for (let i = 0; i < parts.length; i += BATCH) {
        const batch = parts.slice(i, i + BATCH);
        await post('/parts/bulk', { parts: batch });
        sent += batch.length;
        log(`  → ${sent}/${parts.length} parts...`);
      }
      log(`  ✓ ${parts.length} parts total`);
    } else {
      log('  — (kosong, skip)');
    }
  } catch (e) { errors.push('parts: ' + e.message); log('  ✗ ' + e.message); }

  // 6. Stock (~16K records)
  try {
    log('📦 Migrasi stock inventory...');
    const stock = state.stock || [];
    if (stock.length > 0) {
      const BATCH = 1000;
      let sent = 0;
      for (let i = 0; i < stock.length; i += BATCH) {
        const batch = stock.slice(i, i + BATCH);
        await post('/stock/bulk', { stock: batch });
        sent += batch.length;
        log(`  → ${sent}/${stock.length} stock...`);
      }
      log(`  ✓ ${stock.length} stock records total`);
    } else {
      log('  — (kosong, skip)');
    }
  } catch (e) { errors.push('stock: ' + e.message); log('  ✗ ' + e.message); }

  // 7. Projects + Moduls + Breakdown
  try {
    log('🏗 Migrasi projects & moduls...');
    const projects = state.projects || [];
    for (const proj of projects) {
      // Buat project
      const projRes = await post('/projects', {
        name: proj.name || proj.norekap || 'Untitled Project',
        client: proj.client || proj.proyek || '',
        kode: proj.kode || proj.norekap || '',
        status: proj.status || 'active',
        keterangan: proj.keterangan || '',
      });
      const projectId = projRes.id;
      log(`  ✓ Project: ${projRes.name} (${projectId})`);

      // Resolve spec and aliases for this project
      const activeSpec = proj.speks?.[0] || {};
      const syncedCategories = syncCategoriesWithSpek(state.categories || [], activeSpec, state.stock || []);
      const activeSpecWithGC = {
        ...activeSpec,
        globalConstants: state.globalConstants || {},
        stock: state.stock || [],
        categories: syncedCategories
      };
      const specAliases = buildAliasMap(activeSpecWithGC);

      // Buat moduls
      const moduls = proj.moduls || [];
      for (const modul of moduls) {
        const modRes = await post('/moduls', {
          project_id: projectId,
          tgl: modul.tgl || new Date().toISOString().slice(0, 10),
          nip: modul.nip || '',
          proyek: modul.proyek || proj.name || '',
          produk: modul.produk || modul.name || '',
          kabinet: modul.kabinet || '',
          tinggi: modul.tinggi || '',
          p: parseFloat(modul.p) || null,
          l: parseFloat(modul.l) || null,
          t: parseFloat(modul.t) || null,
          jml: parseInt(modul.jml) || 1,
          dunit: modul.dunit || '',
          bbox: modul.bbox || '',
          fin: modul.fin || '',
          plap: modul.plap || '',
          ibox: modul.ibox || '',
          stup: modul.stup || '',
          jtutup: modul.jtutup || '',
          jnistutup: modul.jnistutup || '',
          hndl: modul.hndl || '',
          acc: modul.acc || '',
          lmp: modul.lmp || '',
          plnt: modul.plnt || '',
          keterangan: modul.keterangan || '',
        });
        const modulId = modRes.id;

        // Buat breakdown rows
        const rows = modul.items || modul.breakdown || [];
        if (rows.length > 0) {
          const evaluatedRows = rows.map((r, idx) => {
            const resolvedRow = resolveBreakdownItem(r, specAliases);
            const calc = calcBreakdownItem(r, rows, activeSpecWithGC, modul);

            const evalNumOrNull = (val) => {
              if (val === undefined || val === null || val === '') return null;
              const evaled = evaluateFormula(val, rows, activeSpecWithGC, modul, 0, state.setupItems || []);
              const parsed = parseFloat(evaled);
              return isNaN(parsed) ? null : parsed;
            };

            return {
              bid: r.bid || '',
              cat: r.cat || '',
              type: r.type || 'prt',
              kode: r.kode || '',
              tpk: r.tpk || '',
              no: r.no || '',
              komp: r.komp || '',
              proses: r.proses || '',
              bhn: resolvedRow.bhn || '',
              lap_luar: resolvedRow.lap_luar || '',
              lap_dalam: resolvedRow.lap_dalam || '',
              edg_p1: resolvedRow.edg_p1 || '',
              edg_p2: resolvedRow.edg_p2 || '',
              edg_l1: resolvedRow.edg_l1 || '',
              edg_l2: resolvedRow.edg_l2 || '',

              p: calc.p_val ?? 0,
              l: calc.l_val ?? 0,
              t: calc.t_val ?? 0,
              sub: calc.sub_val ?? 1,
              jml: calc.jml_val ?? 1,

              t_bhn: evalNumOrNull(resolvedRow.t_bhn),
              jml_muka: parseInt(r.jml_muka) || 1,
              l_fin: evalNumOrNull(resolvedRow.l_fin),
              d_fin: evalNumOrNull(resolvedRow.d_fin),
              p1: evalNumOrNull(resolvedRow.p1),
              p2: evalNumOrNull(resolvedRow.p2),
              l1: evalNumOrNull(resolvedRow.l1),
              l2: evalNumOrNull(resolvedRow.l2),
              t_luar: evalNumOrNull(resolvedRow.t_luar),
              t_dalam: evalNumOrNull(resolvedRow.t_dalam),

              q_engsel: calc.hardware?.engsel ?? 0,
              q_rel: calc.hardware?.rel ?? 0,
              q_dormec: calc.hardware?.dormec ?? 0,
              q_minifix: calc.hardware?.minifix ?? 0,
              q_dowel: calc.hardware?.dowel ?? 0,
              q_siku: calc.hardware?.siku ?? 0,
              q_screw: calc.hardware?.screw ?? 0,

              is_parent: r.isParent || r.is_parent || false,
              urutan: idx,
              opt: parseInt(r.opt) || 0
            };
          });

          await post('/breakdown/bulk', {
            modul_id: modulId,
            project_id: projectId,
            rows: evaluatedRows
          });
          log(`    → ${rows.length} rows breakdown modul ${modRes.produk}`);
        }
      }

    }
    log(`  ✓ ${projects.length} projects dimigrasi`);
  } catch (e) { errors.push('projects: ' + e.message); log('  ✗ ' + e.message); }

  // 8. Global Moduls (Modul Kodifikasi)
  try {
    log('📋 Migrasi Modul Kodifikasi (10 template rows)...');
    const moduls = state.moduls || [];
    
    // Simpan cache project ID untuk menghindari duplikasi
    const projectCache = {};

    // Cek project yang sudah ada di database agar tidak duplikat
    try {
      const getRes = await fetch(`${BASE}/projects`);
      if (getRes.ok) {
        const json = await getRes.json();
        const existing = json.data || json || [];
        for (const p of existing) {
          projectCache[p.name.toLowerCase()] = p.id;
        }
      }
    } catch (e) {
      log('  ℹ Gagal mengambil project existing, akan membuat baru jika tidak ada');
    }

    for (const modul of moduls) {
      const projName = modul.proyek || 'Master Templates';
      let projectId = projectCache[projName.toLowerCase()];
      
      if (!projectId) {
        // Create project
        const newProj = await post('/projects', {
          name: projName,
          client: projName,
          kode: '',
          status: 'active',
          keterangan: 'Auto-created during Modul Kodifikasi migration',
        });
        projectId = newProj.id;
        projectCache[projName.toLowerCase()] = projectId;
        log(`  ✓ Project Baru Dibuat: ${projName} (${projectId})`);
      }

      // Create Modul
      const modRes = await post('/moduls', {
        project_id: projectId,
        tgl: modul.tgl || new Date().toISOString().slice(0, 10),
        nip: modul.nip || '',
        proyek: modul.proyek || projName,
        produk: modul.produk || modul.name || '',
        kabinet: modul.kabinet || '',
        tinggi: modul.tinggi || '',
        p: parseFloat(modul.p) || null,
        l: parseFloat(modul.l) || null,
        t: parseFloat(modul.t) || null,
        jml: parseInt(modul.jml) || 1,
        dunit: modul.dunit || '',
        bbox: modul.bbox || '',
        fin: modul.fin || '',
        plap: modul.plap || '',
        ibox: modul.ibox || '',
        stup: modul.stup || '',
        jtutup: modul.jtutup || '',
        jnistutup: modul.jnistutup || '',
        hndl: modul.hndl || '',
        acc: modul.acc || '',
        lmp: modul.lmp || '',
        plnt: modul.plnt || '',
        keterangan: modul.keterangan || '',
      });

      const modulId = modRes.id;
      log(`  → Modul template dibuat: ${modul.kabinet}`);

      // Now create its template parts (komponen)
      const komponen = modul.komponen || [];
      if (komponen.length > 0) {
        await post(`/moduls/${modulId}/template-parts/bulk`, {
          parts: komponen.map((r, idx) => ({
            cat: r.cat || '', type: r.type || 'prt',
            kode: r.kode || '', tpk: r.tpk || '', no: r.no || '',
            komp: r.komp || '', proses: r.proses || '',
            p: r.p !== undefined ? r.p.toString() : null,
            l: r.l !== undefined ? r.l.toString() : null,
            t: r.t !== undefined ? r.t.toString() : null,
            sub: parseFloat(r.sub) || 1.0,
            jml: r.jml !== undefined ? r.jml.toString() : '1',
            bhn: r.bhn || '',
            t_bhn: r.t_bhn !== undefined ? r.t_bhn.toString() : null,
            jml_muka: parseInt(r.jml_muka) || 1,
            l_fin: r.l_fin !== undefined ? r.l_fin.toString() : null,
            d_fin: r.d_fin !== undefined ? r.d_fin.toString() : null,
            lap_luar: r.lap_luar || '', lap_dalam: r.lap_dalam || '',
            edg_p1: r.edg_p1 || '', edg_p2: r.edg_p2 || '',
            edg_l1: r.edg_l1 || '', edg_l2: r.edg_l2 || '',
            p1: r.p1 !== undefined ? r.p1.toString() : null,
            p2: r.p2 !== undefined ? r.p2.toString() : null,
            l1: r.l1 !== undefined ? r.l1.toString() : null,
            l2: r.l2 !== undefined ? r.l2.toString() : null,
            q_engsel: parseInt(r.q_engsel) || 0,
            q_rel: parseInt(r.q_rel) || 0,
            q_dormec: parseInt(r.q_dormec) || 0,
            q_minifix: parseInt(r.q_minifix) || 0,
            q_dowel: parseInt(r.q_dowel) || 0,
            is_parent: r.isParent || r.is_parent || false,
            urutan: idx,
            opt: r.opt !== undefined ? r.opt.toString() : '0',
            t_luar: r.t_luar !== undefined ? r.t_luar.toString() : '0',
            t_dalam: r.t_dalam !== undefined ? r.t_dalam.toString() : '0',
            q_siku: parseInt(r.q_siku) || 0,
            q_screw: parseInt(r.q_screw) || 0
          }))
        });
        log(`    ✓ ${komponen.length} template parts berhasil dimasukkan`);
      }
    }
    log(`  ✓ ${moduls.length} global moduls dimigrasi`);
  } catch (e) { errors.push('global_moduls: ' + e.message); log('  ✗ ' + e.message); }

  return errors;
}
