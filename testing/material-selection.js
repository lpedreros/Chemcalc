// material-selection.js
// Shared tag-driven materials-suggestion engine for MEKP, ClothCalc, and
// Awlgrip. Replaces each calculator's own hardcoded linksToShowKeys/Set
// construction with one selection function driven by affiliate_materials'
// live tags[] and grit columns. Rendering (the forEach -> li/a loop) is
// untouched on every page -- this file only decides WHICH keys to show,
// same plain-global convention as calc-tracker.js's logCalculation()/
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
