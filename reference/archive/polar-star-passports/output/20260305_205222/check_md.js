const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../../..");

const required = [
  "\u041a\u0420\u0410\u0422\u041a\u0418\u0419 \u041f\u0410\u0421\u041f\u041e\u0420\u0422",
  "\u041a\u041e\u0413\u041d\u0418\u0422\u0418\u0412\u041d\u042b\u0419 \u0411\u041b\u041e\u041a",
  "\u0421\u0415\u041d\u0421\u041e\u0420\u041d\u042b\u0419 \u0411\u041b\u041e\u041a",
  "\u0411\u0420\u0415\u041d\u0414\u0418\u041d\u0413\u041e\u0412\u042b\u0419 \u0411\u041b\u041e\u041a",
  "\u041c\u0410\u0420\u041a\u0415\u0422\u0418\u041d\u0413\u041e\u0412\u042b\u0419 \u0411\u041b\u041e\u041a",
  "\u041f\u0420\u041e\u0418\u0417\u0412\u041e\u0414\u0421\u0422\u0412\u041e",
  "\u041a\u041e\u041c\u041c\u0415\u0420\u0426\u0418\u042f",
  "\u041f\u041b\u0410\u041d \u0412\u0410\u041b\u0418\u0414\u0410\u0426\u0418\u0418",
  "\u041f\u0420\u0418\u041b\u041e\u0416\u0415\u041d\u0418\u042f",
  "SIGN-OFF CHECKLIST"
];

const files = [
  { label: "meatcode_fixed.md", path: path.join(__dirname, "quick_fix/meatcode_fixed.md") }
];

const results = [];
files.forEach(f => {
  const content = fs.readFileSync(f.path, "utf8");
  const found = [], missing = [];
  required.forEach(s => (content.includes(s) ? found : missing).push(s));
  results.push({ file: f.label, found: found.length, total: required.length, found_list: found, missing_list: missing });
  console.log(`\n${f.label}: ${found.length}/${required.length} sections`);
  console.log("Found:", found.join(", "));
  if (missing.length) console.log("MISSING:", missing.join(", "));
  else console.log("ALL REQUIRED SECTIONS PRESENT \u2713");
});
fs.writeFileSync(path.join(__dirname, "md_check_meatcode_fixed.json"), JSON.stringify(results, null, 2));
