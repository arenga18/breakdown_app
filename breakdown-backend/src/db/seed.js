require('dotenv').config();
const { pool } = require('./index');

// ============ Categories from initialState.js + Excel master rekap ============
const categories = [
  // --- Dari Excel master rekap 2026_Boms (Data Validation - defined names) ---
  { name: 'Type Material', code: 'tpm', fieldtype: 'select', items: ['Ply','Ply+mdf hijau 1mk','Ply+mdf hijau 2mk','Mdf hijau','UPVC','Ply Bending','Blockboard'] },
  { name: 'Thickness Material', code: 'thm', fieldtype: 'select', items: ['18','15','12','6','9'] },
  { name: 'Type Finished', code: 'tf', fieldtype: 'select', items: [
    { code: '1', val: 1, name: 'WY_5216_D(V)', tebal: 1.0 },
    { code: '11', val: 2, name: 'HB_41130', tebal: 0.5 },
    { code: '0', val: 3, name: 'Polos', tebal: 0.0 },
    { code: '2', val: 4, name: '(WY_5216_D(V) rangka....', tebal: 1.0 },
    { code: '9', val: 5, name: '[Aica]', tebal: 0.5 },
    { code: '3', val: 6, name: 'L-FA_0206_AP', tebal: 1.0 },
    { code: '22', val: 7, name: 'Aica', tebal: 0.5 },
    { code: '4', val: 8, name: '(L-FA_0206_AP rangka.....', tebal: 1.0 },
    { code: '5', val: 9, name: 'DXO_1338_D', tebal: 1.0 },
    { code: '33', val: 10, name: 'Aica', tebal: 0.5 },
    { code: '7', val: 11, name: 'Duco', tebal: 0.5 }
  ]},
  { name: 'Direct Finished', code: 'df', fieldtype: 'select', items: ['(V)','(H)','+Hpl ...','(lihat detail serat)','-'] },
  { name: 'Sides Finished', code: 'sf', fieldtype: 'select', items: ['1muka','2muka','(lihat gbr)','1muka+Aica','-'] },
  { name: 'Type Edge', code: 'te', fieldtype: 'select', items: [
    { code: '11', val: 1, name: 'Edg_Décor_1723_B', tebal: 1.0 },
    { code: '9', val: 2, name: 'Melanor', tebal: 0.5 },
    { code: '0', val: 3, name: 'Polos', tebal: 0.0 },
    { code: '1', val: 4, name: 'Edg_EAW_5216D1', tebal: 1.0 },
    { code: '7', val: 5, name: 'Trim 21 S2/S4 Brown Doff ( Alm. 75181 ) P3', tebal: 1.0 },
    { code: '8', val: 6, name: 'Trim 22 S2/S4 Brown Doff ( Alm. 75270 ) P3', tebal: 1.0 },
    { code: '6', val: 7, name: 'ST-36 Brown Doff ( Alm. 2351 ) P3 P3', tebal: 1.0 },
    { code: '', val: 8, name: 'M-GRILL 01 COKLAT DOF', tebal: 1.0 },
    { code: '2', val: 9, name: 'Edg_EAW_5216_D1(44x1)', tebal: 1.0 },
    { code: '3', val: 10, name: 'Edg_DSS_00206_SM', tebal: 1.0 },
    { code: '4', val: 11, name: 'Edg_DSS_00206_SM_(45X1)', tebal: 0.0 },
    { code: '22', val: 12, name: 'Edg_Decor_1723_B_(55x1)', tebal: 1.0 },
    { code: '5', val: 13, name: 'Edg_EAP_1338_DO', tebal: 1.0 },
    { code: '33', val: 14, name: '0', tebal: 0.0 },
    { code: '66', val: 15, name: 'Edg_Decor_2023_B', tebal: 1.0 }
  ]},
  { name: 'Sides Edge', code: 'se', fieldtype: 'select', items: ['Keliling','1sisi_pjg','2sisi_pjg','1sisi_lbr','2sisi_lbr','1sisi pjg + melanor 3sisi','1sisi pjg + melanor 1sisi','-'] },

  // --- Existing (backward compat) ---
  { name: 'Tebal Material', code: 'thk', fieldtype: 'select', items: ['18','15','13.5','12','9','6','3','24','36'] },
  { name: 'Bahan Utama', code: 'bhn', fieldtype: 'select', items: ['Ply','Ply+mdf hijau 1mk','Ply+mdf hijau 2mk','Mdf hijau','UPVC','Ply Bending'] },
  { name: 'Lapisan Luar', code: 'lap_luar', fieldtype: 'select', items: [
    { code: '0', val: 1, name: 'Polos', tebal: 0.0 },
    { code: '11', val: 2, name: 'HB_41130', tebal: 0.5 },
    { code: '22', val: 3, name: 'Aica', tebal: 0.5 },
    { code: '33', val: 4, name: '[Aica]', tebal: 0.5 },
    { code: '44', val: 5, name: 'DSK_5450_SM', tebal: 1.0 },
    { code: '55', val: 6, name: 'SK_10455_UW', tebal: 1.0 },
    { code: '66', val: 7, name: 'GM_86', tebal: 1.0 },
    { code: '77', val: 8, name: 'DXP_5342_XM', tebal: 1.0 },
    { code: '88', val: 9, name: 'Duco', tebal: 0.5 },
    { code: '99', val: 10, name: 'Veneer', tebal: 0.5 },
    { code: '100', val: 11, name: 'UPVC', tebal: 0.0 },
    { code: '101', val: 12, name: 'Kaca', tebal: 0.0 },
    { code: '102', val: 13, name: '(DSK_5450_SM rangka……+Aica)', tebal: 1.0 },
    { code: '103', val: 14, name: '(SK_10455_UW rangka……+Aica)', tebal: 1.0 }
  ]},
  { name: 'Lapisan Dalam', code: 'lap_dalam', fieldtype: 'select', items: [
    { code: '0', val: 1, name: 'Polos', tebal: 0.0 },
    { code: '22', val: 2, name: 'Aica', tebal: 0.5 },
    { code: '11', val: 3, name: 'HB_41130', tebal: 0.5 },
    { code: 'Mel', val: 4, name: 'Melanor', tebal: 0.5 },
    { code: '88', val: 5, name: 'Duco', tebal: 0.5 }
  ]},
  { name: 'Edging', code: 'edg', fieldtype: 'select', items: [
    { code: '1', val: 1, name: 'Edg_Décor_1723_B', tebal: 1.0 },
    { code: '2', val: 2, name: 'Edg_Decor_1723_B_(55x1)', tebal: 1.0 },
    { code: '3', val: 3, name: 'Edg_DSS_00206_SM', tebal: 1.0 },
    { code: '4', val: 4, name: 'Edg_DSS_00206_SM_(45X1)', tebal: 1.0 },
    { code: '5', val: 5, name: 'Edg_u/_SK_10455_UW', tebal: 1.0 },
    { code: '6', val: 6, name: 'Edg_u/_SK_10455_UW_(45x1)', tebal: 1.0 },
    { code: '7', val: 7, name: 'Edg_u/_GM_86', tebal: 1.0 },
    { code: '8', val: 8, name: 'Edg_EAP_5342_M0', tebal: 1.0 },
    { code: '9', val: 9, name: 'Melanor', tebal: 0.5 },
    { code: '10', val: 10, name: 'Edg_HB_41130', tebal: 0.5 },
    { code: '11', val: 11, name: 'Edg_DXP_5342_XM', tebal: 1.0 }
  ]},
  { name: 'Jumlah Muka', code: 'muka', fieldtype: 'select', items: ['1','2'] },
  { name: 'Engsel', code: 'engsel', fieldtype: 'select', items: [
    'ENGSEL CLIP TOP 107 DEG INTEGRATED 75 B 1550 + 173 L 6100','ENGSEL CLIP TOP',
    'ENGSEL SALICE PUSH','ENGSEL 155 DRAJAT','ENGSEL BIFOLD','ENGSEL 79M9550',
    'ENGSEL S 8657i B12 TH52','ENGSEL S 8657i','ENGSEL 9936 W45',
    'ENGSEL PROFILE TEBAL PINTU 24 MM 71 B 9550 + 173 L 6100','ENGSEL PROFILE TEBAL',
    'Engsel Sensys Full Bengkok C 16-110 DERAJAT 907 1207','ENGSEL POCKET DOOR'
  ]},
  { name: 'Rel Laci', code: 'rel', fieldtype: 'select', items: [
    'LEGRABOX I6 ORION GREY','LEGRABOX S4 OG (ORION GREY)','LEGRA S1','LEGRABOX S4',
    'REL TANDEM BLUM SINGLE EXT INTG P.450','REL TANDEM BLUM SINGLE',
    'REL TANDEM BLUM FULL EXT INTG P.500','REL TANDEM BLUM FULL',
    'LACI B1S4 INTEGRATED','LACI B1S1','QUADRO V6 SFD FL 350 L/R','QUADRO V6',
    'MERIVOBOX MVX S4XL SW 500 70 BM','MERIVOBOX MVX S4 SW 500 70 BM','MERIVOBOX MVX'
  ]},
  { name: 'Alumunium / Anodize', code: 'alu', fieldtype: 'select', items: [
    'Trim 21 S2/S4 Black Doff ( Alm. 75181 ) P3','Trim 21 S2/S4',
    'Trim 22 S2/S4 Black Doff ( Alm. 75270 ) P3',
    'M-LED-02 Black Doff ( Alm. 75111 ) P3','M-LED-02',
    'M-PRF-01 Black Doff ( Alm. 75110 ) P3','M-PRF-01',
    'M-FRM Tutup Belakang Black Doff ( Alm. 75225 ) P3','M-FRM Tutup Belakang',
    'M-FRM Body Black Doff ( Alm. 75226 ) P3','M-FRM Body',
    'M-FRM-02 Black Doff ( Alm. 75227 ) P3','M-FRM-03 Brown Gloss ( Alm. 75229 ) P3',
    'M-FRM-07 Black Doff ( Alm. 75355 ) P3','M-SHF-01/02 Brown Gloss ( Alm. 75109 ) P3',
    'LS-01 Black Gloss ( Alm. 86599 ) P3','LS-01 Black Gloss',
    'List Kaca Black Doff ( Alm. 6600/6599 ) P2.8','M-LIST-01 Black Doff ( Alm. 75112 ) P3',
    'Mullion Luar Black Doff ( Alm. 75114 ) P3','Mullion Dalam Mocha Gloss ( Alm. 41316 ) P3',
    'Alm. 75284 ( M-FRM-05 ) MENTAH P6','Alm. 75354 ( Mulion M-FRM-07 ) CA1 P6',
    'ST-36 Black Doff ( Alm. 2351 ) P3 P3'
  ]},
  { name: 'Handle', code: 'hand', fieldtype: 'select', items: [
    'MH-02 Black Doff ( Alm. 86706 ) P3 coak khusus','MH-02 Black Doff',
    'MH-08 Black Gloss ( Alm. 75289 ) P3','MH-08 Black Gloss',
    'MH-07 Black ( Alm. 75272 ) P3','MH-07 Black',
    'MH-04 Black ( Alm. 86705 ) P3 coak khusus','MH-04 Black',
    'MH-03B Black Doff ( Alm. 75117 ) P3','MH-03B Black Doff',
    'M-PLT-01 Black Doff ( Alm. 75256 ) P3','M-PLT-02 Black Doff ( Alm. 85830 ) P3'
  ]},
  { name: 'Kaca', code: 'kaca', fieldtype: 'select', items: [
    'MG_Coklat_Susu','Euro_Grey','Polos','MG_Purewhite','Bronze','Grey_Tinted','Moru↔','Acid_Clear'
  ]},
  { name: 'Door Mechanism', code: 'dormec', fieldtype: 'select', items: [
    'Pocket Door 55 cm','Aventos HK','Aventos HF','Aventos HS','Aventos HL'
  ]},
  { name: 'Profil', code: 'prof', fieldtype: 'select', items: [
    'PROFIL R5 MDF hijau 10X15X2350 (MR 02)','PROFIL MLP 06 MDF HIJAU P. 2440',
    'PROFIL BULAT MDF HIJAU (PB25) P.2440','PROFIL MLP 02 MDF HIJAU UK 2350X16X17( Tidak coak)',
    'PROFIL MLT 01 MDF + PLY 2440X128X24','PROFIL PLINT MPP-01 T.100  MDF HIJAU'
  ]},
  { name: 'Type Breakdown', code: 'typ', fieldtype: 'select', items: [
    'Ref','Set_up','prt','kab','pintu','laci','Shelf','Kc','proses_khusus','tandembox','legrabox','aventis'
  ]},
  { name: 'Opt Bahan', code: 'opt', fieldtype: 'select', items: ['0','1','-1'] },
  { name: 'Tebal Edging (mm)', code: 'edg_thk', fieldtype: 'select', items: ['0.5','1.0','1.5','2.0'] },
];

