// lib/passportDocx.js
// Safe helper implementation: if you have real generator logic, replace draftToDocxBinary.
// This file will not be created if a real lib/passportDocx.js already exists.
import JSZip from "jszip";

/**
 * Build a minimal valid docx (in-memory) as Uint8Array using jszip.
 * Contains: [Content_Types].xml, _rels/.rels, word/document.xml
 */
export async function buildMinimalTestDocx() {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  // _rels/.rels
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // word/document.xml (very minimal docx body)
  zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Test DOCX</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`);

  const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return content; // Buffer
}

/**
 * Default draftToDocxBinary implementation — for production you will replace
 * with real generation code. This helper delegates to buildMinimalTestDocx,
 * so server route works out of the box for smoke-tests.
 */
export async function draftToDocxBinary(draft) {
  // If a real generator exists, it should override this module.
  // For now we return a minimal valid docx.
  return await buildMinimalTestDocx();
}
