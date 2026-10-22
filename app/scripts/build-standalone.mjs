/**
 * Construit un fichier HTML unique (CSS et JS integres), utilisable sans
 * serveur : previsualisation, partage, ou ouverture depuis le disque.
 * Usage : node scripts/build-standalone.mjs [dossier-de-sortie]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] ?? 'dist-standalone';

execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_PWA: 'false', VITE_ROUTER: 'hash', VITE_BASE: './' },
});

const html = readFileSync(join(outDir, 'index.html'), 'utf8');
const css = html.match(/href="\.\/(assets\/[^"]+\.css)"/)?.[1];
const js = html.match(/src="\.\/(assets\/[^"]+\.js)"/)?.[1];
if (!css || !js) throw new Error('Feuille de style ou script introuvable dans index.html');

const style = readFileSync(join(outDir, css), 'utf8');
// Evite de fermer la balise <script> depuis l'interieur du code.
const script = readFileSync(join(outDir, js), 'utf8').replace(/<\/script/g, '<\\/script');

const page = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#174eac" />
<title>Nederlands – apprendre le néerlandais</title>
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;

writeFileSync(join(outDir, 'index.html'), page);
rmSync(join(outDir, 'assets'), { recursive: true, force: true });
console.log(`Fichier unique : ${join(outDir, 'index.html')} (${Math.round(page.length / 1024)} Ko)`);
