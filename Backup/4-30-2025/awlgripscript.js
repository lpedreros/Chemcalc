/* awlgripscript.js – area-aware result-unit selector & mL (cc) label */
document.addEventListener('DOMContentLoaded', () => {
  /* unit sets */
  const unitsFor = {
    imperial: ['squareFootage','gallons','quarts','ounces'],
    metric:   ['squareMeters','liters','ccs']
  };
  const labels = {
    squareFootage:'ft²', squareMeters:'m²',
    gallons:'Gallons', quarts:'Quarts', ounces:'Ounces',
    liters:'Liters',  ccs:'mL (cc)'
  };

  /* coverage ft²/gal + coats */
  const cov = {
    awlgrip:{spray:{c:542.9,k:3},roll:{c:814.8,k:2}},
    awlcraft2000:{spray:{c:725.2,k:3}},
    '545primer':{spray:{c:317.8,k:2},roll:{c:635.6,k:2}}
  };

  /* DOM */
  const sys=document.getElementById('unitSystem');
  const inU=document.getElementById('unitType');
  const resRow=document.getElementById('resultUnitRow');
  const resU=document.getElementById('resultUnit');
  const method=document.getElementById('methodType');
  const paint=document.getElementById('paintType');
  const val=document.getElementById('inputValue');
  const outP=document.getElementById('resultPaint');
  const outC=document.getElementById('resultConverter');
  const outR=document.getElementById('resultReducer');
  const outCov=document.getElementById('resultCoverage');

  /* conversions */
  const cv={
    squareFootage:{ccs:1}, squareMeters:{ccs:1},
    gallons:{liters:3.78541,quarts:4,ounces:128,ccs:3785.41},
    liters:{gallons:0.264172,quarts:1.05669,ounces:33.814,ccs:1000},
    quarts:{gallons:0.25,liters:0.946353,ounces:32,ccs:946.353},
    ounces:{gallons:0.0078125,liters:0.0295735,quarts:0.03125,ccs:29.5735},
    ccs:{gallons:0.000264172,liters:0.001,quarts:0.00105669,ounces:0.033814}
  };
  const convert=(v,f,t)=>{const n=+v;if(isNaN(n))return null;if(f===t)return n;const r=(cv[f]||{})[t];return r?n*r:null;};

  /* ratios */
  const ratios=(p,m)=>{
    switch(p){
      case'545primer':return{conv:1,red:m==='spray'?0.25:0.15};
      case'awlgrip':return{conv:m==='spray'?1:0.5,red:m==='spray'?0.25:0.2};
      case'awlcraft2000':return{conv:0.5,red:0.33};
      default:return{conv:0,red:0};
    }
  };

  /* populate dropdowns */
  function populateLists(){
    /* input list */
    inU.innerHTML='';
    unitsFor[sys.value].forEach(u=>inU.add(new Option(labels[u],u)));

    /* result list = volume units only */
    const volUnits = sys.value==='imperial'?['gallons','quarts','ounces']:['liters','ccs'];
    resU.innerHTML='';
    volUnits.forEach(u=>resU.add(new Option(labels[u],u)));
  }

  /* show/hide result-unit row */
  function toggleResRow(){
    const isArea=['squareFootage','squareMeters'].includes(inU.value);
    resRow.classList.toggle('d-none',!isArea);
  }

  /* calc */
  function calc(){
    toggleResRow();
    paint.querySelector('[value=\"awlcraft2000\"]').disabled=(method.value==='roll');

    if(!val.value){reset();return;}
    const inUnit=inU.value, sysType=sys.value;
    const isArea=['squareFootage','squareMeters'].includes(inUnit);

    /* volume in cc */
    let cc;
    if(isArea){
      const ci=(cov[paint.value]||{})[method.value];
      if(!ci){reset('—');return;}
      const areaFt2=inUnit==='squareFootage'?+val.value:+val.value*10.7639;
      const gallons=(areaFt2/ci.c)*ci.k;
      cc=gallons*3785.41;
    }else{
      cc=convert(val.value,inUnit,'ccs');
    }
    if(cc===null){reset('Err');return;}

    /* mix */
    const {conv,red}=ratios(paint.value,method.value);
    const convCC=cc*conv, redCC=cc*red;

    /* output unit */
    const outUnit=isArea?resU.value:inUnit;
    const pVol=convert(cc,'ccs',outUnit)?.toFixed(2)??'Err';
    const cVol=convert(convCC,'ccs',outUnit)?.toFixed(2)??'Err';
    const rVol=convert(redCC,'ccs',outUnit)?.toFixed(2)??'Err';

    outP.textContent=`Paint: ${pVol} ${labels[outUnit]}`;
    outC.textContent=`Catalyst / Activator: ${cVol} ${labels[outUnit]}`;
    outR.textContent=`Reducer: ${rVol} ${labels[outUnit]}`;

    if(cov[paint.value]&&cov[paint.value][method.value]){
      const d=cov[paint.value][method.value];
      const covStr=sysType==='imperial'
        ? `${d.c.toFixed(0)} ft²/gal`
        : `${(d.c/10.7639).toFixed(0)} m²/L`;
      outCov.textContent=`Coverage: ${covStr} • Recommended coats: ${d.k}`;
    }else outCov.textContent='';
  }

  const reset=(msg='—')=>{
    outP.textContent=`Paint: ${msg}`;
    outC.textContent=`Catalyst / Activator: ${msg}`;
    outR.textContent=`Reducer: ${msg}`;
    outCov.textContent='';
  };

  /* listeners */
  sys.addEventListener('change',()=>{populateLists();calc();});
  inU.addEventListener('change',calc);
  resU.addEventListener('change',calc);
  method.addEventListener('change',calc);
  paint.addEventListener('change',calc);
  val.addEventListener('input',calc);

  populateLists();calc();
});
