// affiliate_links.js - v2 (Restructured with alwaysShow, renamed thickeners, removed fairing)

const chemcalcAffiliateLinks = {
  // Links that should ALWAYS be shown, regardless of resin type
  alwaysShow: [
    // Safety
    { url: "https://amzn.to/41GczFM", text: "Latex Gloves" },
    // Application Tools
    { url: "https://amzn.to/4ixutBi", text: "Mixing Sticks (Reusable)" },
    { url: "https://amzn.to/4bx0Wp7", text: "Disposable Paper Cups, 125-Pack" },
    { url: "https://amzn.to/4iaeQ2W", text: "Disposable Plastic Cups w/ Lids, 100-Count" },
    { url: "https://amzn.to/3FxZhDA", text: "Reusable Silicone Cups, 3-Pack" },
    { url: "https://amzn.to/4kzZ2Z0", text: "Shop Rags" }, // Renamed from Rags
    { url: "https://amzn.to/4jdGIU0", text: "Chip Brushes, 2-inch, 36-Pack" },
    { url: "https://amzn.to/4j98alz", text: "Foam Rollers, 6-inch, 20-Pack" }, // Assuming 6-inch is the 3-inch user meant?
    { url: "https://amzn.to/3RqfH3w", text: "Foam Roller Frame, 6-inch" }, // Assuming 6-inch is the 3-inch user meant?
    { url: "https://amzn.to/43xo0lC", text: "Roller Tray w/ Liners & Frame, 9-inch" },
    { url: "https://amzn.to/3FP5qLQ", text: "Resin Roller Covers (solvent resistant), 9-inch, 6-Pack" },
    { url: "https://amzn.to/4l4fIrz", text: "Fiberglass Bubble Rollers, Assorted Sizes, 4-Pack" },
    // Thickeners (Renamed)
    { url: "https://amzn.to/4bE5sCk", text: "Resin Thickener (Fumed Silica), 1-Quart" },
    { url: "https://amzn.to/4bFDLc7", text: "Resin Thickener (Milled Fibers), 1-Quart" },
  ],

  // Links specific to Polyester and Vinylester Resins
  polyester: [
    { url: "https://amzn.to/3FunL0L", text: "Polyester Resin, 1-Gallon Kit (with MEKp)" },
    { url: "https://amzn.to/3FKR4Mn", text: "White Gel Coat, 1-Gallon Kit (with wax and MEKp)" },
    { url: "https://amzn.to/41AaUBs", text: "Duratec High Gloss Additive (for tack-free cure)" },
  ],

  // Links specific to Vinylester (Currently same as Polyester, can be customized)
  vinylester: [
    { url: "https://amzn.to/3FunL0L", text: "Polyester/Vinylester Resin, 1-Gallon Kit (with MEKp)" },
    { url: "https://amzn.to/3FKR4Mn", text: "White Gel Coat, 1-Gallon Kit (with wax and MEKp)" },
    { url: "https://amzn.to/41AaUBs", text: "Duratec High Gloss Additive (for tack-free cure)" },
  ],

  // Links specific to Epoxy Resins
  epoxy: [
    { url: "https://amzn.to/3DNMDjt", text: "Epoxy Resin Base, 1-Gallon" },
    { url: "https://amzn.to/3DGSpU3", text: "Epoxy Resin Hardener FAST, 1-Quart" },
    { url: "https://amzn.to/4issCxx", text: "Epoxy Resin Hardener SLOW, 1-Quart" },
    // REMOVED Awlfair and Splash Zone links
  ],

  // Dynamic links based on selected materials
  dynamic: {
      // Add specific cloth links here, keyed by a representative material type
      fiberglass_cloth: { url: "https://amzn.to/3FYn3c4", text: "Fiberglass Cloth, CSM (Chopped Strand Mat), 50in x 10yd" },
      carbon_fiber: { url: "https://amzn.to/some_carbon_link", text: "Carbon Fiber Cloth, 3k Twill, 50in x 1yd" }, // Example
      kevlar: { url: "https://amzn.to/some_kevlar_link", text: "Kevlar Cloth, 5oz Plain Weave, 50in x 1yd" } // Example
      // Add more specific cloth types if needed
  },

  // Default links (Other Safety, Tools, General Materials) - Shown as fallback or addition
  default: [
    // Safety Gear
    { url: "https://amzn.to/4kVO3ZO", text: "DuPont Tyvek Disposable Coverall w/ Hood & Boots" },
    { url: "https://amzn.to/41p1b0I", text: "Head Socks (for under respirator)" },
    { url: "https://amzn.to/41RKHOQ", text: "3M Full Face Respirator (Ultimate FX FF-402)" },
    { url: "https://amzn.to/3DGQvmn", text: "Organic Vapor Cartridges (for 3M respirator)" },
    { url: "https://amzn.to/3Fw6xQl", text: "Particulate Filter Retainers (for 3M respirator)" },
    { url: "https://amzn.to/4kVNKhC", text: "Particulate Filters (P100 for 3M respirator)" },
    { url: "https://amzn.to/4ixlkc6", text: "3M Faceshield Covers (for Ultimate FX series)" },
    { url: "https://amzn.to/4bTO1xL", text: "Hearing Protection" },
    // Solvents
    { url: "https://amzn.to/4izxOjj", text: "Denatured Alcohol, 1-Gallon" },
    { url: "https://amzn.to/4ia9cxM", text: "Lacquer Thinner, 1-Gallon" },
    // Fillers/Putties (Excluding removed fairing compounds)
    { url: "https://amzn.to/3FtykBc", text: "3M Platinum Plus Filler, 1 Gallon" },
    { url: "https://amzn.to/4iwNPXi", text: "Hardener for Filler (Red), 4 oz" },
    { url: "https://amzn.to/41vtWcg", text: "3M Acrylic Putty, 1 Tube" },
    // Adhesives
    { url: "https://amzn.to/3QVlcas", text: "3M 5200 Permanent Adhesive Sealant, 10 oz" },
    { url: "https://amzn.to/420jAkA", text: "3M 4200 Fast Cure Adhesive Sealant, 10 oz" },
    // Materials (Excluding the main cloth link moved to dynamic)
    { url: "https://amzn.to/4ckJcgN", text: "Mica Powder Pigments (for tinting), 36-Colors" },
    { url: "https://amzn.to/4iwdorG", text: "Color Tints (liquid, assorted colors)" },
    // Application Tools
    { url: "https://amzn.to/4bFNI9C", text: "Mixing Board" },
    // Tapes/Masking
    { url: "https://amzn.to/43P5LYL", text: "Blue Painter's Tape, 1-inch, 6-Pack" },
    { url: "https://amzn.to/3DAGOWC", text: "Double-Sided Tape, 1-inch" },
    { url: "https://amzn.to/4kVPFCU", text: "Masking Plastic, 72-inch" },
    { url: "https://amzn.to/3FA2qmx", text: "Masking Paper, 12-inch" },
    { url: "https://amzn.to/4hGh4G0", text: "3M Hand Masker Dispenser" },
    // Sanding/Grinding
    { url: "https://amzn.to/4iTdB7Y", text: "Guide Coat Kit" },
    { url: "https://amzn.to/41sWEKN", text: "80 Grit Sanding Disc, 5-inch, 50-Box" },
    { url: "https://amzn.to/41UrbBb", text: "180 Grit Xtract Sanding Disc, 5-inch, 50-Box" },
    { url: "https://amzn.to/4kuvKe6", text: "320 Grit Xtract Sanding Disc, 5-inch, 50-Box" },
    { url: "https://amzn.to/42i8iZ5", text: "400 Grit Sanding Disc, 5-inch, 200-Box" },
    { url: "https://amzn.to/3RsRA4y", text: "800 Grit Sanding Disc, 5-inch, 50-Box" },
    { url: "https://amzn.to/3GclOWT", text: "1200 Grit Sanding Disc, 5-inch, 50-Box" },
    { url: "https://amzn.to/3DNPOrp", text: "400 Grit Wet/Dry Sandpaper, 50 Sheets" },
    { url: "https://amzn.to/41p5Hwc", text: "800 Grit Wet/Dry Sandpaper, 50 Sheets" },
    { url: "https://amzn.to/4ivoAVg", text: "1200 Grit Wet/Dry Sandpaper, 50 Sheets" },
    { url: "https://amzn.to/4kusLlT", text: "1500 Grit Wet/Dry Sandpaper, 50 Sheets" },
    { url: "https://amzn.to/3FtKEkI", text: "2000 Grit Wet/Dry Sandpaper, 50 Sheets" },
    { url: "https://amzn.to/4ktEbGD", text: "Wet Sanding Paper Assortment (1000-2500 Grit)" },
    { url: "https://amzn.to/3FE5Cxq", text: "3M Clean Sanding Blocks" },
    { url: "https://amzn.to/4iaewRM", text: "Sanding Blocks (Dura-Block style)" },
    { url: "https://amzn.to/3FAVDZM", text: "Linear Sanding Blocks, Assorted Sizes" },
    { url: "https://amzn.to/4imXJuK", text: "File Sander Belts, 36-Grit" },
    { url: "https://amzn.to/4ktEbGD", text: "3M Green Corps Grinding Wheels, 5-inch, 40-Grit" }, // Note: Duplicate URL from wet paper assortment? Check link.
    { url: "https://amzn.to/3RdrYZ3", text: "3M Cubitron II Grinding Wheels, 5-inch, 36-Grit" },
    // Spray/Paint Specific
    { url: "https://amzn.to/4kw1dwv", text: "Preval Sprayer, 12-Pack" },
    { url: "https://amzn.to/3XZmeG2", text: "Spray Gun Disposable Cups/Lids/Liners Kit, 28 oz" },
    { url: "https://amzn.to/41UgS01", text: "Detail HVLP Spray Gun" },
    { url: "https://amzn.to/3DORvEW", text: "3M Performance Spray Gun Kit" },
    { url: "https://amzn.to/43Xef07", text: "3M Spray Gun Air Flow Control Valve" },
    { url: "https://amzn.to/3XYhy3i", text: "3M Atomizing Heads Size 1.2 (for 3M gun)" },
    { url: "https://amzn.to/3XVwpvq", text: "3M Atomizing Heads Size 1.4 (for 3M gun)" },
    { url: "https://amzn.to/4kCrUQg", text: "3M Atomizing Heads Size 2.0 (for 3M gun)" },
    { url: "https://www.amazon.com/Awlgrip-Premium-Polyester-Urethane-Gallon/dp/B002IZMGXE", text: "Awlgrip Topcoat Base (Snow White), 1-Gallon" },
    { url: "https://defender.com/en_us/awlgrip-polyester-urethane-topcoat-base-extreme-black-g2066q", text: "Awlgrip Topcoat Base (Extreme Black), 1-Gallon" },
    { url: "https://www.amazon.com/Awlgrip-NA-G5002G-REGMNTL-AWLGRIP/dp/B002IZMGPC", text: "Awlgrip Topcoat Base (Flag Blue), 1-Gallon" },
    { url: "https://www.amazon.com/Awlgrip-Awlcraft-Acrylic-Urethane-Gallon/dp/B002IZDOVW", text: "Awlcraft 2000 Base (Snow White), 1-Gallon" },
    { url: "https://www.partspak.com/productcart/pc/Awlgrip-F2091G-Awlcraft-2000-Super-Jet-Black-Gl-p250665.htm", text: "Awlcraft 2000 Base (Super Jet Black), 1-Gallon" },
    { url: "https://www.amazon.com/Awlgrip-F5014Q-Awlcraft-2000-Flag/dp/B006VJ57JI", text: "Awlcraft 2000 Base (Flag Blue), 1-Quart" },
    { url: "https://www.amazon.com/Awlgrip-Epoxy-Primer-Gallon-98-D8001g/dp/B002IZJ9UM/", text: "Awlgrip 545 Epoxy Primer Base (White), 1-Gallon" },
    { url: "https://amzn.to/41zFVFL", text: "Awlgrip Roll/Brush Reducer (T0031), 1-Quart" },
    { url: "https://amzn.to/4bTQLeg", text: "Awlgrip Roll/Brush Converter (H3002), 1-Pint" },
    { url: "https://amzn.to/3FwKuZY", text: "Awlcraft/Awlgrip Spray Reducer (T0006), 1-Quart" },
    { url: "https://amzn.to/42aSwk0", text: "Awlcraft/Awlgrip Spray Converter (G3010), 1-Quart" },
    { url: "https://amzn.to/3FNsJpq", text: "Awlgrip 545 Primer Converter (D3001), 1-Gallon" },
    // Polishing/Buffing
    { url: "https://amzn.to/4iwqogI", text: "3M Perfect-It Rubbing Compound" },
    { url: "https://amzn.to/4i9sof0", text: "3M Finesse-It II Polishing Compound" },
    { url: "https://amzn.to/4hw5vkZ", text: "Polishing Pads, 6-inch" },
    { url: "https://amzn.to/4igH1xg", text: "Buffing Pads, 7-inch" },
    // Power Tools
    { url: "https://amzn.to/4icDmAw", text: "Milwaukee Cordless Compressor" },
    { url: "https://amzn.to/4iPGBgW", text: "DeWalt Cordless Grinder" },
    { url: "https://amzn.to/3FvfoSq", text: "Makita Corded File Sander" },
    { url: "https://amzn.to/41MzVJB", text: "Milwaukee Cordless File Sander" },
    { url: "https://amzn.to/4bSv5PB", text: "Festool Orbital Sander (ETS 125 REQ), 5-inch" },
    { url: "https://amzn.to/4kOQnld", text: "Festool Cordless/Corded Orbital Sander Kit (ETSC 125), 5-inch" },
    { url: "https://amzn.to/4bUHQt1", text: "DeWalt Corded Orbital Sander, 5-inch" },
    { url: "https://amzn.to/43JWb9y", text: "Milwaukee Cordless Orbital Sander, 5-inch" },
    { url: "https://amzn.to/3R9VSgM", text: "DeWalt Cordless Orbital Sander (Tool Only), 5-inch" },
    { url: "https://amzn.to/4hyUb7m", text: "DeWalt Cordless Orbital Sander Kit, 5-inch" },
    { url: "https://amzn.to/4iO3h15", text: "Rupes LHR15 Random Orbital Polisher" },
    { url: "https://amzn.to/3DBB6DP", text: "RUPES Cordless Polisher & Mini iBrid Combo" },
    { url: "https://amzn.to/4kPTeKP", text: "SPTA Mini Car Polisher" },
    { url: "https://amzn.to/4iBT4Fi", text: "DeWalt Corded Buffer" },
    { url: "https://amzn.to/4ijJnLF", text: "Makita Corded Buffer" },
    { url: "https://amzn.to/3DOPBUY", text: "Milwaukee Cordless Buffer" },
    // Misc
    { url: "https://amzn.to/41p3QHK", text: "PVA Mold Release" },
    { url: "https://amzn.to/4ifkPDF", text: "Electric Scissors (for cloth)" },
    { url: "https://amzn.to/4l0SbHZ", text: "Centipede Workbench, 4x8" },
  ]
};