// ============ Modul Master data (abbreviated - key ones) ============
const modulMasterEntries = [
  // deskripsiUnit
  ...[
    ['B\'Panel','B\'Panel'],['Box Mati','Box Mati'],['Cover Kabinet','CB'],['FC','FC'],
    ['HC','HC'],['HC Hood','HC Hood'],['TC','TC'],['TC Cargo','TC Cargo'],
    ['Kabinet','K'],['Kabinet Laci','KL'],['Wardrobe','Wrd'],['OS','OS'],
    ['Rangka','Rangka'],['Nakas','Nks'],['End Panel','E\'panel'],['Back Panel','B\'Panel'],
  ].map(([name, code], i) => ({ tipe: 'deskripsiUnit', name, code, urutan: i })),

  // bentukBox
  ...[
    ['Standart+Braket kayu','SBK'],['atas bawah full tanpa palang','F'],
    ['Panel Mati','Pm'],['L','L'],['Samping Turun Kanan','┐'],['Samping Turun Kiri','┌'],
    ['Samping Turun Kanan Kiri','║'],['miring 45°','○'],['Klos Pintu / Rangka saja','klos'],
  ].map(([name, code], i) => ({ tipe: 'bentukBox', name, code, urutan: i })),

  // finishing
  ...[
    ['Polos/Mentah','0'],['Warna Kabinet','K'],['HPL','H'],['Duco','D'],['Veneer','V'],
    ['Kaca','Kc'],['Kaca S2','K2'],['Kaca S4','K4'],
  ].map(([name, code], i) => ({ tipe: 'finishing', name, code, urutan: i })),

  // sistemTutup
  ...[
    ['-','0'],['Swing D 165°','SW'],['Sliding D Top Line','SL'],['Pocket D','PD'],
    ['Flap D (aventos HF)','hf'],['Flap D (aventos HK)','hk'],['Laci Blum','tdm'],
    ['Legrabox S4','Lg4'],['Merivobox S1+S4','Mv14'],['Tandembox B1S1','Tx1'],
  ].map(([name, code], i) => ({ tipe: 'sistemTutup', name, code, urutan: i })),
];

