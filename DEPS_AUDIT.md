# Dependency Audit — Required Major Upgrades

Generated: 2026-03-05 | Branch: fix/deps-audit

## Summary

`npm audit fix` (without `--force`) left **7 vulnerabilities** (6 high, 1 critical).
All remaining fixes require either a **patch bump outside the stated range** or a **major version change**.

Per project policy: these upgrades are NOT applied automatically.

---

## 1. next@14.2.3 → 14.2.35 (patch, same major — RECOMMENDED)

**Severity:** Critical + High  
**CVEs:** GHSA-gp8f-8m3g-qvj9, GHSA-g77x-44xx-532m, GHSA-7m27-7ghc-44w9,  
GHSA-3h52-269p-cp9r, GHSA-g5qg-72qw-gw5v, GHSA-7gfc-8cq8-jh5f,  
GHSA-4342-x723-ch2f, GHSA-xv57-4mr9-wg8v, GHSA-qpjv-v59x-3qc4,  
GHSA-mwv6-3258-q52c, GHSA-5j59-xgg2-r9c4, GHSA-9g9p-9gw9-jx7f,  
GHSA-h25m-26qc-wcjf, GHSA-f82v-jwr5-mffw  

**Why it wasn't auto-applied:** package.json has the fixed version `"next": "14.2.3"` (no `^`),  
so `npm audit fix --force` would be required to update it.

**Risk:** Low — 14.2.3 → 14.2.35 is a patch release within the same major version.  
No breaking changes expected.

**How to apply:**
```bash
npm install next@14.2.35
# Then test: npm run dev && npm run build
```

---

## 2. eslint-config-next@14.x → 16.x (MAJOR — review before applying)

**Severity:** High  
**CVE:** GHSA-5j98-mcp5-4vw2 (glob CLI command injection)  
**Via:** `@next/eslint-plugin-next` → `glob@10.2.0–10.4.5`

**Why it wasn't auto-applied:** `npm audit fix --force` would install `eslint-config-next@16.1.6`,  
which is a **breaking major version change** (from 14.x used with Next.js 14).

**Risk:** Medium-High — ESLint config major version jumps often require `.eslintrc` changes  
and may require Next.js 15+ to match. Review the eslint-config-next changelog before applying.

**How to apply (only after upgrading to Next.js 15+):**
```bash
npm install eslint-config-next@latest
# Review and update .eslintrc / eslint.config.js as needed
```

---

## 3. minimatch@9.0.0–9.0.6 (transitive via @typescript-eslint)

**Severity:** High  
**CVEs:** GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 (ReDoS)  
**Via:** `@typescript-eslint/typescript-estree` → `@typescript-eslint/parser`

**Why it wasn't auto-applied:** Transitive lock — `npm audit fix` reports "up to date".  
A direct `@typescript-eslint` upgrade may be needed.

**How to apply:**
```bash
npm install @typescript-eslint/parser@latest @typescript-eslint/typescript-estree@latest
# Verify ESLint still works: npm run lint
```

---

## Recommended action plan

1. Apply `next@14.2.35` immediately (low-risk patch)
2. Plan Next.js 15 upgrade in a separate sprint
3. After Next.js 15: upgrade `eslint-config-next` to match
4. Update `@typescript-eslint` packages to resolve minimatch ReDoS
