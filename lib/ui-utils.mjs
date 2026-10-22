/** Local-storage input is untrusted; malformed entries must not break the drawer. */
export function parseSavedResearch(raw, routes) {
  try {
    const items = JSON.parse(raw || '[]');
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter(item => {
      if (!item || typeof item !== 'object' || typeof item.question !== 'string' ||
          !item.question.trim() || item.question.length > 200 || typeof item.intent !== 'string' ||
          !Object.hasOwn(routes, item.intent) || typeof item.time !== 'string' ||
          !Number.isFinite(Date.parse(item.time)) || seen.has(item.question)) return false;
      seen.add(item.question); return true;
    }).slice(0,20).map(({question,intent,time}) => ({question,intent,time}));
  } catch { return []; }
}

export function profitBridgeRows(rawValues) {
  return ['2026-06-30','2025-06-30'].map(period => {
    const row = rawValues[period];
    const parent = Number(row.parent_holder_net_profit);
    const deducted = Number(row.deducted_parent_net_profit);
    if (![parent,deducted].every(Number.isSafeInteger)) throw new Error('Invalid normalized financial amount');
    return {period,label:period.slice(0,4)+'H1',parent,deducted,nonrecurring:parent-deducted};
  });
}

export const formatYi = value => (value / 100000000).toFixed(2);
