/* ═══════════════════════════════════════════════════════════════════════
   Generador de bases de industria y de deltas personalizados.

   Dos llamadas al modelo, muy distintas en frecuencia y en precio:

     BASE   una vez por industria, ~1,150 tokens de salida. La reusa todo el
            equipo desde brochureBases. Un brochure "genérico" no vuelve a
            llamar al modelo nunca.
     DELTA  por prospecto, ~700 tokens de salida. Solo reescribe la hoja de
            retos y el titular de portada con los dolores del discovery.

   El modelo NO escribe HTML ni elige nombres de archivo. Escribe contenido y
   ya: los layouts son código (render.js) y los assets salen del playbook.
   Eso es lo que hace la generación barata y, sobre todo, predecible.
   ═══════════════════════════════════════════════════════════════════════ */

const BR_REGLAS = `REGLAS DE ESCRITURA, sin excepción:
- Español de México, tuteo. Nunca voseo.
- Ortografía impecable: acentos, mayúsculas y puntuación.
- Máximo 40 palabras por hoja. Es formato presentación, no hoja carta.
- Los campos "tituloResalta" deben aparecer LITERALMENTE dentro de su "titulo"
  y medir de 1 a 3 palabras. Es un trazo de marcador: en frases largas no se
  estira parejo y en textos largos no se lee.
- No inventes cifras, porcentajes, plazos ni nombres de clientes. Si un dato no
  viene en el playbook, no va.
- No menciones competidores. Esos los escribe una persona.
- Tono directo, frases cortas. Nada de relleno corporativo ni metáforas.`;

/** Prompt para generar la base de una industria a partir de su playbook. */
function brPromptBase(playbook){
  const p = playbook;
  return `Eres consultor senior de Odoo México. Vas a escribir el contenido base de un
brochure para toda una industria — NO para una empresa en particular. Este texto lo
va a reusar todo el equipo comercial con distintos prospectos del mismo sector, así
que no puede nombrar a ninguna empresa ni suponer nada de un prospecto concreto.

INDUSTRIA: ${p.industria}
VOCABULARIO DEL SECTOR (úsalo, es como habla el cliente): ${(p.vocabulario||[]).join(', ')}
SUB-VERTICALES: ${(p.subverticales||[]).map(s=>s.nombre).join(' · ')}
RETOS YA IDENTIFICADOS: ${(p.retos||[]).map(r=>r.titulo).join(' · ')}
SISTEMAS DE LOS QUE SE MIGRA: ${(p.sistemasQueReemplaza||[]).join(', ')}

${BR_REGLAS}

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto alrededor:
{
  "portada": {
    "titulo": "frase corta que nombre el dolor de la industria, máx 6 palabras",
    "tituloResalta": "1 a 3 palabras que estén literalmente en titulo",
    "titulo2": "segunda línea del titular, puede ser pregunta",
    "sub": "máx 18 palabras, qué unifica Odoo para este sector",
    "detalleSector": "los tipos de empresa del sector, separados por coma, y · México"
  },
  "queEsOdoo": { "p1": "qué es Odoo, 2 o 3 líneas. Puedes usar <strong>.",
                 "p2": "el argumento de una sola base de datos, aterrizado a ESTE sector" },
  "datosClave": [ {"n":"12M+","l":"usuarios en el mundo"}, {"n":"175","l":"países"},
                  {"n":"70+","l":"apps integradas"}, {"n":"1","l":"sola base de datos"} ],
  "clientes":  { "titulo":"...", "tituloResalta":"...", "sub":"máx 20 palabras" },
  "segmentos": { "titulo":"...", "tituloResalta":"...", "sub":"máx 18 palabras" },
  "retos":     { "titulo":"...", "tituloResalta":"...", "sub":"máx 18 palabras" },
  "empezar": {
    "titulo":"...", "tituloResalta":"...", "sub":"máx 26 palabras sobre QuickStart",
    "pasos":[ {"titulo":"Levantamiento","desc":"máx 16 palabras, con el vocabulario del sector"},
              {"titulo":"Configuración","desc":"..."}, {"titulo":"Migración","desc":"..."},
              {"titulo":"Go-Live","desc":"..."} ],
    "migracion":"párrafo que conteste «¿y lo que ya tengo?» nombrando los sistemas de arriba. Puedes usar <strong>."
  },
  "inversion": { "titulo":"...", "tituloResalta":"...", "sub":"máx 20 palabras",
                 "quickstart":"máx 30 palabras sobre la metodología" },
  "cierre":    { "titulo":"frase que invite a una intromeet — conocer al prospecto, NO a demostrar el producto",
                 "tituloResalta":"..." }
}`;
}

