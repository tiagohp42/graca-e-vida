// Monta a pasta public/ que a Vercel publica: só os arquivos do site, sem código do backend nem node_modules.
// Roda depois do `npm run build` (veja vercel.json).
import { cp, readdir, rm } from "node:fs/promises";

const FORA = new Set([
  "node_modules", "public", "backend", "src", "scripts", "apps-script",
  "package.json", "package-lock.json", "tsconfig.json", "neon.ts", "vercel.json", "LEIA-ME.md",
]);

await rm("public", { recursive: true, force: true });
const itens = (await readdir(".")).filter((n) => !n.startsWith(".") && !FORA.has(n));
for (const n of itens) await cp(n, `public/${n}`, { recursive: true });
console.log("public/:", itens.join(", "));
