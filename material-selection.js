// material-selection.js
// Shared tag-driven materials-suggestion engine for MEKP, ClothCalc, and
// Awlgrip. Replaces each calculator's own hardcoded linksToShowKeys/Set
// construction with one selection function driven by affiliate_materials'
// live tags[] and grit columns, and renders the chosen keys as grouped
// sections via renderGroupedMaterialLinks() (no more per-calculator
// forEach -> li/a loop). Same plain-global convention as
// calc-tracker.js's logCalculation()/
// CC_UNITS (no IIFE wrapper -- calculators call these functions directly
// by name).
//
// Calculator math (ratios/quantities) is untouched by this file and by
// every page this dispatch edits -- affiliate-materials suggestion only.

function gritPhaseBucket(grit, isResinJob) {
  if (grit == null) return null;
  if (grit <= 180) return ['filling-and-fairing'];
  if (grit <= 400) {
    const buckets = ['prep-and-masking'];
    if (isResinJob && grit === 400) buckets.push('finishing');
    return buckets;
  }
  if (grit === 800) return isResinJob ? ['finishing'] : [];
  return ['finishing'];
}

// Rows tagged 'spray'/'tool' (spray-application hardware) or
// 'filling-and-fairing' (Awlgrip's own Awlfair line) share resin-identity
// tags (gel-coat/epoxy/polyester) with the catalog's actual base materials
// for an unrelated reason -- excluded from the identityTags match
// specifically so they don't leak onto MEKP/ClothCalc. Doesn't affect the
// 'universal' or bare-'resin' clauses (e.g. fumed silica/milled fibers/
// mica powder also carry 'filling-and-fairing' but still match correctly
// via the bare-'resin' clause below, untouched by this exclusion).
const NON_IDENTITY_CONTEXT_TAGS = ['spray', 'tool', 'filling-and-fairing'];

function isSelected(itemTags, job) {
  const isIdentityContext = !NON_IDENTITY_CONTEXT_TAGS.some(t => itemTags.includes(t));
  return itemTags.includes('universal')
      || (job.isResinJob && itemTags.includes('resin'))
      || (isIdentityContext && job.identityTags.some(t => itemTags.includes(t)));
}

// Grit/phase-based selection is for a future job type (kits.html /
// Estimator) that declares which phase it's currently in via job.phase.
// Per Leo's clarification (2026-09-29): MEKP/ClothCalc/Awlgrip are one-shot
// calculators that can never know what phase the user is in, so they never
// set job.phase, and this always returns false for them -- their grit-
// tagged rows (sanding discs/wet sandpaper) are correctly never suggested.
// gritPhaseBucket() itself stays fully implemented per spec, ready for that
// future caller to match its own job.phase against a row's bucket(s).
function isSelectedGritRow(row, job) {
  if (!job.phase) return false;
  const buckets = gritPhaseBucket(row.grit, job.isResinJob);
  return buckets && buckets.length > 0 && buckets.includes(job.phase);
}

function selectMaterialKeys(candidateRows, job) {
  const keys = new Set();
  candidateRows.forEach(row => {
    if (isSelected(row.tags, job) || isSelectedGritRow(row, job)) {
      keys.add(row.aff_key);
    }
  });
  // job.keys / job.cleanupKeys: plain hardcoded aff_key arrays, same
  // mechanism as job.respiratorKey below -- not tag-driven. MEKP/ClothCalc
  // use these (with identityTags:[] and isResinJob:false) instead of the
  // tag-sweep above, which still only contributes universal-tagged rows
  // for them. Awlgrip (untouched identityTags/isResinJob) adds cleanupKeys
  // on top of its own existing universal-tag sweep.
  if (job.keys) job.keys.forEach(k => keys.add(k));
  if (job.cleanupKeys) job.cleanupKeys.forEach(k => keys.add(k));
  if (job.respiratorKey) keys.add(job.respiratorKey);
  return keys;
}

