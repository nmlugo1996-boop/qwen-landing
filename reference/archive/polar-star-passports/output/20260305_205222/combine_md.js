const fs = require("fs");
const path = require("path");
const base = fs.readFileSync(path.join(__dirname, "../../reference/meatcode.md"), "utf8");
const appendix = fs.readFileSync(path.join(__dirname, "quick_fix/meatcode_appendix.md"), "utf8");
const combined = base + "\n" + appendix;
fs.writeFileSync(path.join(__dirname, "quick_fix/meatcode_fixed.md"), combined, "utf8");
console.log("meatcode_fixed.md written, total chars:", combined.length);
