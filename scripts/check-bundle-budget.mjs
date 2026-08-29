import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const assetsDir = path.resolve("dist/public/assets");
const maxLargestJsBytes = 500 * 1024;
const maxTotalGzipBytes = 950 * 1024;

const entries = await readdir(assetsDir, { withFileTypes: true });
const jsFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith(".js"));
if (jsFiles.length === 0) throw new Error("No JavaScript build assets found; run pnpm build first.");

const sizes = await Promise.all(jsFiles.map(async entry => {
  const filePath = path.join(assetsDir, entry.name);
  const bytes = (await stat(filePath)).size;
  return { name: entry.name, bytes, gzipBytes: gzipSync(await readFile(filePath)).byteLength };
}));
const largest = sizes.reduce((max, item) => item.bytes > max.bytes ? item : max);
const totalGzipBytes = sizes.reduce((total, item) => total + item.gzipBytes, 0);
console.log(`Bundle budget: largest=${largest.name} ${(largest.bytes / 1024).toFixed(1)} KiB, total gzip=${(totalGzipBytes / 1024).toFixed(1)} KiB`);
if (largest.bytes > maxLargestJsBytes) throw new Error(`Largest JavaScript asset exceeds ${(maxLargestJsBytes / 1024).toFixed(0)} KiB.`);
if (totalGzipBytes > maxTotalGzipBytes) throw new Error(`Total JavaScript gzip assets exceed ${(maxTotalGzipBytes / 1024).toFixed(0)} KiB.`);