async function seedCategories(client) {
  console.log('  Seeding categories...');
  for (const cat of categories) {
    await client.query(`
      INSERT INTO categories (name, code, fieldtype, items)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        fieldtype = EXCLUDED.fieldtype,
        items = EXCLUDED.items,
        updated_at = NOW()
    `, [cat.name, cat.code, cat.fieldtype, JSON.stringify(cat.items)]);
  }
  console.log(`    ✓ ${categories.length} categories seeded`);
}

async function seedModulMaster(client) {
  console.log('  Seeding modul_master...');
  for (const entry of modulMasterEntries) {
    await client.query(`
      INSERT INTO modul_master (tipe, name, code, urutan)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [entry.tipe, entry.name, entry.code, entry.urutan]);
  }
  console.log(`    ✓ ${modulMasterEntries.length} modul master entries seeded`);
}

async function seedSampleProject(client) {
  console.log('  Seeding sample project...');

  const projRes = await client.query(`
    INSERT INTO projects (name, client, kode, status)
    VALUES ('Project Citra Grand', 'Citra Grand', 'CGR-001', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id
  `);

  if (projRes.rows.length === 0) {
    console.log('    Sample project already exists, skipping.');
    return;
  }

  const projectId = projRes.rows[0].id;

  // Sample modul
  const modRes = await client.query(`
    INSERT INTO moduls (project_id, tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml, dunit, bbox, fin, plap, stup, jtutup, jnistutup, hndl, acc, lmp, plnt)
    VALUES ($1, '2024-05-10', 'EMP001', 'Project Citra Grand', 'Kitchen Base 600', 'FC-Ck001-sw2QK2Hk-00a', '850', 863, 560, 704, 1, 'FC', 'Standard Box', 'HB_41130', 'Luar Saja', 'Soft Close', '2', 'Pintu Ayun', 'MH-02 Black Doff', 'None', 'None', 'Standard')
    RETURNING id
  `, [projectId]);

  const modulId = modRes.rows[0].id;

  // Sample breakdown rows
  const sampleRows = [
    { bid: 'MOD-001', cat: 'kabinet', type: 'prt', kode: 'KS', tpk: 'A', no: '1', komp: 'Dinding Samping', p: 700, l: 560, t: 18, jml: 2, bhn: 'Ply', t_bhn: 18, lap_luar: 'Polos', lap_dalam: 'HB_41130', edg_p1: 'Edg_Décor_1723_B', edg_p2: 'Melanor', edg_l1: 'Melanor', edg_l2: 'Melanor', p1: 11, p2: 9, l1: 9, l2: 9 },
    { bid: 'MOD-001', cat: 'kabinet', type: 'prt', kode: 'KS', tpk: 'A', no: '2', komp: 'Dasar', p: 826, l: 560, t: 18, jml: 1, bhn: 'Ply', t_bhn: 18, lap_luar: 'Polos', lap_dalam: 'HB_41130', edg_p1: 'Edg_Décor_1723_B', edg_p2: 'Melanor', edg_l1: null, edg_l2: null, p1: 11, p2: 9, l1: 0, l2: 0 },
    { bid: 'MOD-001', cat: 'pintu', type: 'prt', kode: '─', tpk: 'A', no: '3', komp: 'Pintu Kaca S2', p: 670, l: 428, t: 14.5, jml: 2, bhn: 'Ply', t_bhn: 13.5, lap_luar: 'Aica', lap_dalam: 'HB_41130', edg_p1: 'Edg_DSS_00206_SM', edg_p2: 'Edg_DSS_00206_SM', edg_l1: null, edg_l2: null, p1: 1, p2: 1, l1: 0, l2: 0 },
  ];

  for (let i = 0; i < sampleRows.length; i++) {
    const r = sampleRows[i];
    await client.query(`
      INSERT INTO breakdown_rows (modul_id, project_id, bid, cat, type, kode, tpk, no, komp, p, l, t, jml, bhn, t_bhn, lap_luar, lap_dalam, edg_p1, edg_p2, edg_l1, edg_l2, p1, p2, l1, l2, urutan)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
    `, [modulId, projectId, r.bid, r.cat, r.type, r.kode, r.tpk, r.no, r.komp,
        r.p, r.l, r.t, r.jml, r.bhn, r.t_bhn, r.lap_luar, r.lap_dalam,
        r.edg_p1, r.edg_p2, r.edg_l1, r.edg_l2, r.p1, r.p2, r.l1, r.l2, i]);
  }

  console.log('    ✓ Sample project + 3 breakdown rows seeded');
}

async function runSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedCategories(client);
    await seedModulMaster(client);
    // await seedSampleProject(client); // disabled: projects are user-managed, no seed
    await client.query('COMMIT');
    console.log('✅ Seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
