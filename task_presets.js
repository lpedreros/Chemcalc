/* ============================================================
   task_presets.js — ChemCalc Shared Task Presets
   ============================================================
   Edit this file to add, remove, or modify the preset task
   templates shown in the Task Starter modal.

   Each preset object has:
     name        {string}   — Display name for the task card
     category    {string}   — Groups cards in the modal (e.g. "Paint", "Fiberglass")
     icon        {string}   — Emoji shown on the card
     description {string}   — One-line description shown under the card title
     scopeSteps  {string[]} — Steps appended to the scope of work textarea
     taskRows    {object[]} — Default labor rows: [{ name, hours }]
                              hours are suggestions only — contractor edits freely

   To add a new preset, copy an existing block and paste it into
   the TASK_PRESETS array below. The modal will pick it up automatically.
   ============================================================ */

var TASK_PRESETS = [

  /* -- Gelcoat & Paint -------------------------------------- */
  {
    name:        'Gelcoat Repair',
    category:    'Gelcoat & Paint',
    icon:        '🔧',
    description: 'Grind, fill, shoot gelcoat, wet sand & buff',
    scopeSteps: [
      'Prep and mask surrounding area',
      'Grind damaged gelcoat to clean substrate',
      'Fill and shape with fairing compound',
      'Apply matched gelcoat',
      'Wet sand and buff to blend with surrounding surface',
      'Final cleanup and inspection'
    ],
    taskRows: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask',          hours: 0.5 },
      { name: 'Grind',         hours: 1.0 },
      { name: 'Fill & Shape',  hours: 1.5 },
      { name: 'Shoot Gelcoat', hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 1.5 },
      { name: 'Cleanup',       hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  },

  {
    name:        'Full Paint Job',
    category:    'Gelcoat & Paint',
    icon:        '🎨',
    description: 'Sand, prime, spray topcoat, wet sand & buff',
    scopeSteps: [
      'Wash and degrease entire surface',
      'Sand to scuff and remove oxidation',
      'Apply fairing compound where needed',
      'Apply primer coats',
      'Spray topcoat (2–3 coats)',
      'Wet sand and buff to high gloss',
      'Final cleanup and inspection'
    ],
    taskRows: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask',          hours: 1.0 },
      { name: 'Grind / Sand',  hours: 2.0 },
      { name: 'Fill & Shape',  hours: 1.0 },
      { name: 'Match',         hours: 0.5 },
      { name: 'Shoot Paint',   hours: 2.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup',       hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  },

  {
    name:        'Bottom Paint',
    category:    'Gelcoat & Paint',
    icon:        '⚓',
    description: 'Haul, sand, apply antifouling bottom paint',
    scopeSteps: [
      'Haul and pressure wash hull',
      'Sand existing bottom paint',
      'Mask waterline and running gear',
      'Apply antifouling bottom paint (2 coats)',
      'Touch up waterline as needed',
      'Launch and inspect'
    ],
    taskRows: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Pressure Wash', hours: 0.5 },
      { name: 'Sand Bottom',   hours: 2.0 },
      { name: 'Mask',          hours: 0.5 },
      { name: 'Apply Paint',   hours: 1.5 },
      { name: 'Cleanup',       hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  },

  {
    name:        'Buff & Polish',
    category:    'Gelcoat & Paint',
    icon:        '✨',
    description: 'Compound, polish, and wax oxidized gelcoat',
    scopeSteps: [
      'Wash and degrease surface',
      'Compound with cutting compound to remove oxidation',
      'Polish to restore gloss',
      'Apply wax or sealant for protection',
      'Final wipe-down and inspection'
    ],
    taskRows: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Wash',          hours: 0.5 },
      { name: 'Compound',      hours: 2.0 },
      { name: 'Polish',        hours: 1.5 },
      { name: 'Wax / Seal',    hours: 1.0 },
      { name: 'Cleanup',       hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  },

  /* -- Fiberglass & Structural ------------------------------ */
  {
    name:        'Fiberglass Repair',
    category:    'Fiberglass & Structural',
    icon:        '🛠️',
    description: 'Grind, glass, fill, match gelcoat',
    scopeSteps: [
      'Assess and mark damaged area',
      'Grind back to clean laminate',
      'Cut and fit fiberglass cloth',
      'Wet out and laminate cloth layers',
      'Fair and shape with filler',
      'Apply matched gelcoat',
      'Wet sand and buff to blend',
      'Final cleanup and inspection'
    ],
    taskRows: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask',          hours: 0.5 },
      { name: 'Grind',         hours: 1.5 },
      { name: 'Cut Cloth',     hours: 0.5 },
      { name: 'Glass',         hours: 2.0 },
      { name: 'Fill & Shape',  hours: 2.0 },
      { name: 'Match',         hours: 1.0 },
      { name: 'Shoot Gelcoat', hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup',       hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  },

  {
    name:        'Structural Repair',
    category:    'Fiberglass & Structural',
    icon:        '🏗️',
    description: 'Demo, glass, rebuild structural laminate',
    scopeSteps: [
      'Assess structural damage and develop repair plan',
      'Remove damaged materials and hardware as needed',
      'Grind laminate to sound substrate',
      'Cut and fit structural cloth (biaxial / woven roving)',
      'Laminate structural layers per schedule',
      'Install core material if required',
      'Fair and finish surface',
      'Reinstall hardware and fittings',
      'Final inspection and sea trial if applicable'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Demo / Removal', hours: 2.0 },
      { name: 'Grind',          hours: 2.0 },
      { name: 'Cut Cloth',      hours: 1.0 },
      { name: 'Glass',          hours: 3.0 },
      { name: 'Fill & Shape',   hours: 2.0 },
      { name: 'Cleanup',        hours: 1.0 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Transom Repair',
    category:    'Fiberglass & Structural',
    icon:        '⛵',
    description: 'Remove, replace, and glass transom core',
    scopeSteps: [
      'Remove outboard, hardware, and fittings from transom',
      'Cut out and remove rotted transom core',
      'Dry and prep cavity',
      'Cut and fit new transom core (marine plywood or composite)',
      'Bed core with structural adhesive',
      'Glass interior and exterior skins',
      'Fair and finish exterior surface',
      'Reinstall hardware with proper bedding compound',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',    hours: 0.5 },
      { name: 'Remove Hardware',  hours: 1.5 },
      { name: 'Demo Core',        hours: 3.0 },
      { name: 'Fit New Core',     hours: 2.0 },
      { name: 'Glass Skins',      hours: 3.0 },
      { name: 'Fair & Finish',    hours: 2.0 },
      { name: 'Reinstall Hardware', hours: 1.5 },
      { name: 'Cleanup',          hours: 0.5 },
      { name: 'Driving',          hours: 0.5 }
    ]
  },

  /* -- Mechanical & Systems ---------------------------------- */
  {
    name:        'Engine Service',
    category:    'Mechanical & Systems',
    icon:        '⚙️',
    description: 'Oil, filters, impeller, zincs, belts',
    scopeSteps: [
      'Change engine oil and filter',
      'Replace fuel filter(s)',
      'Replace raw water impeller',
      'Inspect and replace zincs as needed',
      'Check and adjust belts and hoses',
      'Check fluid levels (coolant, transmission)',
      'Run engine and check for leaks',
      'Sea trial if applicable'
    ],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Oil & Filter',    hours: 0.5 },
      { name: 'Fuel Filter',     hours: 0.5 },
      { name: 'Impeller',        hours: 1.0 },
      { name: 'Zincs',           hours: 0.5 },
      { name: 'Belts & Hoses',   hours: 0.5 },
      { name: 'Run & Inspect',   hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Electrical Repair',
    category:    'Mechanical & Systems',
    icon:        '⚡',
    description: 'Diagnose and repair electrical fault or install',
    scopeSteps: [
      'Diagnose electrical fault or scope installation',
      'Pull and inspect existing wiring',
      'Run new wiring or repair as needed',
      'Connect and label circuits',
      'Test all affected systems',
      'Final inspection and documentation'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Diagnose',       hours: 1.0 },
      { name: 'Pull Wire',      hours: 1.5 },
      { name: 'Connect & Label', hours: 1.0 },
      { name: 'Test',           hours: 0.5 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  /* -- Hardware & Deck -------------------------------------- */
  {
    name:        'Hardware Install / Rebedding',
    category:    'Hardware & Deck',
    icon:        '🔩',
    description: 'Remove, rebed, and reinstall deck hardware',
    scopeSteps: [
      'Remove existing hardware',
      'Clean and inspect fastener holes',
      'Fill and re-drill holes if needed',
      'Apply appropriate bedding compound',
      'Reinstall hardware and torque fasteners',
      'Inspect for watertight seal',
      'Final cleanup'
    ],
    taskRows: [
      { name: 'Getting Ready',    hours: 0.5 },
      { name: 'Remove Hardware',  hours: 1.0 },
      { name: 'Prep & Fill',      hours: 0.5 },
      { name: 'Bed & Reinstall',  hours: 1.0 },
      { name: 'Inspect & Test',   hours: 0.5 },
      { name: 'Cleanup',          hours: 0.5 },
      { name: 'Driving',          hours: 0.5 }
    ]
  },

  {
    name:        'Teak Deck Repair',
    category:    'Hardware & Deck',
    icon:        '🪵',
    description: 'Remove, reglue, or replace teak deck sections',
    scopeSteps: [
      'Assess teak condition and identify repair sections',
      'Remove damaged teak planks and caulk',
      'Clean and prep fiberglass substrate',
      'Fit and glue new teak planks',
      'Re-caulk seams with marine deck caulk',
      'Sand flush and apply teak oil or sealer',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Remove Teak',     hours: 2.0 },
      { name: 'Prep Substrate',  hours: 1.0 },
      { name: 'Fit & Glue',      hours: 2.0 },
      { name: 'Caulk Seams',     hours: 1.5 },
      { name: 'Sand & Seal',     hours: 1.0 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  /* -- Cosmetic ---------------------------------------------- */
  {
    name:        'Vinyl Wrap / Graphics',
    category:    'Cosmetic',
    icon:        '🖼️',
    description: 'Remove old graphics, apply new vinyl wrap or decals',
    scopeSteps: [
      'Remove existing graphics or vinyl',
      'Clean and degrease surface',
      'Measure and cut new vinyl',
      'Apply vinyl and squeegee out air bubbles',
      'Trim edges and heat-set curves',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Remove Old',     hours: 1.0 },
      { name: 'Clean Surface',  hours: 0.5 },
      { name: 'Cut & Apply',    hours: 2.0 },
      { name: 'Trim & Set',     hours: 1.0 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Interior Detailing',
    category:    'Cosmetic',
    icon:        '🧽',
    description: 'Deep clean, shampoo, and detail interior',
    scopeSteps: [
      'Remove cushions and loose items',
      'Vacuum all surfaces',
      'Shampoo upholstery and carpet',
      'Clean and condition vinyl surfaces',
      'Clean all hard surfaces, cup holders, and storage',
      'Clean windows and hatches',
      'Reinstall cushions and items',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Vacuum',         hours: 0.5 },
      { name: 'Shampoo',        hours: 1.5 },
      { name: 'Wipe Down',      hours: 1.0 },
      { name: 'Windows',        hours: 0.5 },
      { name: 'Reassemble',     hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  }

];
