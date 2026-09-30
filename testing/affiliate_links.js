/* ============================================================
   affiliate_links.js
   Loads affiliate product links from Supabase 'affiliate_materials' table.
   Source of truth: Supabase. No hardcoded fallback.

   Populates: affiliateLinksData = { aff_key: { id, name, url, tags, grit }, ... }
   Used by: estimate.js → getAffiliateLink(key); material-selection.js's
   getCandidateRows() (tags/grit added for its tag-driven selection --
   MEKP/ClothCalc/Awlgrip's own materials suggestions, reusing this same
   fetch rather than opening a second one against the same table).
   ============================================================ */

var affiliateLinksData = {};

(async function() {
  try {
    if (typeof _sb === 'undefined') throw new Error("Supabase client not loaded");

    var { data, error } = await _sb
      .from('affiliate_materials')
      .select('id, aff_key, name, url, tags, grit');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No affiliate materials returned from DB");

    data.forEach(function(row) {
      if (row.aff_key) {
        affiliateLinksData[row.aff_key] = {
          id:   row.id,
          name: row.name,
          url:  row.url,
          tags: row.tags || [],
          grit: row.grit
        };
      }
    });

    console.log("Affiliate links loaded from Supabase:", Object.keys(affiliateLinksData).length, "items");
    window.dispatchEvent(new CustomEvent('affiliateLinksReady', { detail: { count: Object.keys(affiliateLinksData).length } }));

  } catch (err) {
    console.error("Failed to load affiliate links from Supabase:", err.message);
    // No fallback — Supabase is the single source of truth.
    // affiliateLinksData remains empty; affiliate link buttons will be hidden.
  }
})();
