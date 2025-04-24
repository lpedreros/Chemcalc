document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const unitSystemSelect       = document.getElementById('unitSystem');
  const materialTypeSelect     = document.getElementById('materialType');
  const clothTypeSelect        = document.getElementById('clothType');
  const resinTypeSelect        = document.getElementById('resinType');
  const surfaceAreaInput       = document.getElementById('surfaceArea');
  const areaUnitSelect         = document.getElementById('areaUnit');
  const volumeResultUnitSelect = document.getElementById('volumeResultUnit');
  const weightResultUnitSelect = document.getElementById('weightResultUnit');
  const clothThumbnail         = document.getElementById('clothThumbnail');

  // Print summary elements
  const printUrlSpan           = document.getElementById('printUrl');
  const printUnitSystemSpan    = document.getElementById('printUnitSystem');
  const printMaterialTypeSpan  = document.getElementById('printMaterialType');
  const printClothTypeSpan     = document.getElementById('printClothType');
  const printResinTypeSpan     = document.getElementById('printResinType');
  const printSurfaceAreaSpan   = document.getElementById('printSurfaceArea');
  const printAreaUnitSpan      = document.getElementById('printAreaUnit');
  const printQrImage           = document.getElementById('printQr');
  const printButton            = document.getElementById('printButton');

  // Results elements
  const clothWeightResult      = document.getElementById('clothWeight').querySelector('span');
  const resinVolumeResult      = document.getElementById('resinVolume').querySelector('span');
  const resinWeightResult      = document.getElementById('resinWeight').querySelector('span');
  const resinRatioResult       = document.getElementById('resinRatio').querySelector('span');
  const coverageInfoElement    = document.getElementById('coverageInfo');

  // Full Material Data
  const materials = {
    fiberglass: {
      imperial: [
        { id: 'csm_1.5', name: 'CSM - Chopped Strand Mat (1.5 oz/ft²)',              weight: 1.5,    unit: 'oz/ft²', ratios: { polyester: 2.0, epoxy: 2.0, vinylester: 2.0 } },
        { id: 'fg_0.75', name: 'Style #106 - Lightweight Cloth (0.75 oz/yd²)',      weight: 0.75/9, unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_1.5',  name: 'Style #108 - Lightweight Cloth (1.5 oz/yd²)',       weight: 1.5/9,  unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_4',    name: 'Style #1522 - Medium Weight (4 oz/yd²)',           weight: 4/9,    unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_5.6',  name: 'Style #3733 - Sailboat Cloth (5.6 oz/yd²)',        weight: 5.6/9,  unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_7.5',  name: 'Style #7532 - Heavy Weight (7.5 oz/yd²)',          weight: 7.5/9,  unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_10',   name: 'Style #7500 - Heavy Weight (10 oz/yd²)',          weight: 10/9,   unit: 'oz/ft²', ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'biaxial_1708', name: 'DBM 1708 - Biaxial (+/-45°, 17oz w/mat)',   weight: 17/9,   unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_1208', name: 'DBM 1208 - Biaxial (+/-45°, 12oz w/mat)',   weight: 12/9,   unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_1808', name: 'DBM 1808 - Biaxial (+/-45°, 18oz w/mat)',   weight: 18/9,   unit: 'oz/ft²', ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'woven_roving_18', name: 'Woven Roving (18 oz/yd²)',              weight: 18/9,   unit: 'oz/ft²', ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'woven_roving_24', name: 'Woven Roving (24 oz/yd²)',              weight: 24/9,   unit: 'oz/ft²', ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } }
      ],
      metric: [
        { id: 'csm_450',  name: 'CSM - Chopped Strand Mat (450 g/m²)',         weight: 450,    unit: 'g/m²',  ratios: { polyester: 2.0, epoxy: 2.0, vinylester: 2.0 } },
        { id: 'fg_25',    name: 'Style #106 - Lightweight Cloth (25 g/m²)',    weight: 25,     unit: 'g/m²',  ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_50',    name: 'Style #108 - Lightweight Cloth (50 g/m²)',    weight: 50,     unit: 'g/m²',  ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_135',   name: 'Style #1522 - Medium Weight (135 g/m²)',      weight: 135,    unit: 'g/m²',  ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_190',   name: 'Style #3733 - Sailboat Cloth (190 g/m²)',     weight: 190,    unit: 'g/m²',  ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_255',   name: 'Style #7532 - Heavy Weight (255 g/m²)',       weight: 255,    unit: 'g/m²',  ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'fg_340',   name: 'Style #7500 - Heavy Weight (340 g/m²)',       weight: 340,    unit: 'g/m²',  ratios: { polyester: 2.5, epoxy: 2.0, vinylester: 2.3 } },
        { id: 'biaxial_580', name: 'DBM 1708 - Biaxial (+/-45°, 580 g/m²)',   weight: 580,    unit: 'g/m²',  ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_400', name: 'DBM 1208 - Biaxial (+/-45°, 400 g/m²)',   weight: 400,    unit: 'g/m²',  ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'biaxial_600', name: 'DBM 1808 - Biaxial (+/-45°, 600 g/m²)',   weight: 600,    unit: 'g/m²',  ratios: { polyester: 3.0, epoxy: 2.5, vinylester: 2.8 } },
        { id: 'woven_roving_600', name: 'Woven Roving (600 g/m²)',            weight: 600,    unit: 'g/m²',  ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'woven_roving_800', name: 'Woven Roving (800 g/m²)',            weight: 800,    unit: 'g/m²',  ratios: { polyester: 2.2, epoxy: 1.8, vinylester: 2.0 } }
      ]
    },
    carbon: {
      imperial: [
        { id: 'carbon_5.7', name: '3K Plain Weave (5.7 oz/yd²)',            weight: 5.7/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_5.8', name: '3K 2x2 Twill Weave (5.8 oz/yd²)',       weight: 5.8/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_9',   name: 'Unidirectional (9 oz/yd²)',            weight: 9/9,   unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 1.5, vinylester: 1.8 } }
      ],
      metric: [
        { id: 'carbon_193', name: '3K Plain Weave (193 g/m²)',            weight: 193, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_197', name: '3K 2x2 Twill Weave (197 g/m²)',       weight: 197, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.8, vinylester: 2.0 } },
        { id: 'carbon_305', name: 'Unidirectional (305 g/m²)',           weight: 305, unit: 'g/m²', ratios: { polyester: 0, epoxy: 1.5, vinylester: 1.8 } }
      ]
    },
    kevlar: {
      imperial: [
        { id: 'kevlar_5',        name: 'Kevlar Plain Weave (5 oz/yd²)',          weight: 5/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 2.2, vinylester: 2.5 } },
        { id: 'kevlar_carbon_6', name: 'Kevlar/Carbon Hybrid (6 oz/yd²)',      weight: 6/9, unit: 'oz/ft²', ratios: { polyester: 0, epoxy: 2.0, vinylester: 2.3 } }
      ],
      metric: [
        { id: 'kevlar_170',       name: 'Kevlar Plain Weave (170 g/m²)',       weight: 170, unit: 'g/m²', ratios: { polyester: 0, epoxy: 2.2, vinylester: 2.5 } },
        { id: 'kevlar_carbon_200',name: 'Kevlar/Carbon Hybrid (200 g/m²)',    weight: 200, unit: 'g/m²', ratios: { polyester: 0, epoxy: 2.0, vinylester: 2.3 } }
      ]
    }
  };

  // Conversion factors
  const conversions = {
    area: {
      imperial: { 'ft²':1, 'yd²':9, 'in²':1/144 },
      metric:   { 'm²':1, 'cm²':1/10000, 'mm²':1/1000000 }
    },
    volume: {
      imperial: { 'fl oz':1, 'quart':32, 'gallon':128 },
      metric:   { 'mL':1, 'cc':1, 'L':1000 }
    },
    weight: {
      imperial: { 'oz':1 },
      metric:   { 'g':1, 'kg':1000 }
    },
    density: {
      imperial: { 'polyester':9.2, 'epoxy':9.5, 'vinylester':9.3 }, // lb/gal
      metric:   { 'polyester':1.1, 'epoxy':1.14, 'vinylester':1.12 } // g/mL
    }
  };

  // Populate area units
  function updateAreaUnits() {
    const sys = unitSystemSelect.value;
    const list = sys==='imperial' ? ['ft²','yd²','in²'] : ['m²','cm²','mm²'];
    areaUnitSelect.innerHTML = '';
    list.forEach(u => areaUnitSelect.add(new Option(u, u)));
  }

  // Populate result units
  function updateResultUnits() {
    const sys = unitSystemSelect.value;
    // Volume
    const volList = sys==='imperial' ? ['fl oz','quart','gallon'] : ['mL','cc','L'];
    volumeResultUnitSelect.innerHTML = '';
    volList.forEach(u => volumeResultUnitSelect.add(new Option(u, u)));
    // Weight
    const wtList = sys==='imperial' ? ['oz'] : ['g','kg'];
    weightResultUnitSelect.innerHTML = '';
    wtList.forEach(u => weightResultUnitSelect.add(new Option(u, u)));
  }

  // Populate cloth types & thumbnail
  function updateClothTypes() {
    const mat = materialTypeSelect.value;
    const sys = unitSystemSelect.value;
    clothTypeSelect.innerHTML = '';
    materials[mat][sys].forEach(c => {
      clothTypeSelect.add(new Option(c.name, c.id));
    });
    updateThumbnail();
    validateResinCompatibility();
  }

  // Update thumbnail image
  function updateThumbnail() {
    const id = clothTypeSelect.value;
    clothThumbnail.src = `/images/${id}.svg`;
    clothThumbnail.alt = clothTypeSelect.selectedOptions[0].text;
  }

  // Ensure resin compatibility
  function validateResinCompatibility() {
    const mat = materialTypeSelect.value;
    Array.from(resinTypeSelect.options).forEach(opt => {
      opt.disabled = mat!=='fiberglass' && opt.value==='polyester';
    });
    if((mat==='carbon'||mat==='kevlar') && resinTypeSelect.value==='polyester') {
      resinTypeSelect.value = 'epoxy';
      alert(`Polyester resin is not recommended for ${mat}. Switched to Epoxy.`);
    }
  }

  // Convert values
  function convertVolume(v, from, to, sys) {
    return (v / conversions.volume[sys][to]).toFixed(2);
  }
  function convertWeight(w, from, to, sys) {
    return (w / conversions.weight[sys][to]).toFixed(2);
  }

  // Main calculate()
  function calculate() {
    const mat     = materialTypeSelect.value;
    const sys     = unitSystemSelect.value;
    const clothId = clothTypeSelect.value;
    const resin   = resinTypeSelect.value;
    const area    = parseFloat(surfaceAreaInput.value)||0;
    const aUnit   = areaUnitSelect.value;
    if(!clothId||area<=0) { resetResults(); return; }

    // Area → standard
    const stdArea = area * conversions.area[sys][aUnit];
    // Cloth weight
    const cloth   = materials[mat][sys].find(c=>c.id===clothId);
    const cWeight = cloth.weight * stdArea;
    // Resin ratio
    const ratio   = cloth.ratios[resin];
    const rWeight = cWeight * ratio;
    const density = conversions.density[sys][resin];
    // Volume
    const rVolume = sys==='imperial'
      ? rWeight / (density * (1/128)) // oz→fl oz
      : rWeight / density;            // g→mL

    // Display cloth weight
    clothWeightResult.textContent = sys==='imperial'
      ? `${cWeight.toFixed(2)} oz`
      : `${cWeight.toFixed(2)} g`;

    // Display resin volume
    const volU = volumeResultUnitSelect.value;
    resinVolumeResult.textContent =
      `${convertVolume(rVolume, sys==='imperial'?'fl oz':'mL', volU, sys)} ${volU}`;

    // Display resin weight
    const wtU = weightResultUnitSelect.value;
    resinWeightResult.textContent =
      `${convertWeight(rWeight, sys==='imperial'?'oz':'g', wtU, sys)} ${wtU}`;

    // Ratio
    resinRatioResult.textContent = `${ratio.toFixed(1)}:1`;

    // Coverage info (optional)
    coverageInfoElement.textContent = '';

    // Update thumbnail & print summary
    updateThumbnail();
    updatePrintSummary();
  }

  // Reset results
  function resetResults() {
    clothWeightResult.textContent = '—';
    resinVolumeResult.textContent = '—';
    resinWeightResult.textContent = '—';
    resinRatioResult.textContent = '—';
    coverageInfoElement.textContent = '';
  }

  // Update print-only summary & QR
  function updatePrintSummary() {
    printUrlSpan.textContent           = window.location.href;
    printUnitSystemSpan.textContent    = unitSystemSelect.selectedOptions[0].text;
    printMaterialTypeSpan.textContent  = materialTypeSelect.selectedOptions[0].text;
    printClothTypeSpan.textContent     = clothTypeSelect.selectedOptions[0].text;
    printResinTypeSpan.textContent     = resinTypeSelect.selectedOptions[0].text;
    printSurfaceAreaSpan.textContent   = surfaceAreaInput.value;
    printAreaUnitSpan.textContent      = areaUnitSelect.value;
    printQrImage.src = 
      `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.href)}`;
  }

  // Print button handler
  printButton.addEventListener('click', () => {
    updatePrintSummary();
    window.print();
  });

  // Event listeners
  unitSystemSelect.addEventListener('change', () => {
    updateAreaUnits();
    updateResultUnits();
    updateClothTypes();
    calculate();
  });
  materialTypeSelect.addEventListener('change', () => { updateClothTypes(); calculate(); });
  clothTypeSelect.addEventListener('change', calculate);
  resinTypeSelect.addEventListener('change', calculate);
  surfaceAreaInput.addEventListener('input', calculate);
  areaUnitSelect.addEventListener('change', calculate);
  volumeResultUnitSelect.addEventListener('change', calculate);
  weightResultUnitSelect.addEventListener('change', calculate);

  // Initial setup
  updateAreaUnits();
  updateResultUnits();
  updateClothTypes();
  calculate();
});
