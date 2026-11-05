/* ============================================================
   Closed vocabulary for results text. Every word a calculator can print must be here. Change calculator wording => update this file and run tools/verify/send_results_vocab_check.mjs.

   A "word" is a maximal run of ASCII letters (A-Z, a-z), lower-cased: "Poly-urethane" is "poly" + "urethane", "C5051" is "c", "mL" is "ml".
   Digits are always allowed. handler.ts refuses results text with a word that is not in VOCAB, a character that is not a letter, a digit, a space or in
   ALLOWED_PUNCT, or a "." between two letters. Built from a replay of the five calculators (testing/ and the production root) plus the fragments
   listed in the check script; no imports (the file runs unchanged under Node and Deno).
   ============================================================ */

export const VOCAB: ReadonlySet<string> = new Set([
  // Words printed by more than one calculator: unit names and labels, product-line names, common result wording
  'a', 'accelerator', 'amount', 'and', 'application', 'base', 'brush', 'by', 'c', 'cc', 'clear', 'coat', 'coating', 'coats', 'converter',
  'coverage', 'cure', 'd', 'epoxy', 'f', 'factory', 'fl', 'ft', 'g', 'gal', 'gallons', 'hardener', 'l', 'line', 'liters', 'm', 'method',
  'ml', 'on', 'or', 'ounces', 'oz', 'paint', 'primer', 'product', 'qt', 'quarts', 'rate', 'recommended', 'reducer', 'resin', 'roll', 's',
  'slow', 'spray', 't', 'temperature', 'the', 'this', 'topcoat', 'use', 'volume', 'x',
  // MEKP calculator (mekscript.js result lines, mekpcalc-ui.js temperature advice sentences, recap in mekpcalc.html) only
  'above', 'already', 'ambient', 'as', 'away', 'based', 'before', 'behaves', 'below', 'can', 'catalyzed', 'caution', 'clock', 'custom',
  'doesn', 'don', 'drop', 'drops', 'duratec', 'enter', 'exactly', 'expect', 'fast', 'finished', 'gelcoat', 'halfway', 'here', 'in', 'is',
  'it', 'kick', 'locked', 'longer', 'mekp', 'mix', 'move', 'no', 'notices', 'only', 'override', 'percentage', 'promised', 'rarer', 'rush',
  'setting', 'shop', 'shows', 'slider', 'small', 'speeds', 'stirring', 'stops', 'temp', 'than', 'think', 'to', 'unhurried', 'up', 'used',
  'using', 've', 'walk', 'warm', 'what', 'which', 'you',
  // Awlgrip calculator (awlgripscript.js labels and product lines, recap in awlgrip.html) only
  'activator', 'awlcat', 'awlcraft', 'awlgrip', 'basecoat', 'brushing', 'catalyst', 'curing', 'grey', 'h', 'hdt', 'oc', 'pro', 'se',
  'solution', 'white',
  // Alexseal calculator (alexsealscript.js labels, recommended-coats text, recap in alexseal.html) only
  'added', 'cross', 'finish', 'not', 'premium', 'protective', 'replaced',
  // Epifanes calculator (epifanesScript.js labels and thinning advice, recap in epifanespoly.html) only
  'b', 'colour', 'component', 'depending', 'different', 'epifanes', 'for', 'from', 'note', 'of', 'poly', 'pu', 'recommends', 'see',
  'speedcoat', 'spraythinner', 'standard', 'substrate', 'tds', 'thin', 'thinner', 'thinning', 'urethane', 'version',
  // Fiberglass cloth calculator (clothcalc.js result lines, recap in clothcalc.html) only
  'centimeters', 'cost', 'dimensions', 'estimated', 'feet', 'generic', 'inches', 'kg', 'lbs', 'meters', 'needed', 'polyester', 'system',
  'total', 'type', 'vinylester', 'weight', 'west',
  // Branches the replay cannot reach (mekscript.js "Enter Temp" and low-temperature warning, alexsealscript.js / awlgripscript.js "Coverage info not available" and "Err")
  'available', 'be', 'consider', 'err', 'info', 'inhibited', 'materials', 'may', 'selection', 'significantly', 'slowed', 'warming',
  'warning', 'workspace',
]);

// Every character other than an ASCII letter, digit or space that the calculators print: / : %  ( ) . , ' - ! ; # $ < and the degree sign, superscript two,
// en dash, em dash and bullet (written as escapes). '<' is real: a tiny reducer amount prints "< 0.01 mL".
export const ALLOWED_PUNCT: string = "!#$%'(),-./:;<\u00b0\u00b2\u2013\u2014\u2022";