// ── Phase-bucket grouping for the materials display (2026-10 build) ──
// Groups an already-selected key list into "Your Materials" (role:'base'
// items -- the actual computed paint/resin/catalyst, never bucketed by
// tag even if they also carry a bucket tag for unrelated reasons, e.g.
// Awlgrip's base items carry spray/roll tags from kits.html filtering)
// plus phase-bucket sections, each populated by matching role:'suggestion'
// items against their real affiliate_materials.tags. A suggestion item
// matching none of the 6 buckets (or matching only a bucket this
// calculator excludes via allowedBucketLabels) falls into
// MATERIALS_FALLBACK_LABEL instead of being silently dropped -- found
// during this build that several resin/hardener/cloth suggestion links
// carry only chemistry-identity tags (polyester/vinylester/epoxy/
// fiberglass) with no process-phase tag at all; Leo's call (2026-10-01)
// was a catch-all section over letting them disappear or stretching
// what role:'base' means.
const MATERIAL_BUCKETS = [
  { label: 'PPE', tags: ['ppe'] },
  { label: 'Prep & Masking', tags: ['prep', 'clean-and-prep', 'masking', 'sanding'] },
  { label: 'Filling & Fairing', tags: ['filling-and-fairing'] },
  { label: 'Mixing', tags: ['mixing'] },
  { label: 'Application', tags: ['spray', 'roll', 'brush'] },
  { label: 'Finishing', tags: ['buff-and-polish', 'sealant'] }
];
const MATERIALS_FALLBACK_LABEL = 'Materials & Supplies';
const APPLICATION_TAGS = ['spray', 'roll', 'brush'];

// Dual-tag tie-break: an item carrying both a Mixing tag and an
// Application tag renders in Application only (general rule, not a
// hardcoded special case -- holds for any future item with this
// combination, not just today's paint_strainers_*/toilet_paper_filter_kit).
function bucketLabelForTags(tags) {
  const hasApplicationTag = APPLICATION_TAGS.some(t => tags.includes(t));
  for (const bucket of MATERIAL_BUCKETS) {
    if (bucket.label === 'Mixing' && hasApplicationTag) continue;
    if (bucket.tags.some(t => tags.includes(t))) return bucket.label;
  }
  return MATERIALS_FALLBACK_LABEL;
}

// Renders `keys` (the Set/array already returned by selectMaterialKeys)
// into listEl, grouped under section headings in a fixed order: "Your
// Materials", then whichever of the 6 phase buckets this calculator
// allows (in MATERIAL_BUCKETS order), then the fallback section. A
// section with zero items is not rendered at all. Replaces each
// calculator's own flat forEach->li/a loop -- same rendering, now
// shared once instead of copied 3 times, same reasoning as the
// selection logic above.
function renderGroupedMaterialLinks(listEl, keys, baseKeys, allowedBucketLabels) {
  listEl.innerHTML = '';
  const baseKeySet = new Set(baseKeys);
  const sectionOrder = ['Your Materials']
    .concat(MATERIAL_BUCKETS.filter(function (b) { return allowedBucketLabels.indexOf(b.label) !== -1; }).map(function (b) { return b.label; }))
    .concat([MATERIALS_FALLBACK_LABEL]);
  const sections = {};
  sectionOrder.forEach(function (label) { sections[label] = []; });

  keys.forEach(function (key) {
    if (baseKeySet.has(key)) {
      sections['Your Materials'].push(key);
      return;
    }
    const row = (typeof affiliateLinksData !== 'undefined') ? affiliateLinksData[key] : null;
    const tags = (row && row.tags) || [];
    const label = bucketLabelForTags(tags);
    const target = (allowedBucketLabels.indexOf(label) !== -1) ? label : MATERIALS_FALLBACK_LABEL;
    sections[target].push(key);
  });

  let hasDisplayedLinks = false;
  sectionOrder.forEach(function (label) {
    const sectionKeys = sections[label];
    if (!sectionKeys || sectionKeys.length === 0) return;
    const heading = document.createElement('li');
    heading.className = 'mp-affiliate-section-heading';
    heading.textContent = label;
    listEl.appendChild(heading);
    sectionKeys.forEach(function (key) {
      const linkData = affiliateLinksData[key];
      if (!linkData || !linkData.url || !linkData.name) {
        console.warn('Attempted to render link for key but not found in affiliateLinksData: ' + key);
        return;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = linkData.url;
      a.textContent = linkData.name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer sponsored';
      li.appendChild(a);
      listEl.appendChild(li);
      hasDisplayedLinks = true;
    });
  });
  return hasDisplayedLinks;
}

// candidateRows source: affiliateLinksData (affiliate_links.js's existing
// live Supabase fetch against affiliate_materials, extended to also
// select tags/grit alongside id/name/url -- the exact same already-
// in-flight fetch every one of these 3 pages already has, not a second
// one). A row not yet in affiliateLinksData just isn't a candidate yet;
// callers already re-run their selection after the existing
// 'affiliateLinksReady' event, same as every other affiliate-link
// render on these pages.
function getCandidateRows() {
  if (typeof affiliateLinksData === 'undefined') return [];
  return Object.keys(affiliateLinksData).map(function (key) {
    var row = affiliateLinksData[key];
    return {
      aff_key: key,
      tags: row.tags || [],
      grit: (row.grit === undefined) ? null : row.grit
    };
  });
}
