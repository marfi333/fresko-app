// One-shot favicon generator using @realfavicongenerator/generate-favicon.
// Reads scripts/icon-source.svg, writes icons to public/.

import { Buffer } from "node:buffer";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateFaviconFiles,
  generateFaviconHtml,
  initFaviconIconSettings,
} from "@realfavicongenerator/generate-favicon";
import { getNodeImageAdapter, loadAndConvertToSvg } from "@realfavicongenerator/image-adapter-node";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const sourceSvg = join(here, "icon-source.svg");
const outDir = join(repoRoot, "public");

await mkdir(outDir, { recursive: true });

const imageAdapter = await getNodeImageAdapter();
const svgIcon = await loadAndConvertToSvg(sourceSvg);
const masterIcon = { icon: svgIcon };

const TERRACOTTA = "#ab5637";
const CREAM = "#faf8f5";

const settings = initFaviconIconSettings();
settings.touch.appTitle = "Fresko";
settings.webAppManifest.name = "Fresko";
settings.webAppManifest.shortName = "Fresko";
settings.webAppManifest.backgroundColor = CREAM;
settings.webAppManifest.themeColor = TERRACOTTA;

const faviconSettings = {
  icon: settings,
  path: "/",
};

const files = await generateFaviconFiles(masterIcon, faviconSettings, imageAdapter);
const html = generateFaviconHtml(faviconSettings);

for (const [name, content] of Object.entries(files)) {
  const dest = join(outDir, name);
  await mkdir(dirname(dest), { recursive: true });
  const buf =
    typeof content === "string"
      ? Buffer.from(content, "utf8")
      : Buffer.isBuffer(content)
        ? content
        : Buffer.from(await content.arrayBuffer());
  await writeFile(dest, buf);
  console.log("wrote", name, "(", buf.length, "bytes )");
}

await writeFile(join(here, "favicon-html-snippet.html"), html.markups.join("\n") + "\n");
console.log("\nGenerated", Object.keys(files).length, "files in", outDir);
console.log("HTML markup snippet ->", "scripts/favicon-html-snippet.html");
