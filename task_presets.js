/* ============================================================
   task_presets.js - ChemCalc Shared Task Presets
   Now fetches dynamically from Supabase 'task_presets' table.
   Falls back to hardcoded array if DB fetch fails.
   ============================================================ */

var TASK_PRESETS = []; // Will be populated from DB or fallback

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

  } catch (err) {
    console.warn("Failed to load task presets from Supabase, using fallback array:", err);
    loadFallbackPresets();
  }
})();

function loadFallbackPresets() {
  TASK_PRESETS = [
    /* ---------------------------------------------------------- */
    /* GELCOAT & PAINT                                            */
    /* ---------------------------------------------------------- */
    {
      name:        'Gelcoat Repair',
      category:    'Gelcoat & Paint',
      icon:        '\uD83D\uDD27',
      description: 'Grind, fill, shoot gelcoat, wet sand & buff',
      scopeSteps: [
        'Mask and protect surrounding area',
        'Grind damaged gelcoat to clean substrate',
        'Fill and shape with fairing compound',
        'Sand smooth and fair surface',
        'Clean and degrease repair area',
        'Mix gelcoat with Duratec additive (if using)',
        'Shoot matched gelcoat',
        'Once tacky, apply PVA (if not using Duratec)',
        'After cure, wipe off PVA',
        'Wet sand 400 - 800 - 1500 grit',
        'Buff and polish to blend',
        'Final cleanup and inspection'
      ],
      materialRows: [
        { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
        { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
        { name: '320-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '320_grit_xtract_sanding_disc_5_inch_50box' },
        { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
        { name: 'White Gelcoat (quart kit with MEKP)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'white_gel_coat_1quart_kit_with_wax_and_mekp' },
        { name: 'Duratec Additive',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'duratec_resin_and_gel_coat_additive_for_tackfree_curingmy_favorite' },
        { name: 'PVA',                                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'pva' },
        { name: 'Preval Sprayer',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'preval' },
        { name: 'Wet Sanding Paper Assorted 400/800/1500',   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'wet_sanding_paper_assorted_1000_1500_2000_2500' },
        { name: '3M Perfect-It Rubbing Compound',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_perfectit_rubbing_compound' },
        { name: 'Polishing Pads 5-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'polishing_pads_5inch' },
        { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
        { name: 'Masking Paper 12-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_paper_12inch' },
        { name: 'Masking Plastic 35-inch',                   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_plastic_35_inch' },
        { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
        { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
        { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
        { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' }
      ],
      paintRows: [],
      taskRows: [
        { name: 'Getting Ready',   hours: 0.5 },
        { name: 'Mask',            hours: 0.5 },
        { name: 'Grind',           hours: 1.0 },
        { name: 'Fill & Shape',    hours: 1.5 },
        { name: 'Shoot Gelcoat',   hours: 1.0 },
        { name: 'Wet Sand & Buff', hours: 1.5 },
        { name: 'Cleanup',         hours: 0.5 },
        { name: 'Driving',         hours: 0.5 }
      ]
    },
    {
      name:        'Spider Cracks',
      category:    'Gelcoat & Paint',
      icon:        '\uD83D\uDD78',
      description: 'V-groove, glass or fiber filler, gelcoat, buff',
      scopeSteps: [
        'Mask and protect surrounding area',
        'V-groove all cracks with Dremel or die grinder',
        'Clean and degrease grooves',
        'Fill with structural filler (fiber-reinforced)',
        'Sand flush and fair',
        'Shoot matched gelcoat',
        'Wet sand 400 - 800 - 1500 grit',
        'Buff and polish to blend',
        'Final cleanup and inspection'
      ],
      materialRows: [
        { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
        { name: 'Dremel Carbide Bits',                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dremel_carbide_bits' },
        { name: '3M High Strength Repair Filler',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_high_strength_repair_filler' },
        { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
        { name: '320-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '320_grit_xtract_sanding_disc_5_inch_50box' },
        { name: 'White Gelcoat (quart kit with MEKP)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'white_gel_coat_1quart_kit_with_wax_and_mekp' },
        { name: 'Duratec Additive',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'duratec_resin_and_gel_coat_additive_for_tackfree_curingmy_favorite' },
        { name: 'Preval Sprayer',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'preval' },
        { name: 'Wet Sanding Paper Assorted 400/800/1500',   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'wet_sanding_paper_assorted_1000_1500_2000_2500' },
        { name: '3M Perfect-It Rubbing Compound',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_perfectit_rubbing_compound' },
        { name: 'Polishing Pads 5-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'polishing_pads_5inch' },
        { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
        { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
        { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
        { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
        { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' }
      ],
      paintRows: [],
      taskRows: [
        { name: 'Getting Ready',   hours: 0.5 },
        { name: 'V-Groove',        hours: 1.0 },
        { name: 'Fill & Fair',     hours: 1.5 },
        { name: 'Shoot Gelcoat',   hours: 1.0 },
        { name: 'Wet Sand & Buff', hours: 1.5 },
        { name: 'Cleanup',         hours: 0.5 },
        { name: 'Driving',         hours: 0.5 }
      ]
    },
    {
      name:        'Paint Repair',
      category:    'Gelcoat & Paint',
      icon:        '\uD83C\uDFA8',
      description: 'Prep, prime, and blend Awlgrip / topcoat',
      scopeSteps: [
        'Mask and protect surrounding area',
        'Sand damaged area to feather edges (320 grit)',
        'Clean and wipe with Awlprep',
        'Apply 545 Epoxy Primer',
        'Sand primer smooth (400 grit)',
        'Clean and wipe with Awlprep',
        'Mix topcoat (Awlgrip/Awlcraft) with converter and reducer',
        'Spray or roll/tip topcoat',
        'Allow to cure',
        'Final cleanup and inspection'
      ],
      materialRows: [
        { name: 'Awlprep Surface Cleaner (quart)',           cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'awlgrip_awlprep_surface_cleaner_t0008_quart' },
        { name: '320-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '320_grit_xtract_sanding_disc_5_inch_50box' },
        { name: '400-grit Sanding Disc 5-inch (200-box)',    cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '400_grit_sanding_disc_5inch_200box' },
        { name: 'Tack Cloth',                                cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'tack_cloth' },
        { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
        { name: 'Masking Paper 12-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_paper_12inch' },
        { name: 'Masking Plastic 35-inch',                   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_plastic_35_inch' },
        { name: 'Preval Sprayer',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'preval' },
        { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
        { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
        { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' }
      ],
      paintRows: [
        { name: '545 Epoxy Primer (gallon kit)',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'awlgrip_545_epoxy_primer_white_1_gallon_kit' },
        { name: 'Topcoat Base (job specific)',               cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
        { name: 'Topcoat Converter (job specific)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
        { name: 'Topcoat Reducer (job specific)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null }
      ],
      taskRows: [
        { name: 'Getting Ready',   hours: 0.5 },
        { name: 'Mask',            hours: 0.5 },
        { name: 'Prep & Sand',     hours: 1.0 },
        { name: 'Prime',           hours: 1.0 },
        { name: 'Sand Primer',     hours: 0.5 },
        { name: 'Topcoat',         hours: 1.5 },
        { name: 'Cleanup',         hours: 0.5 },
        { name: 'Driving',         hours: 0.5 }
      ]
    },
    {
      name:        'Bottom Paint',
      category:    'Gelcoat & Paint',
      icon:        '\u26F4',
      description: 'Prep, tape waterline, and roll bottom paint',
      scopeSteps: [
        'Tape waterline',
        'Scrape loose paint and barnacles',
        'Sand entire bottom (80 grit) to profile',
        'Wipe down hull to remove dust',
        'Stir bottom paint thoroughly',
        'Roll first coat of bottom paint',
        'Allow to dry per manufacturer specs',
        'Roll second coat (if specified)',
        'Pull tape while paint is still wet/tacky',
        'Move stands and paint pads (if on hard)',
        'Final cleanup'
      ],
      materialRows: [
        { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
        { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
        { name: 'Paint Roller Covers 3/8-nap',               cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'paint_roller_covers_38_nap' },
        { name: 'Paint Roller Frame',                        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'paint_roller_frame' },
        { name: 'Paint Tray & Liners',                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'paint_tray_and_liners' },
        { name: 'Chip Brushes 2-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_2inch_24pack' },
        { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
        { name: 'Tyvek Suit',                                cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'tyvek_suit' },
        { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' }
      ],
      paintRows: [
        { name: 'Bottom Paint (gallon)',                     cost: 0, qty: 2, markup: 40, source: 'amz', affKey: 'interlux_micron_csc_bottom_paint_gallon' }
      ],
      taskRows: [
        { name: 'Getting Ready',   hours: 0.5 },
        { name: 'Tape Waterline',  hours: 1.0 },
        { name: 'Prep & Sand',     hours: 3.0 },
        { name: 'Roll Paint',      hours: 2.5 },
        { name: 'Move Stands',     hours: 1.0 },
        { name: 'Cleanup',         hours: 0.5 },
        { name: 'Driving',         hours: 0.5 }
      ]
    }
  ];
}
