// =============================================================================
//  build-packs.mjs — Compila os compêndios LevelDB a partir das fontes JSON
// =============================================================================
//  Lê todos os pacotes declarados em module.json (campo "packs"), e para cada um
//  espera encontrar os arquivos-fonte em <path>/_source/*.json. Os arquivos são
//  compilados em um banco LevelDB no próprio diretório do pack, do jeito que
//  o FoundryVTT v13 espera.
// =============================================================================

import { readFile, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePack } from '@foundryvtt/foundryvtt-cli';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_JSON = join(ROOT, 'module.json');

const args = new Set(process.argv.slice(2));
const cleanOnly = args.has('--clean');

const LEVELDB_ARTIFACTS = new Set([
  'CURRENT', 'LOCK', 'LOG', 'LOG.old', 'MANIFEST'
]);

function isLevelDbArtifact(name) {
  if (LEVELDB_ARTIFACTS.has(name)) return true;
  if (name.startsWith('MANIFEST-')) return true;
  if (/\.(ldb|log|sst)$/i.test(name)) return true;
  return false;
}

async function cleanPackOutput(packDir) {
  if (!existsSync(packDir)) return;
  const entries = await readdir(packDir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    if (entry.name === '_source') return;
    if (!entry.isFile()) return;
    if (!isLevelDbArtifact(entry.name)) return;
    await rm(join(packDir, entry.name), { force: true });
  }));
}

async function main() {
  const moduleData = JSON.parse(await readFile(MODULE_JSON, 'utf8'));
  const packs = moduleData.packs ?? [];

  if (packs.length === 0) {
    console.log('No packs declared in module.json — nothing to do.');
    return;
  }

  for (const pack of packs) {
    const packDir = resolve(ROOT, pack.path);
    const sourceDir = join(packDir, '_source');

    if (!existsSync(sourceDir)) {
      console.warn(`! Skipping ${pack.name}: ${sourceDir} not found.`);
      continue;
    }

    await cleanPackOutput(packDir);
    if (cleanOnly) {
      console.log(`✓ Cleaned ${pack.name}`);
      continue;
    }

    const sourceStat = await stat(sourceDir);
    if (!sourceStat.isDirectory()) {
      console.warn(`! Skipping ${pack.name}: ${sourceDir} is not a directory.`);
      continue;
    }

    console.log(`> Building ${pack.name} from ${sourceDir}`);
    await compilePack(sourceDir, packDir, { recursive: true, log: false });
    console.log(`✓ Built ${pack.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
