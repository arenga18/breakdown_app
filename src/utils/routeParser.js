/**
 * Parses a hash route string (e.g. "#/project/123/breakdown/stock") into structured page state.
 */
export function parseHashRoute(hash) {
  const path = hash.replace(/^#/, '');
  if (!path || path === '/') {
    return { page: 'modul' };
  }

  const parts = path.split('/').filter(Boolean);
  const page = parts[0];

  if (page === 'project') {
    const rawId = parts[1];
    let projectId = null;
    if (rawId) {
      projectId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : rawId;
    }
    const step = parts[2] || 'spek';
    const subTab = parts[3] || 'breakdown';
    return {
      page: 'project',
      projectId,
      step,
      subTab
    };
  }

  if (page === 'configuration') {
    const subPage = parts[1];
    return {
      page: subPage || 'category'
    };
  }

  return {
    page
  };
}

/**
 * Builds a hash route string from structured page state parameters.
 */
export function buildHashRoute({ page, projectId, step, subTab }) {
  if (page === 'project') {
    if (projectId) {
      if (step === 'breakdown') {
        return `#/project/${projectId}/breakdown/${subTab || 'breakdown'}`;
      }
      return `#/project/${projectId}/${step || 'spek'}`;
    }
    return `#/project`;
  }
  if (['category', 'stock', 'part', 'submodul', 'setup', 'masterModul'].includes(page)) {
    return `#/configuration/${page}`;
  }
  return `#/${page}`;
}
