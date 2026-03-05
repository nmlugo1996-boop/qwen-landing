const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");
// __dirname = polar-star-passports/output/20260305_204452 — repo root is 3 levels up
const root = path.resolve(__dirname, "../../..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "polar-star-passports/passport_schema.json"), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const files = [
  "polar-star-passports/examples/good_passport.json",
  "polar-star-passports/examples/bad_passport.json"
];
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
  const ok = validate(data);
  const errors = validate.errors || [];
  const result = { file: f, valid: ok, error_count: errors.length, errors };
  const name = path.basename(f, ".json");
  fs.writeFileSync(path.join(__dirname, `json_validation_${name}.json`), JSON.stringify(result, null, 2));
  console.log(name + ": " + (ok ? "VALID" : "INVALID") + " (" + errors.length + " errors)");
  if (!ok) errors.slice(0, 8).forEach(e => console.log("  -", e.instancePath || "/", e.message));
});
