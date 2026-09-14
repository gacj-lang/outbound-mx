#!/usr/bin/env node
// Arma crm-rules.json: las Reglas de CRM y Ventas de Odoo México que consultan Ninja IA
// (herramienta consultar_reglas_crm) y el Banco de Información (categoría "Reglas de CRM").
//
// Fuente oficial: https://docs.google.com/document/d/1hD0eI6A7WWH9XQWx7BInpER6J9fSQZnTvSLBkPzGeuo/edit
// La captura sale de scripts/crm-rules-extract.js, ejecutado en la vista /mobilebasic del documento.
//
// Uso:
//   node scripts/build-crm-rules.js --check captura.json
//        No escribe nada. Compara huellas contra crm-rules.json e imprime qué cambió y qué textos
//        faltan. Sale con 0 si no hay cambios y con 3 si los hay.
//   node scripts/build-crm-rules.js captura.json
//        Aplica la captura: reusa el texto de las secciones que no cambiaron, exige el texto de las
//        nuevas o modificadas, anota el historial y sella la fecha de revisión.
//
// Lo que NO toca nunca: el bloque "outbound" (excepciones de Outbound y notas por sección). Ese se
// mantiene a mano porque no sale del documento de DS, sale de Odoo Knowledge / OUTBOUND-MX.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'crm-rules.json');

// Idénticas a las de scripts/crm-rules-extract.js (ver la nota de ese archivo).
const limpiar = t => String(t || '').replace(/​/g, '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
const palabras = t => (String(t || '').normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
const huella = t => {
  const s = palabras(t).join(' '); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
};

// A quién aplica cada sección. Outbound se rige por las reglas de DS, así que "si" = regla general,
// de finanzas o que involucra a DS; "referencia" = regla de otro equipo que solo le importa a Outbound
// cuando le pasan o pasa un lead. Se calcula aquí (y no a mano) para que una sección nueva del
// documento quede clasificada sola en la revisión mensual.
function clasificar(s) {
  const equipos = [...new Set([...s.texto.matchAll(/\[(DS|AM|PR|MMC|CST|CSTD|CSTI|GROWTH)\]/g)].map(m => m[1]))];
  const general = s.id === 'objetivo-y-alcance' || /para todos los equipos|finanzas|índice de equipo/i.test(s.grupo);
  const ds = equipos.includes('DS') || /ventas directas|direct sales/i.test(s.titulo + ' ' + s.grupo);
  return { equipos, aplicaOutbound: general || ds ? 'si' : 'referencia', mencionaOutbound: /outbound/i.test(s.texto) };
}

function main() {
  const args = process.argv.slice(2);
  const soloCheck = args.includes('--check');
  const archivo = args.find(a => !a.startsWith('--'));
  if (!archivo) { console.error('Falta el archivo de captura. Uso: node scripts/build-crm-rules.js [--check] captura.json'); process.exit(1); }

  const captura = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!Array.isArray(captura.secciones) || !captura.secciones.length) {
    console.error('✗ La captura no trae secciones. ¿Se ejecutó el extractor en /mobilebasic con sesión iniciada?'); process.exit(1);
  }
  const actual = fs.existsSync(DESTINO) ? JSON.parse(fs.readFileSync(DESTINO, 'utf8')) : {};
  const previas = new Map((actual.secciones || []).map(s => [s.id, s]));

  const nuevas = [], modificadas = [], faltanTextos = [], errores = [];
  const secciones = captura.secciones.map(c => {
    const previa = previas.get(c.id);
    let texto = c.texto != null ? limpiar(c.texto) : null;
    const titulo = limpiar(c.titulo);
    const h = texto != null ? huella(titulo + '\n' + texto) : c.huella;
    if (texto != null && c.huella && c.huella !== h) {
      errores.push(`${c.id}: la huella del navegador (${c.huella}) no coincide con la calculada aquí (${h}) — limpiar()/huella() se desalinearon entre los dos scripts`);
    }
    if (!previa) nuevas.push(c.id);
    else if (previa.huella !== h) modificadas.push(c.id);
    if (texto == null) {
      if (previa && previa.huella === h) texto = previa.texto;
      else faltanTextos.push(c.id);
    }
    return { id: c.id, grupo: limpiar(c.grupo), titulo, huella: h, imagenes: c.imagenes || 0, texto };
  });
  const idsCaptura = new Set(secciones.map(s => s.id));
  const eliminadas = [...previas.keys()].filter(id => !idsCaptura.has(id));
  const hayCambios = nuevas.length + modificadas.length + eliminadas.length > 0;

  if (soloCheck) {
    console.log(JSON.stringify({ hayCambios, nuevas, modificadas, eliminadas, textosQueHayQuePedir: [...nuevas, ...modificadas], errores }, null, 2));
    process.exit(errores.length ? 1 : hayCambios ? 3 : 0);
  }
  if (errores.length) { errores.forEach(e => console.error('✗ ' + e)); process.exit(1); }
  if (faltanTextos.length) {
    console.error('✗ Faltan los textos de estas secciones (nuevas o modificadas). Vuelve a capturar con extraerReglasCRM({texto:' + JSON.stringify(faltanTextos) + '}):');
    faltanTextos.forEach(id => console.error('  · ' + id));
    process.exit(1);
  }
  if (!actual.outbound) { console.error('✗ crm-rules.json no tiene el bloque "outbound". Ese bloque se escribe a mano; no lo inventes aquí.'); process.exit(1); }

  const fecha = (captura.fuente?.capturadoEn || new Date().toISOString()).slice(0, 10);
  const titulos = ids => ids.map(id => (secciones.find(s => s.id === id) || previas.get(id)).titulo);
  const historial = actual.historial || [];
  if (hayCambios) historial.unshift({ fecha, nuevas: titulos(nuevas), modificadas: titulos(modificadas), eliminadas: titulos(eliminadas) });

  const salida = {
    fuente: {
      titulo: captura.fuente?.titulo || actual.fuente?.titulo || 'CRM & Sales Rules - Odoo Mexico',
      url: captura.fuente?.url || actual.fuente?.url,
      revisadoEn: fecha,
      actualizadoEn: hayCambios ? fecha : (actual.fuente?.actualizadoEn || fecha),
    },
    outbound: actual.outbound,
    secciones: secciones.map(s => ({ ...s, ...clasificar(s) })),
    historial,
  };
  fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 1) + '\n');
  console.log(`✓ crm-rules.json · ${secciones.length} secciones · revisado ${fecha}` +
    (hayCambios ? ` · ${nuevas.length} nuevas, ${modificadas.length} modificadas, ${eliminadas.length} eliminadas` : ' · sin cambios'));
}

main();
