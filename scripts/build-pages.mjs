import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.VITE_ATLAS_STATIC = "true";

const { build } = await import("vite");
await build({ base: "/projeto-atlas/" });

const catalog = JSON.parse(
  await readFile(path.join(projectRoot, "data/atlas/catalog.json"), "utf8"),
);
const research = JSON.parse(
  await readFile(path.join(projectRoot, "data/atlas/research.json"), "utf8"),
);
if (catalog.length !== 54 || Object.keys(research.pairs ?? {}).length !== 1431) {
  throw new Error("O snapshot do Atlas precisa conter exatamente 54 fichas e 1.431 pareceres.");
}

const publicDirectory = path.join(projectRoot, "dist/public");
const outputDirectory = path.join(publicDirectory, "atlas-static");
await mkdir(outputDirectory, { recursive: true });
const { pairs, ...metadata } = research;
await Promise.all([
  writeFile(path.join(outputDirectory, "catalog.json"), JSON.stringify(catalog)),
  writeFile(path.join(outputDirectory, "research-meta.json"), JSON.stringify(metadata)),
  writeFile(path.join(outputDirectory, "research-pairs.json"), JSON.stringify(pairs)),
  writeFile(path.join(publicDirectory, ".nojekyll"), ""),
]);
const image = await stat(path.join(outputDirectory, "fulcrum.jpeg"));
if (!image.isFile() || image.size === 0) {
  throw new Error("A imagem estática de The Fulcrum não foi incluída no artefato.");
}
console.log(`GitHub Pages pronto: ${catalog.length} fichas, ${Object.keys(pairs).length} pareceres e imagem do Fulcrum.`);
