#!/usr/bin/env node

// Full reconcile: bring local doc/en + Pinecone vectors into exact agreement with origin/en.
//
// Diffs three sets:
//   ONLY-LOCAL  → present locally, deleted on en  → remove file + clean Pinecone
//   DIFFERS     → present both, content differs   → overwrite + reindex
//   ONLY-EN     → present on en, missing locally  → fetch + index
//
// After --apply, writes .sync-state.json so incremental sync can resume from this SHA.
//
// Usage:
//   node scripts/reconcile-from-en.js            # dry-run
//   node scripts/reconcile-from-en.js --apply    # actually mutate

const fs = require("fs").promises;
const path = require("path");
const simpleGit = require("simple-git");
const GitBookRAGSyncer = require("./sync.js");
require("dotenv").config();

const APPLY = process.argv.includes("--apply");
const BRANCH = "en";
const DOC_ROOT = `doc/${BRANCH}`;
const STATE_FILE = ".sync-state.json";

async function walkMd(root) {
  const out = [];
  async function rec(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await rec(full);
      else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(path.relative(root, full));
      }
    }
  }
  await rec(root);
  return out;
}

async function pruneEmptyDirs(root) {
  let removed = 0;
  async function rec(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) await rec(path.join(dir, e.name));
    }
    try {
      const after = await fs.readdir(dir);
      if (after.length === 0 && dir !== root) {
        await fs.rmdir(dir);
        removed++;
      }
    } catch {}
  }
  await rec(root);
  return removed;
}

function printList(label, items, max = 10) {
  console.log(`\n${label}: ${items.length}`);
  for (const f of items.slice(0, max)) console.log(`  ${f}`);
  if (items.length > max) console.log(`  ... and ${items.length - max} more`);
}

async function main() {
  const syncer = new GitBookRAGSyncer();
  await syncer.initializePinecone();
  if (APPLY) await syncer.initializeEmbedder();

  const git = simpleGit();
  console.log(`Fetching origin/${BRANCH}...`);
  await git.fetch("origin", BRANCH);
  const enSha = (await git.revparse([`origin/${BRANCH}`])).trim();
  console.log(`origin/${BRANCH} = ${enSha}\n`);

  const localFiles = await walkMd(DOC_ROOT);
  const enListRaw = await git.raw([
    "ls-tree",
    "-r",
    `origin/${BRANCH}`,
    "--name-only",
  ]);
  const enFiles = enListRaw
    .split("\n")
    .filter((l) => l.endsWith(".md"))
    .map((l) => l.trim());

  const localSet = new Set(localFiles);
  const enSet = new Set(enFiles);

  const onlyLocal = localFiles.filter((f) => !enSet.has(f)).sort();
  const onlyEn = enFiles.filter((f) => !localSet.has(f)).sort();
  const candidates = localFiles.filter((f) => enSet.has(f));

  console.log(`Local md files:  ${localFiles.length}`);
  console.log(`en md files:     ${enFiles.length}`);
  console.log(`Diffing ${candidates.length} shared files for content...`);

  const differs = [];
  for (const f of candidates) {
    const enContent = await git.show([`origin/${BRANCH}:${f}`]);
    const localContent = await fs.readFile(path.join(DOC_ROOT, f), "utf8");
    if (enContent !== localContent) differs.push(f);
  }
  differs.sort();

  printList("ONLY-LOCAL (delete)", onlyLocal);
  printList("DIFFERS (rewrite + reindex)", differs);
  printList("ONLY-EN (fetch + index)", onlyEn);

  const totalMutations = onlyLocal.length + differs.length + onlyEn.length;
  console.log(`\nTotal mutations: ${totalMutations}`);

  if (!APPLY) {
    console.log(`\nDry-run done. Re-run with --apply to execute.`);
    return;
  }
  if (totalMutations === 0) {
    console.log(`\nAlready in sync. Writing state file only.`);
    await writeState(enSha);
    return;
  }

  console.log(`\n--- APPLYING ---`);

  for (const f of onlyLocal) {
    console.log(`DELETE  ${f}`);
    await syncer.cleanupFileVectors(f);
    try {
      await fs.unlink(path.join(DOC_ROOT, f));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }

  if (onlyLocal.length) {
    const pruned = await pruneEmptyDirs(DOC_ROOT);
    if (pruned) console.log(`Pruned ${pruned} empty directories`);
  }

  for (const f of differs) {
    console.log(`REWRITE ${f}`);
    await syncer.syncFile(f, BRANCH);
  }

  for (const f of onlyEn) {
    console.log(`ADD     ${f}`);
    await syncer.syncFile(f, BRANCH);
  }

  await writeState(enSha);
  console.log(`\nDone. State written to ${STATE_FILE}.`);
}

async function writeState(sha) {
  const payload = {
    branch: BRANCH,
    lastSyncedSha: sha,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(STATE_FILE, JSON.stringify(payload, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
