/* ============================================================
   task_presets.js - ChemCalc Shared Task Presets
   ============================================================
   Edit this file to add, remove, or modify the preset task
   templates shown in the Task Starter modal.

   Each preset object has:
     name        {string}   - Display name for the task card
     category    {string}   - Groups cards in the modal (e.g. "Paint", "Fiberglass")
     icon        {string}   - Icon shown on the card (JS Unicode escape - do NOT use raw emoji)
     description {string}   - One-line description shown under the card title
     scopeSteps  {string[]} - Steps appended to the scope of work textarea (plain text only)
     taskRows    {object[]} - Default labor rows: [{ name, hours }]
                              hours are suggestions only - contractor edits freely

   To add a new preset, copy an existing block and paste it into
   the TASK_PRESETS array below. The modal will pick it up automatically.
   ============================================================ */

var TASK_PRESETS = [

  /* -- Gelcoat & Paint -------------------------------------- */
  {
    name:        'Gelcoat Repair',
    category:    'Gelcoat & Paint',
    icon:        '\uD83D\uDD27',
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
    description: 'V-groove stress cracks, fill, gelcoat, buff',
    scopeSteps: [
      'Identify and mark all spider crack areas',
      'V-groove each crack with a rotary tool',
      'Clean and degrease grooves',
      'Fill with gelcoat paste or fairing compound',
      'Sand flush when cured',
      'Apply matched gelcoat',
      'Wet sand and buff to blend',
      'Final cleanup and inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Mask',            hours: 0.5 },
      { name: 'V-Groove',        hours: 1.0 },
      { name: 'Fill',            hours: 1.0 },
      { name: 'Shoot Gelcoat',   hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 1.5 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Full Paint Job',
    category:    'Gelcoat & Paint',
    icon:        '\uD83C\uDFA8',
    description: 'Sand, prime, spray topcoat, wet sand & buff',
    scopeSteps: [
      'Wash and degrease entire surface',
      'Sand to scuff and remove oxidation',
      'Apply fairing compound where needed',
      'Apply primer coats',
      'Spray topcoat (2-3 coats)',
      'Wet sand and buff to high gloss',
      'Final cleanup and inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Mask',            hours: 1.0 },
      { name: 'Grind / Sand',    hours: 2.0 },
      { name: 'Fill & Shape',    hours: 1.0 },
      { name: 'Match',           hours: 0.5 },
      { name: 'Shoot Paint',     hours: 2.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Bottom Paint',
    category:    'Gelcoat & Paint',
    icon:        '\u2693',
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
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Pressure Wash',  hours: 0.5 },
      { name: 'Sand Bottom',    hours: 2.0 },
      { name: 'Mask',           hours: 0.5 },
      { name: 'Apply Paint',    hours: 1.5 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Buff & Polish',
    category:    'Gelcoat & Paint',
    icon:        '\u2728',
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
    icon:        '\uD83D\uDEE0',
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
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Mask',            hours: 0.5 },
      { name: 'Grind',           hours: 1.5 },
      { name: 'Cut Cloth',       hours: 0.5 },
      { name: 'Glass',           hours: 2.0 },
      { name: 'Fill & Shape',    hours: 2.0 },
      { name: 'Match',           hours: 1.0 },
      { name: 'Shoot Gelcoat',   hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Keel Repair',
    category:    'Fiberglass & Structural',
    icon:        '\u2693',
    description: 'Grind, rebuild, barrier coat keel',
    scopeSteps: [
      'Haul and inspect keel condition',
      'Grind damaged areas to sound substrate',
      'Fill voids with epoxy fairing compound',
      'Apply barrier coat (2-3 coats)',
      'Sand and fair surface',
      'Apply bottom paint',
      'Launch and inspect'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Grind',          hours: 2.0 },
      { name: 'Fill & Fair',    hours: 2.0 },
      { name: 'Barrier Coat',   hours: 1.5 },
      { name: 'Sand & Finish',  hours: 1.0 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Structural Repair',
    category:    'Fiberglass & Structural',
    icon:        '\uD83C\uDFD7',
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
    icon:        '\u26F5',
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
      { name: 'Getting Ready',      hours: 0.5 },
      { name: 'Remove Hardware',    hours: 1.5 },
      { name: 'Demo Core',          hours: 3.0 },
      { name: 'Fit New Core',       hours: 2.0 },
      { name: 'Glass Skins',        hours: 3.0 },
      { name: 'Fair & Finish',      hours: 2.0 },
      { name: 'Reinstall Hardware', hours: 1.5 },
      { name: 'Cleanup',            hours: 0.5 },
      { name: 'Driving',            hours: 0.5 }
    ]
  },

  {
    name:        'Stringer Repair',
    category:    'Fiberglass & Structural',
    icon:        '\uD83D\uDEE0',
    description: 'Re-tab fractured or delaminated stringers',
    scopeSteps: [
      'Inspect and locate delaminated or fractured stringers',
      'Remove flooring or access panels as needed',
      'Grind tabbing and stringer surface to clean laminate',
      'Dry out core if wet rot is present',
      'Re-tab stringers with biaxial cloth and epoxy',
      'Fair and finish exposed surfaces',
      'Reinstall flooring or access panels',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Access / Demo',  hours: 2.0 },
      { name: 'Grind',          hours: 2.0 },
      { name: 'Re-Tab',         hours: 3.0 },
      { name: 'Fair & Finish',  hours: 1.5 },
      { name: 'Reinstall',      hours: 1.5 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  /* -- Mechanical & Systems ---------------------------------- */
  {
    name:        'Engine Service',
    category:    'Mechanical & Systems',
    icon:        '\u2699',
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
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Oil & Filter',   hours: 0.5 },
      { name: 'Fuel Filter',    hours: 0.5 },
      { name: 'Impeller',       hours: 1.0 },
      { name: 'Zincs',          hours: 0.5 },
      { name: 'Belts & Hoses',  hours: 0.5 },
      { name: 'Run & Inspect',  hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Electrical Repair',
    category:    'Mechanical & Systems',
    icon:        '\u26A1',
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
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Diagnose',        hours: 1.0 },
      { name: 'Pull Wire',       hours: 1.5 },
      { name: 'Connect & Label', hours: 1.0 },
      { name: 'Test',            hours: 0.5 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  /* -- Hardware & Deck -------------------------------------- */
  {
    name:        'Hardware Rebedding',
    category:    'Hardware & Deck',
    icon:        '\uD83D\uDD29',
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
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Remove Hardware', hours: 1.0 },
      { name: 'Prep & Fill',     hours: 0.5 },
      { name: 'Bed & Reinstall', hours: 1.0 },
      { name: 'Inspect & Test',  hours: 0.5 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Thru-Hull Replacement',
    category:    'Hardware & Deck',
    icon:        '\uD83D\uDD29',
    description: 'Remove, rebed, and reinstall thru-hull / seacock',
    scopeSteps: [
      'Close and remove existing seacock and thru-hull',
      'Inspect and clean hull opening',
      'Bed new thru-hull with 5200 or equivalent',
      'Install and torque new seacock',
      'Test for leaks at dock',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Remove Old',      hours: 1.0 },
      { name: 'Prep Opening',    hours: 0.5 },
      { name: 'Install New',     hours: 1.0 },
      { name: 'Test & Inspect',  hours: 0.5 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Rub Rail Replacement',
    category:    'Hardware & Deck',
    icon:        '\uD83D\uDEE0',
    description: 'Remove old rub rail, seal, install new',
    scopeSteps: [
      'Remove existing rub rail and hardware',
      'Clean and inspect hull edge',
      'Repair any damage to hull flange',
      'Install new rub rail and insert',
      'Seal ends and fastener holes',
      'Final inspection'
    ],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Remove Old',     hours: 1.5 },
      { name: 'Prep Edge',      hours: 0.5 },
      { name: 'Install New',    hours: 2.0 },
      { name: 'Seal & Finish',  hours: 0.5 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Teak Deck Repair',
    category:    'Hardware & Deck',
    icon:        '\uD83E\uDEB5',
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
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Remove Teak',    hours: 2.0 },
      { name: 'Prep Substrate', hours: 1.0 },
      { name: 'Fit & Glue',     hours: 2.0 },
      { name: 'Caulk Seams',    hours: 1.5 },
      { name: 'Sand & Seal',    hours: 1.0 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  /* -- Cosmetic ---------------------------------------------- */
  {
    name:        'Vinyl Wrap / Graphics',
    category:    'Cosmetic',
    icon:        '\uD83D\uDDBC',
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
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Remove Old',    hours: 1.0 },
      { name: 'Clean Surface', hours: 0.5 },
      { name: 'Cut & Apply',   hours: 2.0 },
      { name: 'Trim & Set',    hours: 1.0 },
      { name: 'Cleanup',       hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  },

  {
    name:        'Interior Detailing',
    category:    'Cosmetic',
    icon:        '\uD83E\uDDFD',
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
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Vacuum',        hours: 0.5 },
      { name: 'Shampoo',       hours: 1.5 },
      { name: 'Wipe Down',     hours: 1.0 },
      { name: 'Windows',       hours: 0.5 },
      { name: 'Reassemble',    hours: 0.5 },
      { name: 'Driving',       hours: 0.5 }
    ]
  }

];
