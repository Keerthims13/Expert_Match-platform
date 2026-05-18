// Lightweight Levenshtein distance and fuzzy match helpers
function levenshtein(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

// normalized ratio similarity (0..1) based on distance
function similarity(a, b) {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist / maxLen;
}

// trigram utilities for token similarity
function trigrams(s) {
  const str = `  ${String(s || '')}  `.toLowerCase();
  const grams = new Set();
  for (let i = 0; i < str.length - 2; i++) grams.add(str.slice(i, i + 3));
  return grams;
}

function trigramSimilarity(a, b) {
  if (!a || !b) return 0;
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  A.forEach((g) => { if (B.has(g)) inter++; });
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

// Find best matches among candidates for a given token list.
// Returns array of candidate strings with similarity >= threshold
function findFuzzyMatches(tokens, candidates, { threshold = 0.7, maxResults = 6 } = {}) {
  const results = new Map();
  const candNorm = candidates.map((c) => String(c || '').trim().toLowerCase());

  for (const token of tokens) {
    const t = String(token || '').trim().toLowerCase();
    if (!t) continue;

    // adapt threshold for very short tokens where relative similarity is unstable
    const adaptiveThreshold = t.length <= 2 ? Math.min(0.6, threshold) : t.length === 3 ? Math.min(0.65, threshold) : threshold;

    for (let i = 0; i < candNorm.length; i++) {
      const cand = candNorm[i];

      // similarity with full candidate + trigram
      const sim = similarity(t, cand);
      const tri = trigramSimilarity(t, cand);
      const combined = t.length <= 3 ? Math.max(sim, tri) : 0.6 * sim + 0.4 * tri;
      // absolute distance allowance for very short tokens
      const dist = levenshtein(t, cand);
      const acceptByDist = t.length <= 3 && dist <= 2;

      if (combined >= adaptiveThreshold || acceptByDist) {
        const prev = results.get(cand) || 0;
        results.set(cand, Math.max(prev, combined));
        continue;
      }

      // compare token to individual words in candidate
      const parts = cand.split(/[^a-z0-9]+/).filter(Boolean);
      for (const p of parts) {
        const s2 = similarity(t, p);
        const tri2 = trigramSimilarity(t, p);
        const combined2 = t.length <= 3 ? Math.max(s2, tri2) : 0.6 * s2 + 0.4 * tri2;
        const d2 = levenshtein(t, p);
        const accept2 = combined2 >= adaptiveThreshold || (t.length <= 3 && d2 <= 2);
        if (accept2) {
          const prev = results.get(cand) || 0;
          results.set(cand, Math.max(prev, combined2));
        }
      }
    }
  }

  // Sort by similarity desc
  return [...results.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([cand]) => cand);
}

export default {
  levenshtein,
  similarity,
  findFuzzyMatches
};
