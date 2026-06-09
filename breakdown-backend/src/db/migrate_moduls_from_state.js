const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./index');

function extractFromSource(filePath, objName) {
  let src = fs.readFileSync(filePath, 'utf-8');
  src = src.replace(/\/\/.*/g, '');

  let startMarker = objName + ': [';
  let arrayStart = src.indexOf(startMarker);
  let useBraces = false;
  if (arrayStart === -1) {
    startMarker = objName + ': {';
    arrayStart = src.indexOf(startMarker);
    useBraces = true;
  }
  if (arrayStart === -1) throw new Error('Could not find ' + objName);

  const contentStart = arrayStart + startMarker.length - 1;
  const openChar = useBraces ? '{' : '[';
  const closeChar = useBraces ? '}' : ']';

  let depth = 0;
  let i = contentStart;
  do {
    if (src[i] === openChar) depth++;
    if (src[i] === closeChar) depth--;
    i++;
  } while (depth > 0 && i < src.length);

  const content = src.slice(contentStart, i);
  return new Function('return (' + content + ')')();
}

async function migrate() {
  const projectId = process.argv.find(a => a.startsWith('--project='))?.split('=')[1];

  if (!projectId) {
    console.log('Usage: node src/db/migrate_moduls_from_state.js --project=<project-uuid>');
    console.log('The project must already exist (script does NOT create projects).');
    process.exit(1);
  }

  const stateFile = path.resolve(__dirname, '../../../src/initialState.js');

  let moduls, tplSections;
  try {
    moduls = extractFromSource(stateFile, 'moduls');
    tplSections = extractFromSource(stateFile, 'tplSections');
  } catch (err) {
    console.error('Failed to parse initialState.js:', err.message);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify project exists
    const projCheck = await client.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (projCheck.rows.length === 0) {
      console.error('Project not found: ' + projectId);
      process.exit(1);
    }

    // --- Migrate moduls ---
    await client.query('DELETE FROM breakdown_rows');
    await client.query('DELETE FROM moduls');
    console.log('Migrating moduls...');

    for (const modul of moduls) {
      const komponen = modul.komponen || [];
      const modId = uuidv4();

      await client.query(`
        INSERT INTO moduls (id, project_id, tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml, dunit, bbox, fin, plap, ibox, stup, jtutup, jnistutup, hndl, acc, lmp, plnt)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      `, [
        modId, projectId, modul.tgl, modul.nip, modul.proyek, modul.produk,
        modul.kabinet, modul.tinggi, modul.p, modul.l, modul.t, modul.jml,
        modul.dunit, modul.bbox, modul.fin, modul.plap, modul.ibox, modul.stup,
        modul.jtutup, modul.jnistutup, modul.hndl, modul.acc, modul.lmp, modul.plnt
      ]);

      const toNum = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);

      for (let i = 0; i < komponen.length; i++) {
        const r = komponen[i];
        const bid = 'MOD-' + String(modul.id).padStart(3, '0') + '-' + String(i + 1).padStart(3, '0');
        await client.query(`
          INSERT INTO breakdown_rows (modul_id, project_id, bid, cat, type, kode, tpk, no, komp, proses, p, l, t, sub, jml, bhn, t_bhn, l_fin, d_fin, lap_luar, lap_dalam, p1, p2, l1, l2, edg_p1, edg_p2, edg_l1, edg_l2, q_engsel, q_rel, q_dormec, q_minifix, q_dowel, urutan)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)
        `, [
          modId, projectId, bid, r.cat, r.type, r.kode, r.tpk, r.no, r.komp, r.proses,
          toNum(r.p), toNum(r.l), toNum(r.t), toNum(r.sub), toNum(r.jml),
          r.bhn, toNum(r.t_bhn), toNum(r.l_fin), toNum(r.d_fin),
          r.lap_luar, r.lap_dalam,
          toNum(r.p1), toNum(r.p2), toNum(r.l1), toNum(r.l2),
          r.edg_p1, r.edg_p2, r.edg_l1, r.edg_l2,
          toNum(r.q_engsel), toNum(r.q_rel), toNum(r.q_dormec), toNum(r.q_minifix), toNum(r.q_dowel), i
        ]);
      }

      console.log(`  Modul #${modul.id}: "${modul.produk}" — ${komponen.length} rows`);
    }

    const totalModuls = moduls.length;
    const totalRows = moduls.reduce((s, m) => s + (m.komponen || []).length, 0);

    // --- Migrate tplSections into speks ---
    if (tplSections.length > 0) {
      await client.query('DELETE FROM speks');
      console.log('\nMigrating tplSections → speks...');

      for (const section of tplSections) {
        for (let i = 0; i < section.rows.length; i++) {
          const row = section.rows[i];
          const defaultValue = row.default !== undefined ? row.default : null;
          await client.query(`
            INSERT INTO speks (project_id, section, alias, source, label, value)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [projectId, section.name, row.alias, row.source || null, row.label || null, defaultValue]);
        }
        console.log(`  Section "${section.name}": ${section.rows.length} rows`);
      }
    }

    // --- Migrate template_parts from modul komponen ---
    await client.query('DELETE FROM template_parts');
    await client.query('DELETE FROM sub_moduls');
    console.log('\nMigrating template_parts...');

    for (const modul of moduls) {
      if (!modul.komponen || modul.komponen.length === 0) continue;

      const dbModul = await client.query('SELECT id FROM moduls WHERE produk = $1 AND proyek = $2 LIMIT 1', [modul.produk, modul.proyek]);
      if (dbModul.rows.length === 0) continue;
      const modulId = dbModul.rows[0].id;

      const smRes = await client.query(`
        INSERT INTO sub_moduls (modul_id, name, urutan)
        VALUES ($1, $2, $3) RETURNING id
      `, [modulId, 'Default Template', 0]);
      const subModulId = smRes.rows[0].id;

      for (let i = 0; i < modul.komponen.length; i++) {
        const r = modul.komponen[i];
        await client.query(`
          INSERT INTO template_parts (sub_modul_id, modul_id, cat, type, kode, tpk, no, komp, proses, p, l, t, sub, jml, bhn, t_bhn, jml_muka, l_fin, d_fin, lap_luar, lap_dalam, p1, p2, l1, l2, edg_p1, edg_p2, edg_l1, edg_l2, q_engsel, q_rel, q_dormec, q_minifix, q_dowel, is_parent, urutan)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
        `, [
          subModulId, modulId,
          r.cat, r.type, r.kode, r.tpk, r.no, r.komp, r.proses,
          r.p !== undefined ? String(r.p) : null,
          r.l !== undefined ? String(r.l) : null,
          r.t !== undefined ? String(r.t) : null,
          r.sub, r.jml,
          r.bhn, r.t_bhn !== undefined ? String(r.t_bhn) : null,
          r.jml_muka, r.l_fin !== undefined ? String(r.l_fin) : null,
          r.d_fin !== undefined ? String(r.d_fin) : null,
          r.lap_luar, r.lap_dalam,
          r.p1 !== undefined ? String(r.p1) : null,
          r.p2 !== undefined ? String(r.p2) : null,
          r.l1 !== undefined ? String(r.l1) : null,
          r.l2 !== undefined ? String(r.l2) : null,
          r.edg_p1, r.edg_p2, r.edg_l1, r.edg_l2,
          r.q_engsel || 0, r.q_rel || 0, r.q_dormec || 0, r.q_minifix || 0, r.q_dowel || 0,
          r.isParent || false, i
        ]);
      }
      console.log(`  Template "${modul.produk}": ${modul.komponen.length} parts`);
    }

    await client.query('COMMIT');

    const speksCount = (await client.query('SELECT COUNT(*) as cnt FROM speks')).rows[0].cnt;
    const tpCount = (await client.query('SELECT COUNT(*) as cnt FROM template_parts')).rows[0].cnt;
    const smCount = (await client.query('SELECT COUNT(*) as cnt FROM sub_moduls')).rows[0].cnt;

    console.log(`\n✅ Done: ${totalModuls} moduls (${totalRows} breakdown_rows), ${speksCount} speks, ${smCount} sub_moduls, ${tpCount} template_parts`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
