// mekp-curve.js
//
// Single source of truth for "recommended MEKP % by ambient temperature
// (Celsius)" -- shared by the MEKP calculator (mekscript.js) and
// ClothCalc's polyester/vinylester catalyst estimate (clothcalc.js).
//
// Added 2026-09-09 per an approved curve-consolidation decision: neither
// of ChemCalc's two previously-separate curves was more "correct" than
// the other (no MEKP/resin manufacturer publishes a temperature-dosage
// table this granular), so rather than picking a winner, both pages now
// read from one place. Breakpoints are the MEKP calculator's original
// ones (mekscript.js, pre-2026-09-09) -- unchanged values, just no
// longer duplicated.
//
// Load this file before mekscript.js and/or clothcalc.js on any page
// that uses either calculator.
function getRecommendedMekpPercent(tempC) {
  if (typeof tempC !== "number" || isNaN(tempC)) return null;
  if (tempC >= 29.4) return 1.0;
  if (tempC >= 23.9) return 1.5;
  if (tempC >= 18.3) return 2.0;
  if (tempC >= 15.6) return 2.5;
  return 3.0; // Caution: cold-cure band (below 60°F/15.6°C)
}
