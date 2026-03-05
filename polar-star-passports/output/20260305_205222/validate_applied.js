const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "polar-star-passports/passport_schema.json"), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const files = [
  "polar-star-passports/examples/good_passport.json",
  "polar-star-passports/examples/bad_passport.json"
];
let allOk = true;
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
  const ok = validate(data);
  const errors = validate.errors || [];
  if (!ok) allOk = false;
  console.log(`${path.basename(f)}: ${ok ? "VALID ✓" : "INVALID ✗"} (${errors.length} errors)`);
  if (!ok) errors.forEach(e => console.log("  -", e.instancePath || "/", e.message));
});
process.exit(allOk ? 0 : 1);
