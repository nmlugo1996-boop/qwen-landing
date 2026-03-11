const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "polar-star-passports/passport_schema.json"), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const files = [
  { label: "quick_fix_good_passport", path: path.join(__dirname, "quick_fix/quick_fix_good_passport.json") },
  { label: "quick_fix_bad_passport",  path: path.join(__dirname, "quick_fix/quick_fix_bad_passport.json") }
];

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(f.path, "utf8"));
  const ok = validate(data);
  const errors = validate.errors || [];
  const result = { file: f.label, valid: ok, error_count: errors.length, errors };
  fs.writeFileSync(path.join(__dirname, `json_validation_${f.label}.json`), JSON.stringify(result, null, 2));
  console.log(`${f.label}: ${ok ? "VALID ✓" : "INVALID ✗"} (${errors.length} errors)`);
  if (!ok) errors.forEach(e => console.log("  -", e.instancePath || "/", e.message));
});
