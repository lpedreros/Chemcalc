/* ============================================================
   affiliate_links.js
   Loads affiliate product links from Supabase 'affiliate_materials' table.
   Source of truth: Supabase. No hardcoded fallback.

   Populates: affiliateLinksData = { aff_key: { id, name, url }, ... }
   Used by: estimate.js → getAffiliateLink(key)
   ============================================================ */

var affiliateLinksData = {};

(async function() {
  try {
    if (typeof _sb === 'undefined') throw new Error("Supabase client not loaded");

    var { data, error } = await _sb
      .from('affiliate_materials')
      .select('id, aff_key, name, url');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No affiliate materials returned from DB");

    data.forEach(function(row) {
      if (row.aff_key) {
        affiliateLinksData[row.aff_key] = {
          id:   row.id,
          name: row.name,
          url:  row.url
        };
      }
    });

    console.log("Affiliate links loaded from Supabase:", Object.keys(affiliateLinksData).length, "items");

  } catch (err) {
    console.error("Failed to load affiliate links from Supabase:", err.message);
    // No fallback — Supabase is the single source of truth.
    // affiliateLinksData remains empty; affiliate link buttons will be hidden.
  }
})();
