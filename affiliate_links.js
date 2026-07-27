/* ============================================================
   affiliate_links.js
   Loads affiliate product links from Supabase 'affiliate_materials' table.
   Falls back to hardcoded object if DB fetch fails.
   
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
    console.warn("Failed to load affiliate links from Supabase, using fallback:", err.message);
    loadFallbackAffiliateLinks();
  }
})();

function loadFallbackAffiliateLinks() {
  affiliateLinksData = {
    "latex_gloves": { "name": "Latex Gloves", "url": "https://amzn.to/41GczFM" },
    "dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_25pack": { "name": "DuPont Tyvek 400 TY122S Disposable Protective Coverall Hood and Boots, 25-pack", "url": "https://amzn.to/4igVjxJ" },
    "dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack": { "name": "DuPont Tyvek 400 TY122S Disposable Protective Coverall Hood and Boots, 1-pack", "url": "https://amzn.to/4kVO3ZO" },
    "head_socks": { "name": "Head socks", "url": "https://amzn.to/41p1b0I" },
    "3m_full_face_respirator_medium_model_6800_filter_kit_linked_below": { "name": "3M full face respirator (Medium, Model 6800. Filter kit linked below)", "url": "https://amzn.to/3DwLixu" },
    "3m_full_face_respirator_large_model_6800_filter_kit_linked_below": { "name": "3M full face respirator (Large, Model 6800. Filter kit linked below)", "url": "https://amzn.to/4iQOkeF" },
    "3m_full_face_respirator_medium_model_ultimate_fx_ff402_filter_kit_linked_below": { "name": "3M full face respirator (Medium, Model Ultimate FX FF-402. Filter kit linked below)", "url": "https://amzn.to/4hfIToB" },
    "3m_full_face_respirator_large_model_ultimate_fx_ff402_filter_kit_linked_below": { "name": "3M full face respirator (Large, Model Ultimate FX FF-402. Filter kit linked below)", "url": "https://amzn.to/4hfIToB" }
  };
}
