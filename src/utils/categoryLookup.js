/**
 * Lookup nilai dari category berdasarkan code group dan code angka item.
 * 
 * Struktur item: { code, val, name }
 * - code : angka lookup key dari breakdown Excel (index/match) — misal 11, 0, 9, 22
 * - val  : nomor urut per section (auto-increment, untuk display saja)
 * - name : label / nama material
 * 
 * Contoh:
 *   lookupCat(categories, 'tf', 11) → "HB_41130"
 *   lookupCat(categories, 'tf', 1)  → null  ← val 1 bukan code, jadi tidak match
 *   lookupCat(categories, 'edg', 1) → "Edg_Décor_1723_B"  ← kalau code-nya 1
 * 
 * @param {Array}  categories - array category dari state
 * @param {string} catCode    - code group (misal 'tf', 'bhn', 'edg')
 * @param {number|string} itemCode - code angka item yang dicari (dari breakdown)
 * @returns {string|null} nama/value, atau null kalau tidak ketemu
 */
export function lookupCat(categories = [], catCode, itemCode) {
    if (itemCode === undefined || itemCode === null || itemCode === '' || !catCode) return null;
    const cat = categories.find(c => c.code === catCode);
    if (!cat) return null;

    // Coba match berdasarkan field `code` (primary lookup key)
    const strCode = String(itemCode).trim();
    const numCode = Number(itemCode);

    const item = cat.items.find(item => {
        if (typeof item === 'string') return false;
        // Prioritas: gunakan field `code` kalau ada dan terisi
        if (item.code !== undefined && item.code !== '') {
            return String(item.code).trim() === strCode;
        }
        // Fallback legacy: kalau belum ada field code, gunakan val
        return Number(item.val) === numCode;
    });
    return item ? item.name : null;
}

/**
 * Buat map code → name untuk satu group.
 * Berguna untuk resolve banyak kode sekaligus tanpa loop berulang.
 * 
 * Contoh:
 *   const tfMap = buildCatMap(categories, 'tf');
 *   tfMap[11] → "HB_41130"   ← lookup by code, bukan val
 */
export function buildCatMap(categories = [], catCode) {
    const cat = categories.find(c => c.code === catCode);
    if (!cat) return {};
    return Object.fromEntries(
        cat.items
            .filter(item => typeof item === 'object')
            .map(item => {
                // Pakai code kalau ada & terisi, fallback ke val (legacy)
                const key = (item.code !== undefined && item.code !== '')
                    ? item.code
                    : Number(item.val);
                return [key, item.name];
            })
    );
}

/**
 * Buat map name → code untuk satu group (reverse lookup).
 * Berguna untuk mengkonversi nama material ke code breakdown.
 * 
 * Contoh:
 *   const tfRevMap = buildCatRevMap(categories, 'tf');
 *   tfRevMap['HB_41130'] → "11"
 */
export function buildCatRevMap(categories = [], catCode) {
    const cat = categories.find(c => c.code === catCode);
    if (!cat) return {};
    return Object.fromEntries(
        cat.items
            .filter(item => typeof item === 'object' && item.name)
            .map(item => {
                const key = (item.code !== undefined && item.code !== '')
                    ? item.code
                    : Number(item.val);
                return [item.name, key];
            })
    );
}