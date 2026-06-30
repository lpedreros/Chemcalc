/* ============================================================
   task_presets.js - ChemCalc Shared Task Presets
   ============================================================
   Each preset object has:
     name        {string}   - Display name for the task card
     category    {string}   - Groups cards in the modal
     icon        {string}   - JS Unicode escape only - no raw emoji
     description {string}   - One-line description
     scopeSteps  {string[]} - Plain text scope steps
     materialRows {object[]} - { name, cost, qty, markup, source, affKey }
     paintRows   {object[]} - Same structure, goes into paint/coatings section
     taskRows    {object[]} - { name, hours }

   cost = 0 means contractor fills in actual cost.
   affKey: null = no affiliate link yet.
   ============================================================ */

var TASK_PRESETS = [

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
      'Identify and mark all spider crack areas',
      'V-groove each crack with Dremel carbide bit',
      'Clean and degrease grooves',
      'Fill grooves with glass strand/roving and resin, or fiber-reinforced filler',
      'Let cure',
      'Sand flush',
      'Apply fairing compound to fair surface',
      'Sand fair',
      'Clean and degrease',
      'Mask surrounding area',
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
      { name: 'Dremel Carbide Bits',                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Glass Strand / Chopped Roving',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Polyester Resin (gallon kit with MEKP)',    cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'polyester_resin_1gallon_kit_with_mekp' },
      { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: 'White Gelcoat (quart kit with MEKP)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'white_gel_coat_1quart_kit_with_wax_and_mekp' },
      { name: 'Duratec Additive',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'duratec_resin_and_gel_coat_additive_for_tackfree_curingmy_favorite' },
      { name: 'PVA',                                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'pva' },
      { name: 'Preval Sprayer',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'preval' },
      { name: 'Wet Sanding Paper Assorted 800/1500',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'wet_sanding_paper_assorted_1000_1500_2000_2500' },
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
      { name: 'V-Groove',        hours: 1.0 },
      { name: 'Fill / Glass',    hours: 1.0 },
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
    description: 'Sand, prime, spray topcoat',
    scopeSteps: [
      'Wash and degrease entire surface',
      'Sand/scuff to remove oxidation and key surface',
      'Spot fair with fairing compound where needed',
      'Apply primer coats',
      'Sand primer',
      'Wash and degrease',
      'Tack cloth entire surface',
      'Spray topcoat (2-3 coats)',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Denatured Alcohol (gallon)',                cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Lacquer Thinner (gallon)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'lacquer_thinner_1gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '180-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '180_grit_xtract_sanding_disc_5inch_50box' },
      { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: 'Guide Coat Kit',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'guide_coat_kit' },
      { name: 'Awlgrip 545 Primer Base Grey (quart)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'awlgrip_545_primer_base_grey_1quart' },
      { name: 'Awlgrip 545 Primer Converter (quart)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'awlgrip_545_primer_converter_1quart' },
      { name: '320-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '320_grit_xtract_sanding_disc_5_inch_50box' },
      { name: 'Topcoat Paint (color - specify)',           cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Awlcraft 2000 Spray Reducer (quart)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'awlcraft2000awlgrip_spray_reducer_1quart' },
      { name: 'Awlcraft 2000 Spray Converter (quart)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'awlcraft2000awlgrip_spray_converter_1quart' },
      { name: 'Tack Cloth',                                cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: '3M Performance Spray Gun Kit',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_performance_spray_gun_kit' },
      { name: 'Spray Gun Cups/Lids/Liners 6oz Kit',        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'spray_gun_cups_lids_and_liners_kit_6_ounces' },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Masking Paper 12-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_paper_12inch' },
      { name: 'Masking Plastic 48-inch with Dispenser',    cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_plastic_48inch_with_dispenser' },
      { name: 'Hand Masker',                               cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'hand_masker' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Tyvek Coveralls (1-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' },
      { name: '3M Full Face Respirator Medium',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_full_face_respirator_medium_model_6800_filter_kit_linked_below' }
    ],
    paintRows: [],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Mask',            hours: 1.0 },
      { name: 'Sand / Scuff',    hours: 2.0 },
      { name: 'Spot Fair',       hours: 1.0 },
      { name: 'Prime',           hours: 1.0 },
      { name: 'Sand Primer',     hours: 1.0 },
      { name: 'Tack & Shoot',    hours: 1.5 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Bottom Paint',
    category:    'Gelcoat & Paint',
    icon:        '\u2693',
    description: 'Haul, sand, barrier coat, apply antifouling',
    scopeSteps: [
      'Haul and pressure wash hull',
      'Sand existing bottom paint',
      'Apply barrier coat / epoxy primer if needed',
      'Mask waterline and running gear',
      'Apply antifouling bottom paint (2 coats)',
      'Touch up waterline as needed',
      'Launch and inspect'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: 'Barrier Coat / Epoxy Primer',               cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Antifouling Bottom Paint',                  cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Poly Resin Roller Covers 9-inch (6-pack)',  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'poly_resin_roller_covers_9inch_6pack' },
      { name: 'Roller Tray with Liners 9-inch (10-pack)',  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'roller_tray_with_liners_and_roller_frame_9inch_10pack' },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Masking Paper 12-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_paper_12inch' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Tyvek Coveralls (1-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' }
    ],
    paintRows: [],
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
    materialRows: [
      { name: 'Denatured Alcohol (gallon)',                cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '3M Perfect-It Rubbing Compound',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_perfectit_rubbing_compound' },
      { name: '3M Finesse-It Polishing Compound',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_finesseit_polishing_compound' },
      { name: 'Buffing Pads 7-inch',                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'buffing_pads_7inch' },
      { name: 'Polishing Pads 3-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'polishing_pads_3inch' },
      { name: 'Marine Wax / Sealant',                      cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Rags',                                      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'rags' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' }
    ],
    paintRows: [],
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

  /* ---------------------------------------------------------- */
  /* FIBERGLASS & STRUCTURAL                                    */
  /* ---------------------------------------------------------- */

  {
    name:        'Fiberglass Repair',
    category:    'Fiberglass & Structural',
    icon:        '\uD83D\uDEE0',
    description: 'Grind, glass, fill, fair, match and shoot gel',
    scopeSteps: [
      'Assess and mark damaged area',
      'Grind back to clean laminate',
      'Cut and fit fiberglass cloth',
      'Wet out and laminate cloth layers with vinylester resin',
      'Let cure',
      'Grind glass flush to prep for filler',
      'Apply fairing compound and shape',
      'Sand fair - repeat as needed',
      'Clean and degrease',
      'Mask surrounding area',
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
      { name: '3M Green Corps Grinding Wheels 5-inch 40-grit (20-pack)', cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_green_corps_grinding_wheels_5inch_40grit_20pack' },
      { name: '1708 Biaxial Cloth 50in x 10yd',           cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: 'Vinylester Resin',                          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Ribbed Bubble Rollers (4-pack)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack' },
      { name: 'Electric Scissors for Fiberglass',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'electric_scissors_for_cutting_fiberglass_cloth' },
      { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: 'Guide Coat Kit',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'guide_coat_kit' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '180-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '180_grit_xtract_sanding_disc_5inch_50box' },
      { name: 'White Gelcoat (quart kit with MEKP)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'white_gel_coat_1quart_kit_with_wax_and_mekp' },
      { name: 'Duratec Additive',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'duratec_resin_and_gel_coat_additive_for_tackfree_curingmy_favorite' },
      { name: 'PVA',                                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'pva' },
      { name: 'Preval Sprayer',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'preval' },
      { name: '400-grit Wet Sandpaper (50-sheets)',        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '400_grit_wet_paper_50_sheets' },
      { name: '800-grit Wet Sandpaper (50-sheets)',        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '800_grit_wet_sandpaper_50_sheets' },
      { name: '1500-grit Wet Sandpaper (50-sheets)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '1500_grit_wet_sandpaper_50_sheets' },
      { name: '3M Perfect-It Rubbing Compound',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_perfectit_rubbing_compound' },
      { name: 'Polishing Pads 5-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'polishing_pads_5inch' },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Masking Paper 12-inch',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_paper_12inch' },
      { name: 'Masking Plastic 35-inch',                   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'masking_plastic_35_inch' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' }
    ],
    paintRows: [],
    taskRows: [
      { name: 'Getting Ready',   hours: 0.5 },
      { name: 'Mask',            hours: 0.5 },
      { name: 'Grind',           hours: 1.5 },
      { name: 'Cut Cloth',       hours: 0.5 },
      { name: 'Glass',           hours: 2.0 },
      { name: 'Grind Glass',     hours: 1.0 },
      { name: 'Fill & Shape',    hours: 2.0 },
      { name: 'Shoot Gelcoat',   hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Keel Repair (Gelcoat)',
    category:    'Fiberglass & Structural',
    icon:        '\u2693',
    description: 'Grind, glass if needed, fill, shoot gelcoat, buff',
    scopeSteps: [
      'Assess and mark damaged area',
      'Grind back to clean laminate',
      'Glass damaged area if needed (CSM + vinylester resin)',
      'Let cure',
      'Grind glass flush to prep for filler',
      'Fill and shape with fairing compound',
      'Sand fair',
      'Clean and degrease',
      'Mask surrounding area',
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
      { name: '3M Green Corps Grinding Wheels 5-inch 40-grit (20-pack)', cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_green_corps_grinding_wheels_5inch_40grit_20pack' },
      { name: 'Fiberglass Cloth CSM 50in x 10yd',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_csm_chopped_strand_matt_50_in_x_10_yards' },
      { name: 'Vinylester Resin',                          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Ribbed Bubble Rollers (4-pack)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack' },
      { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: 'White Gelcoat (quart kit with MEKP)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'white_gel_coat_1quart_kit_with_wax_and_mekp' },
      { name: 'Duratec Additive',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'duratec_resin_and_gel_coat_additive_for_tackfree_curingmy_favorite' },
      { name: 'PVA',                                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'pva' },
      { name: 'Preval Sprayer',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'preval' },
      { name: '400-grit Wet Sandpaper (50-sheets)',        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '400_grit_wet_paper_50_sheets' },
      { name: '800-grit Wet Sandpaper (50-sheets)',        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '800_grit_wet_sandpaper_50_sheets' },
      { name: '1500-grit Wet Sandpaper (50-sheets)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '1500_grit_wet_sandpaper_50_sheets' },
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
      { name: 'Grind',           hours: 1.5 },
      { name: 'Glass (if needed)', hours: 1.0 },
      { name: 'Grind Glass',     hours: 0.5 },
      { name: 'Fill & Shape',    hours: 1.5 },
      { name: 'Shoot Gelcoat',   hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 1.5 },
      { name: 'Cleanup',         hours: 0.5 },
      { name: 'Driving',         hours: 0.5 }
    ]
  },

  {
    name:        'Keel Repair (Bottom Paint)',
    category:    'Fiberglass & Structural',
    icon:        '\u2693',
    description: 'Grind, glass if needed, epoxy fill, barrier coat, bottom paint',
    scopeSteps: [
      'Haul and inspect keel condition',
      'Grind damaged areas to sound substrate',
      'Glass damaged area if needed (1708 biaxial + vinylester resin)',
      'Let cure',
      'Grind glass flush to prep for filler',
      'Fill voids with epoxy fairing compound',
      'Sand and fair surface',
      'Apply barrier coat (2-3 coats)',
      'Apply bottom paint',
      'Launch and inspect'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '3M Green Corps Grinding Wheels 5-inch 40-grit (20-pack)', cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_green_corps_grinding_wheels_5inch_40grit_20pack' },
      { name: '1708 Biaxial Cloth 50in x 10yd',           cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: 'Vinylester Resin',                          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Ribbed Bubble Rollers (4-pack)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack' },
      { name: 'Epoxy Resin Base (gallon)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'epoxy_resin_base_1gallon' },
      { name: 'Epoxy Resin Hardener Slow (quart)',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'epoxy_resin_hardener_slow_1_quart' },
      { name: 'Fumed Silica Thickener (quart)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fumed_silica_thickener_very_fine_easy_to_sand_1quart' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: 'Barrier Coat / Epoxy Primer',               cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Antifouling Bottom Paint',                  cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Poly Resin Roller Covers 9-inch (6-pack)',  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'poly_resin_roller_covers_9inch_6pack' },
      { name: 'Roller Tray with Liners 9-inch (10-pack)',  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'roller_tray_with_liners_and_roller_frame_9inch_10pack' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Tyvek Coveralls (1-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' }
    ],
    paintRows: [],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Grind',          hours: 2.0 },
      { name: 'Glass (if needed)', hours: 1.0 },
      { name: 'Grind Glass',    hours: 0.5 },
      { name: 'Fill & Fair',    hours: 2.0 },
      { name: 'Barrier Coat',   hours: 1.5 },
      { name: 'Bottom Paint',   hours: 1.0 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  {
    name:        'Structural Repair',
    category:    'Fiberglass & Structural',
    icon:        '\uD83C\uDFD7',
    description: 'Demo, glass, core, glass over, fair, finish',
    scopeSteps: [
      'Assess structural damage and develop repair plan',
      'Remove hardware and access panels as needed',
      'Grind laminate to sound substrate',
      'Cut and fit structural cloth (1708 biaxial)',
      'Laminate structural layers with vinylester resin',
      'Install core material if required (Coosa board or marine plywood)',
      'Glass over core (interior and exterior skins)',
      'Let cure',
      'Grind glass flush to prep for filler',
      'Fill and shape with fairing compound',
      'Fair surface - repeat as needed',
      'Apply finish coat (gelcoat, paint, or bottom paint depending on location)',
      'Reinstall hardware and fittings',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '3M Green Corps Grinding Wheels 5-inch 40-grit (20-pack)', cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_green_corps_grinding_wheels_5inch_40grit_20pack' },
      { name: '1708 Biaxial Cloth 50in x 10yd',           cost: 0, qty: 2, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: 'Fiberglass Cloth CSM 50in x 10yd',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_csm_chopped_strand_matt_50_in_x_10_yards' },
      { name: 'Vinylester Resin',                          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Ribbed Bubble Rollers (4-pack)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack' },
      { name: 'Electric Scissors for Fiberglass',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'electric_scissors_for_cutting_fiberglass_cloth' },
      { name: 'Coosa Board / Marine Plywood',             cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Milled Fibers Thickener (quart)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'milled_fibers_thickener_heavier_for_adhesive_applications_1_quart' },
      { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: 'Guide Coat Kit',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'guide_coat_kit' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '180-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '180_grit_xtract_sanding_disc_5inch_50box' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Tyvek Coveralls (1-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' }
    ],
    paintRows: [],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Demo / Removal', hours: 2.0 },
      { name: 'Grind',          hours: 2.0 },
      { name: 'Cut Cloth',      hours: 1.0 },
      { name: 'Glass',          hours: 3.0 },
      { name: 'Grind Glass',    hours: 1.0 },
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
      'Cut and fit new transom core (Coosa board or marine plywood)',
      'Bed core with structural adhesive (milled fibers + vinylester)',
      'Glass interior and exterior skins with vinylester resin',
      'Let cure',
      'Grind glass flush to prep for filler',
      'Fill and shape with fairing compound',
      'Fair surface',
      'Apply finish coat (gelcoat or paint depending on boat)',
      'Reinstall hardware with proper bedding compound',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '3M Green Corps Grinding Wheels 5-inch 40-grit (20-pack)', cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_green_corps_grinding_wheels_5inch_40grit_20pack' },
      { name: '1708 Biaxial Cloth 50in x 10yd',           cost: 0, qty: 2, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: 'Fiberglass Cloth CSM 50in x 10yd',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_csm_chopped_strand_matt_50_in_x_10_yards' },
      { name: 'Vinylester Resin',                          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Ribbed Bubble Rollers (4-pack)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack' },
      { name: 'Electric Scissors for Fiberglass',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'electric_scissors_for_cutting_fiberglass_cloth' },
      { name: 'Coosa Board / Marine Plywood',             cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Milled Fibers Thickener (quart)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'milled_fibers_thickener_heavier_for_adhesive_applications_1_quart' },
      { name: '3M Platinum Plus Filler (gallon)',          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: 'Guide Coat Kit',                            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'guide_coat_kit' },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '180-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '180_grit_xtract_sanding_disc_5inch_50box' },
      { name: '5200 Permanent Adhesive 10oz',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '5200_permanent_adhesive_10_oz_tube' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Tyvek Coveralls (1-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' }
    ],
    paintRows: [],
    taskRows: [
      { name: 'Getting Ready',      hours: 0.5 },
      { name: 'Remove Hardware',    hours: 1.5 },
      { name: 'Demo Core',          hours: 3.0 },
      { name: 'Fit New Core',       hours: 2.0 },
      { name: 'Glass Skins',        hours: 3.0 },
      { name: 'Grind Glass',        hours: 1.0 },
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
      'Replace core with Coosa board if needed',
      'Re-tab stringers with 1708 biaxial cloth and vinylester resin',
      'Glass over re-tabbed areas',
      'Let cure',
      'Grind glass flush',
      'Reinstall flooring or access panels',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '3M Green Corps Grinding Wheels 5-inch 40-grit (20-pack)', cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_green_corps_grinding_wheels_5inch_40grit_20pack' },
      { name: '1708 Biaxial Cloth 50in x 10yd',           cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: 'Vinylester Resin',                          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Ribbed Bubble Rollers (4-pack)',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'ribbed_bubble_rollers_for_fiberglass_assorted_sizes_4pack' },
      { name: 'Electric Scissors for Fiberglass',         cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'electric_scissors_for_cutting_fiberglass_cloth' },
      { name: 'Coosa Board / Marine Plywood (if needed)', cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Tyvek Coveralls (1-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'dupont_tyvek_400_ty122s_disposable_protective_coverall_hood_and_boots_1pack' },
      { name: 'Organic Vapor Filters',                     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'organic_vapor_filters' }
    ],
    paintRows: [],
    taskRows: [
      { name: 'Getting Ready',  hours: 0.5 },
      { name: 'Access / Demo',  hours: 2.0 },
      { name: 'Grind',          hours: 2.0 },
      { name: 'Re-Tab / Glass', hours: 3.0 },
      { name: 'Grind Glass',    hours: 1.0 },
      { name: 'Reinstall',      hours: 1.5 },
      { name: 'Cleanup',        hours: 0.5 },
      { name: 'Driving',        hours: 0.5 }
    ]
  },

  /* ---------------------------------------------------------- */
  /* HARDWARE & DECK                                            */
  /* ---------------------------------------------------------- */

  {
    name:        'Hardware Rebedding',
    category:    'Hardware & Deck',
    icon:        '\uD83D\uDD29',
    description: 'Remove, rebed, and reinstall deck hardware',
    scopeSteps: [
      'Remove existing hardware',
      'Scrape old bedding compound from hardware and deck',
      'Clean fastener holes with burr bits',
      'Inspect and fill holes if needed',
      'Apply appropriate bedding compound',
      'Reinstall hardware and torque fasteners',
      'Inspect for watertight seal',
      'Final cleanup'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Pry Bar',                                   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Plastic Scraper / Putty Knife',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Burr Bits (hole cleaning)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: '4200 Permanent Adhesive 10oz (removable)',  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '4200_permanent_adhesive_10_oz_tube' },
      { name: '5200 Permanent Adhesive 10oz (permanent)',  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '5200_permanent_adhesive_10_oz_tube' },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Rags',                                      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'rags' }
    ],
    paintRows: [],
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
      'Scrape old bedding compound',
      'Clean hull opening with burr bits',
      'Inspect hull laminate around opening',
      'Bed new thru-hull with 5200',
      'Install and torque new seacock',
      'Test for leaks at dock',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Pry Bar',                                   cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Plastic Scraper / Putty Knife',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Burr Bits (hole cleaning)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: '5200 Permanent Adhesive 10oz',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '5200_permanent_adhesive_10_oz_tube' },
      { name: 'Thru-Hull Fitting (job-specific)',          cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Seacock (job-specific)',                    cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Rags',                                      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'rags' }
    ],
    paintRows: [],
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
      'Scrape old bedding compound from hull edge',
      'Clean and inspect hull edge',
      'Repair any damage to hull flange',
      'Install new rub rail and insert with 4200',
      'Seal ends and fastener holes',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Plastic Scraper / Putty Knife',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: '4200 Permanent Adhesive 10oz',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '4200_permanent_adhesive_10_oz_tube' },
      { name: 'Rub Rail and Insert (job-specific)',        cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Rags',                                      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'rags' }
    ],
    paintRows: [],
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
      'Remove damaged teak planks and old caulk',
      'Scrape and clean fiberglass substrate',
      'Fit and glue new teak planks with teak deck adhesive',
      'Re-caulk seams with marine deck caulk',
      'Sand flush and apply teak oil or sealer',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Acetone (gallon)',                          cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Plastic Scraper / Putty Knife',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Teak Planks (job-specific)',                cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Teak Deck Adhesive / Epoxy',               cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Marine Deck Caulk (black)',                 cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: '80-grit Sanding Disc 5-inch (50-box)',      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '180-grit Sanding Disc 5-inch (50-box)',     cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '180_grit_xtract_sanding_disc_5inch_50box' },
      { name: 'Teak Oil / Sealer',                         cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Chip Brushes 1-inch (24-pack)',              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'chip_brushes_1inch_24pack' },
      { name: 'Disposable Cups (125-pack)',                 cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'disposable_paper_cups_125pack' },
      { name: 'Mixing Sticks',                             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'mixing_sticks_reusable' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Rags',                                      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'rags' }
    ],
    paintRows: [],
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

  /* ---------------------------------------------------------- */
  /* COSMETIC                                                   */
  /* ---------------------------------------------------------- */

  {
    name:        'Vinyl Wrap / Graphics',
    category:    'Cosmetic',
    icon:        '\uD83D\uDDBC',
    description: 'Remove old graphics, apply new vinyl wrap or decals',
    scopeSteps: [
      'Remove existing graphics or vinyl',
      'Clean and degrease surface',
      'Wet sand if surface has oxidation or texture (800 - 1500 grit)',
      'Buff if wet sanded',
      'Measure and cut new vinyl',
      'Apply vinyl and squeegee out air bubbles',
      'Trim edges and heat-set curves',
      'Final inspection'
    ],
    materialRows: [
      { name: 'Denatured Alcohol (gallon)',                cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Plastic Scraper / Putty Knife',             cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: '800-grit Wet Sandpaper (50-sheets)',        cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '800_grit_wet_sandpaper_50_sheets' },
      { name: '1500-grit Wet Sandpaper (50-sheets)',       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '1500_grit_wet_sandpaper_50_sheets' },
      { name: '3M Perfect-It Rubbing Compound',            cost: 0, qty: 1, markup: 40, source: 'amz', affKey: '3m_perfectit_rubbing_compound' },
      { name: 'Buffing Pads 7-inch',                       cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'buffing_pads_7inch' },
      { name: 'Vinyl Wrap / Graphics (job-specific)',      cost: 0, qty: 1, markup: 40, source: 'web', affKey: null },
      { name: 'Squeegee',                                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Heat Gun',                                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: null },
      { name: 'Blue Tape 1-inch (6-pack)',                  cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'blue_tape_1inch_6pack' },
      { name: 'Latex Gloves',                              cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'latex_gloves' },
      { name: 'Rags',                                      cost: 0, qty: 1, markup: 40, source: 'amz', affKey: 'rags' }
    ],
    paintRows: [],
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
    materialRows: [],
    paintRows: [],
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
