// Downloads every upstream source into scripts/map/.cache (git-ignored).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GEOJSON, GEONAMES, geonamesUrl } from "./sources.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, ".cache");
fs.mkdirSync(CACHE, { recursive: true });

const download = async (url, file) => {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    console.log("cached ", path.basename(file));
    return;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  console.log("fetched", path.basename(file), fs.statSync(file).size);
};

for (const [name, url] of Object.entries(GEOJSON)) {
  await download(url, path.join(CACHE, `${name}.json`));
}

for (const code of GEONAMES) {
  const zip = path.join(CACHE, `${code}.zip`);
  await download(geonamesUrl(code), zip);
  const txt = path.join(CACHE, `${code}.txt`);
  if (!fs.existsSync(txt)) {
    execFileSync("unzip", ["-o", "-q", zip, `${code}.txt`, "-d", CACHE]);
    console.log("unzipped", `${code}.txt`, fs.statSync(txt).size);
  }
}

console.log("\nsources ready in", CACHE);
