// scripts/checkDocx.js
import unzipper from "unzipper";
import fs from "fs";

async function check(file) {
  if (!fs.existsSync(file)) {
    console.error("File not found:", file); process.exit(2);
  }
  const dir = await unzipper.Open.file(file);
  const names = dir.files.map(f => f.path);
  if (!names.includes("[Content_Types].xml") || !names.includes("word/document.xml")) {
    console.error("DOCX validation failed: missing required parts", names.slice(0, 20));
    process.exit(3);
  }
  console.log("DOCX validation OK");
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/checkDocx.js <file>");
  process.exit(2);
}
check(file).catch(err => { console.error(err); process.exit(4); });
