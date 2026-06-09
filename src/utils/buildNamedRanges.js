/**
 * Builds named ranges (defined names) from categories configuration
 * to support formula evaluation or lookup operations.
 * 
 * @param {Array} categories - The categories array from state
 * @returns {Object} A mapping of category codes to their items/definitions
 */
export function buildNamedRanges(categories = []) {
  const namedRanges = {};
  
  if (!Array.isArray(categories)) return namedRanges;

  categories.forEach(cat => {
    if (cat && cat.code) {
      // Store category items by its code in original, lowercase, and uppercase formats
      const items = cat.items || [];
      namedRanges[cat.code] = items;
      namedRanges[cat.code.toLowerCase()] = items;
      namedRanges[cat.code.toUpperCase()] = items;
      
      // Also register by category name if available
      if (cat.name) {
        const nameKey = cat.name.toUpperCase().replace(/\s+/g, '_');
        namedRanges[nameKey] = items;
      }
    }
  });

  return namedRanges;
}
