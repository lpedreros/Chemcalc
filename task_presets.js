/* ============================================================
   task_presets.js - ChemCalc Shared Task Presets
   Fetches from Supabase 'task_presets' table.
   Source of truth: Supabase. No hardcoded fallback.
   ============================================================ */

var TASK_PRESETS = [];

(async function() {
  try {
    if (typeof _sb === 'undefined') throw new Error("Supabase client not loaded");

    const { data, error } = await _sb
      .from('task_presets')
      .select('name, category, icon, description, scope_steps, material_rows, paint_rows, task_rows')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No presets returned from DB");

    // Map DB snake_case to JS camelCase expected by estimate.js
    TASK_PRESETS = data.map(function(row) {
      return {
        name:         row.name,
        category:     row.category,
        icon:         row.icon,
        description:  row.description,
        scopeSteps:   row.scope_steps || [],
        materialRows: row.material_rows || [],
        paintRows:    row.paint_rows || [],
        taskRows:     row.task_rows || []
      };
    });

    console.log("Task presets loaded from Supabase:", TASK_PRESETS.length, "presets");

  } catch (err) {
    console.error("Failed to load task presets from Supabase:", err.message);
    // No fallback — Supabase is the single source of truth.
    // TASK_PRESETS remains empty; the UI should handle this gracefully.
  }
})();
