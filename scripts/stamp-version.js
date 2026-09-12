#!/usr/bin/env node
// Sella la versión publicada en UN solo paso.
//
// El problema que resuelve: había dos valores que TENÍAN que coincidir, se mantenían a mano y nada
// lo verificaba.
//   · <meta name="app-version"> en index.html → la versión con la que cargó la pestaña del AE
//   · version.json                            → lo que esa pestaña consulta cada 5 min para avisar
//                                               "hay una versión nueva"
//
// Los dos desajustes posibles ya pasaron los dos, y se ven distinto:
//   · version.json avanza y el meta no → el aviso sale PARA SIEMPRE y recargar no lo quita, porque
//     los dos archivos ya son los últimos, nada más no concuerdan entre ellos.
//   · el meta avanza y version.json no → nadie se entera de la actualización. Este era el caso
//     normal: 248 commits movieron index.html y solo 18 movieron version.json.
//
// Uso:
//   node scripts/stamp-version.js          → escribe la hora actual (UTC) en los dos lugares
//   node scripts/stamp-version.js --check  → no escribe nada; sale con error si no coinciden
//
// Correr SIEMPRE antes de commitear un cambio de index.html que el equipo deba ver.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const INDEX = path.join(RAIZ, 'index.html');
const VERSION = path.join(RAIZ, 'version.json');
const META_RE = /(<meta name="app-version" content=")([^"]*)(">)/;

const leerMeta = (html) => (html.match(META_RE) || [])[2] || null;
const leerVersionJson = () => {
  try { return JSON.parse(fs.readFileSync(VERSION, 'utf8')).v || null; } catch { return null; }
};

const html = fs.readFileSync(INDEX, 'utf8');
const meta = leerMeta(html);
if (meta === null) {
  console.error('✗ No encontré <meta name="app-version" content="..."> en index.html. Si se renombró, hay que actualizar este script Y el lector en checkForUpdate().');
  process.exit(1);
}

if (process.argv.includes('--check')) {
  const enJson = leerVersionJson();
  if (meta === enJson) {
    console.log(`✓ versión sellada y consistente: ${meta}`);
    process.exit(0);
  }
  console.error(`✗ DESAJUSTE — index.html dice "${meta}" y version.json dice "${enJson}".`);
  console.error('  Con este desajuste el aviso de "hay versión nueva" sale sin parar (o no sale nunca).');
  console.error('  Arréglalo con: node scripts/stamp-version.js');
  process.exit(1);
}

// Sin milisegundos: el valor se compara como cadena exacta y así es legible en el HTML.
const sello = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
fs.writeFileSync(INDEX, html.replace(META_RE, `$1${sello}$3`));
fs.writeFileSync(VERSION, `${JSON.stringify({ v: sello })}\n`);
console.log(`✓ sellado ${sello}`);
console.log('  index.html (meta app-version) y version.json quedaron iguales.');
console.log('  Recuerda que APP_BUILD_STAMP es aparte: ese es el texto que el AE lee en Configuración → Acerca de.');
