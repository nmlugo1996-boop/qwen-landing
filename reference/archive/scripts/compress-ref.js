// scripts/compress-ref.js
// node scripts/compress-ref.js path/to/original.md path/to/output.compact.md 3000
const fs = require('fs');
const path = require('path');

function compactBlockLines(linesArr) {
  const txt = linesArr.join("\n");
  let s = txt.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/\|(.+?)\|\s*\n\|[-:\s|]+?\|\s*\n((\|.*\|\s*\n?)+)/g, (m, hdrs, rows) => {
    const headerCols = hdrs.split("|").map(x => x.trim()).filter(Boolean);
    const firstRow = rows.split("\n").find(r => /\|/.test(r));
    const values = (firstRow || "").split("|").map(x => x.trim()).filter(Boolean);
    const pairs = headerCols.map((h, i) => `${h}: ${values[i] || "—"}`).slice(0, 6);
    return pairs.join("; ");
  });
  s = s.replace(/(^\s*[-*+]\s.*(\n\s*[-*+]\s.*){3,})/gm, (m) => {
    const items = m.trim().split(/\n/).map(l => l.replace(/^\s*[-*+]\s*/, ""));
    return items.slice(0, 3).map(i => "- " + i).join("\n") + "\n- ...";
  });
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  s = s.replace(/[^\S\n]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  s = s.replace(/([^\n]{400,})/g, (m) => m.slice(0, 380).trim() + "…");
  return s;
}

function extractRelevant(text, includeKeys = [], maxChars = 3000) {
  if (!text) return "";
  const blocks = {};
  let currentKey = "__start__";
  blocks[currentKey] = [];
  const lines = String(text).split(/\r?\n/);
  for (let line of lines) {
    const h = line.match(/^\s{0,3}#{1,4}\s*(.+)$/);
    if (h) {
      currentKey = h[1].trim();
      if (!blocks[currentKey]) blocks[currentKey] = [];
      continue;
    }
    blocks[currentKey].push(line);
  }

  const outParts = [];
  if (blocks["__start__"] && blocks["__start__"].length) {
    const head = compactBlockLines(blocks["__start__"]);
    if (head) outParts.push(head);
  }

  for (const key of includeKeys) {
    if (blocks[key]) {
      const c = compactBlockLines(blocks[key]);
      if (c) outParts.push(`== ${key} ==\n${c}`);
    }
    if (outParts.join("\n\n").length > maxChars * 0.9) break;
  }

  if (outParts.join("\n\n").length < maxChars) {
    const otherKeys = Object.keys(blocks).filter(k => k !== "__start__'".replace("'", "") && !includeKeys.includes(k));
    for (const k of otherKeys) {
      const c = compactBlockLines(blocks[k]);
      if (!c) continue;
      outParts.push(`== ${k} ==\n${c}`);
      if (outParts.join("\n\n").length > maxChars * 0.98) break;
    }
  }

  let result = outParts.join("\n\n").trim();
  if (result.length > maxChars) {
    const cut = result.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    result = cut.slice(0, Math.max(0, lastSpace)) + " …";
  }
  return result;
}

// CLI
(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node scripts/compress-ref.js input.md output.compact.md [maxChars]");
    process.exit(1);
  }
  const input = args[0];
  const output = args[1];
  const maxChars = parseInt(args[2] || "3000", 10);

  const includeKeys = [
    "Когнитивный блок", "Сенсорный блок", "Брендинговый блок", "Маркетинговый блок",
    "Когнитивный блок", "Сенсорный блок", "Когнитивный блок"
  ]; // можно расширить/поменять

  const raw = fs.readFileSync(input, 'utf8');
  const compact = extractRelevant(raw, includeKeys, maxChars);
  fs.writeFileSync(output, compact, 'utf8');
  console.log("Wrote", output, "chars:", compact.length);
})();