/** Prompt del delta: solo lo que cambia por prospecto. */
function brPromptDelta(playbook, ctx){
  return `Eres consultor senior de Odoo México. Ya existe un brochure de la industria
${playbook.industria}. Vas a personalizar SOLO dos cosas con lo que se sabe de este
prospecto. Todo lo demás del brochure se queda igual.

EMPRESA: ${ctx.empresa||'(sin nombre)'}
DOLORES DETECTADOS: ${ctx.dolores||'(ninguno)'}
APPS QUE EL AE QUIERE DESTACAR: ${(ctx.apps||[]).join(', ')||'(ninguna)'}

RETOS DISPONIBLES DEL SECTOR (elige de aquí, no inventes otros):
${(playbook.retos||[]).map((r,i)=>`${i+1}. ${r.titulo} → ${r.appNombre}`).join('\n')}

${BR_REGLAS}

Responde ÚNICAMENTE con este JSON:
{
  "portada": { "titulo":"titular apuntado al dolor principal de ESTE prospecto, máx 6 palabras",
               "tituloResalta":"1 a 3 palabras literales del titulo",
               "titulo2":"segunda línea" },
  "retosElegidos": [ "el titulo EXACTO de un reto de la lista de arriba", "otro", "otro" ],
  "retos": { "sub":"máx 18 palabras, ligado a lo que se detectó en el discovery" }
}
Elige exactamente 3 retos, los que más se acerquen a los dolores detectados. Si no hay
dolores, elige los 3 que mejor le peguen a las apps que quiere destacar el AE.`;
}

/* ── Validación ────────────────────────────────────────────────────────
   Una base mala envenena el caché de TODO el equipo, así que no se guarda
   sin pasar por aquí. Devuelve una lista de problemas; vacía es que pasó. */

function brValidaBase(b, playbook){
  const p = [];
  const secciones = ['portada','queEsOdoo','datosClave','clientes','segmentos',
                     'retos','empezar','inversion','cierre'];
  for(const s of secciones) if(!b[s]) p.push(`falta la sección "${s}"`);
  if(p.length) return p;

  // El marcador debe existir literalmente y medir de 1 a 3 palabras.
  for(const s of ['portada','clientes','segmentos','retos','empezar','inversion','cierre']){
    const t = b[s].titulo, r = b[s].tituloResalta;
    if(!t) { p.push(`${s}: sin titulo`); continue; }
    if(!r) { p.push(`${s}: sin tituloResalta`); continue; }
    if(!t.includes(r))            p.push(`${s}: "${r}" no aparece literal en el título`);
    if(r.split(/\s+/).length > 3) p.push(`${s}: el resaltado "${r}" tiene más de 3 palabras`);
  }

  if(!Array.isArray(b.datosClave) || b.datosClave.length !== 4)
    p.push('datosClave debe traer exactamente 4');
  if(!Array.isArray(b.empezar.pasos) || b.empezar.pasos.length !== 4)
    p.push('empezar.pasos debe traer exactamente 4');

  // Nadie debe nombrar competidores: el modelo no los tiene y si los escribe,
  // los inventó.
  const todo = JSON.stringify(b).toLowerCase();
  const comp = [...(playbook.competidores?.sector||[]), ...(playbook.competidores?.generalistas||[])];
  for(const c of comp)
    if(todo.includes(c.toLowerCase())) p.push(`nombra a un competidor ("${c}") — eso no lo escribe el modelo`);

  // Cifras inventadas: cualquier porcentaje que no venga del playbook.
  const pcts = (JSON.stringify(b).match(/\d+\s?%/g) || []);
  if(pcts.length) p.push(`trae porcentajes (${pcts.join(', ')}) — verifica que no sean inventados`);

  return p;
}

function brValidaDelta(d, playbook){
  const p = [];
  if(!Array.isArray(d.retosElegidos) || d.retosElegidos.length !== 3)
    p.push('retosElegidos debe traer exactamente 3');
  else {
    const titulos = (playbook.retos||[]).map(r => r.titulo);
    for(const t of d.retosElegidos)
      if(!titulos.includes(t)) p.push(`el reto "${t}" no existe en el playbook`);
  }
  if(d.portada?.titulo && d.portada?.tituloResalta){
    if(!d.portada.titulo.includes(d.portada.tituloResalta))
      p.push('portada: el resaltado no aparece literal en el título');
    if(d.portada.tituloResalta.split(/\s+/).length > 3)
      p.push('portada: el resaltado tiene más de 3 palabras');
  }
  return p;
}

if(typeof module !== 'undefined')
  module.exports = { brPromptBase, brPromptDelta, brValidaBase, brValidaDelta, BR_REGLAS };
