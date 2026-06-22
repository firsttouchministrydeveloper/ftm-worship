import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });

const blue = { r: 59, g: 130, b: 246, alpha: 1 };

for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["maskable-512", 512]]) {
  await sharp({ create: { width: size, height: size, channels: 4, background: blue } })
    .png()
    .toFile(`public/icons/${name}.png`);
}

console.log("Icons generated.");
