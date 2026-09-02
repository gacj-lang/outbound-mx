/* ═══════════════════════════════════════════════════════════════════════
   Renderizador de brochure por industria.

   Arma los artboards a partir de tres piezas que se juntan aquí y no antes:

     base      contenido de industria, generado UNA vez por el modelo y
               guardado en Firestore (brochureBases). No lleva ningún dato
               de prospecto.
     playbook  la parte curada a mano: sub-verticales, retos, features,
               material gráfico. Vive en el repo.
     datos     empresa, contacto, AE, segmento y etapa del CTA. Se estampan
               aquí, sin gastar un solo token.

   Por qué el HTML se arma en el navegador y no se guarda: lo que se guarda
   es la base, así que un arreglo de layout mejora TODOS los brochures ya
   generados. Guardar el HTML los congela con el defecto que tenían el día
   que se hicieron.
   ═══════════════════════════════════════════════════════════════════════ */

const BR_A = 'https://gacj-lang.github.io/outbound-mx/assets';

function brEsc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Marcador de resaltado. Dos reglas que salieron de ver el render:
   solo sobre encabezados (en cuerpo de 19px queda como un pelo) y de una a
   tres palabras (en frases largas el SVG no se estira parejo). */
function brMk(texto, resaltar, color){
  const t = brEsc(texto);
  if(!resaltar) return t;
  const r = brEsc(resaltar);
  if(!t.includes(r) || r.split(/\s+/).length > 3) return t;
  return t.replace(r, `<span class="mk mk-${color||'amarillo'}">${r}</span>`);
}

const brPie = (dch) => `<div class="pie">
  <img src="${BR_A}/logos/odoo_logo.svg"><span>${brEsc(dch)}</span></div>`;

/* ── Hojas ────────────────────────────────────────────────────────────── */

function brHojaPortada(b, pb, d){
  const foto = (pb.material.fotos || [])[0];
  const doodles = (pb.material.doodles || []).slice(0, 2);
  return `<div class="hoja portada">
  <div class="foto">${foto ? `<img src="${BR_A}/images/support/${foto}" alt="">` : ''}</div>
  <div class="cara">
    <img class="logo" src="${BR_A}/logos/odoo_logo.svg">
    <div>
      <h1 class="h1">${brMk(b.portada.titulo, b.portada.tituloResalta, 'amarillo')}<br>${brEsc(b.portada.titulo2 || '')}</h1>
      <p class="sub">${brEsc(b.portada.sub)}</p>
    </div>
    <div class="sector">
      <img class="ico" src="${BR_A}/icons/${pb.material.icono}">
      <div><div class="nom">${brEsc(pb.industria)}</div>
        <div class="det">${brEsc(b.portada.detalleSector || '')}</div></div>
      ${doodles[0] ? `<img class="doodle" src="${BR_A}/icons/doodles/${doodles[0]}.svg"
        style="right:-6px;top:-14px;width:44px;transform:rotate(-12deg)">` : ''}
      ${doodles[1] ? `<img class="doodle" src="${BR_A}/icons/doodles/${doodles[1]}.svg"
        style="right:52px;bottom:-16px;width:38px;transform:rotate(8deg)">` : ''}
    </div>
  </div>
  <div class="pie"><span></span><span>${d.empresa ? `Preparado para <strong>${brEsc(d.empresa)}</strong>` : ''}</span></div>
</div>`;
}

function brHojaQueEsOdoo(b, pb, d, apps){
  const mosaico = apps.slice(0, 12)
    .map(a => `<div class="cel"><img src="${BR_A}/icons/apps/${a}.svg"></div>`).join('');
  const datos = (b.datosClave || []).map(f =>
    `<div class="d"><div class="n">${brEsc(f.n)}</div><div class="l">${brEsc(f.l)}</div></div>`).join('');
  return `<div class="hoja">
  <div class="contenido">
    <div style="display:grid;grid-template-columns:1fr 400px;gap:56px;align-items:center">
      <div>
        <h1 class="h1 morado">¿Qué es Odoo?</h1>
        <p class="cuerpo" style="margin-top:18px;font-size:19px">${b.queEsOdoo.p1}</p>
        <p class="cuerpo" style="margin-top:14px;font-size:19px">${b.queEsOdoo.p2}</p>
      </div>
      <div class="mosaico">${mosaico}</div>
    </div>
    <div class="datos">${datos}</div>
  </div>
  ${brPie(`${d.empresa || ''} · Odoo México ${new Date().getFullYear()}`)}
</div>`;
}

function brHojaClientes(b, pb, d, casos, compacta){
  const alto = compacta ? 300 : 292;
  const cols = compacta ? 2 : 3;
  const lista = casos.slice(0, cols).map(c => `<div class="caso">
      <div class="quien">${brEsc(c.empresa)}</div>
      <div class="donde">${brEsc(c.ubicacion || c.pais)}</div>
      <div class="qué">${brEsc(c.resumen)}</div>
      <a href="${brEsc(c.url)}">Ver el caso en odoo.com &#8599;</a></div>`).join('');
  return `<div class="hoja">
  <div class="contenido">
    <div>
      <h1 class="h1">${brMk(b.clientes.titulo, b.clientes.tituloResalta, 'azul')}</h1>
      ${!compacta && b.clientes.sub ? `<p class="sub">${brEsc(b.clientes.sub)}</p>` : ''}
    </div>
    ${pb.material.logos ? `<img src="${BR_A}/images/support/${pb.material.logos}"
      style="height:${alto}px;object-fit:contain;display:block;margin:0 auto">` : ''}
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${compacta?40:30}px">${lista}</div>
  </div>
  ${brPie('Casos publicados en odoo.com · verificables')}
</div>`;
}

function brHojaSegmentos(b, pb, d){
  const tarjetas = pb.subverticales.map(s => {
    const suyo = s.id === d.segmentoId;
    return `<div class="seg${suyo ? ' suyo' : ''}">
      <div class="t">${brEsc(s.nombre)}</div><div class="d">${brEsc(s.desc)}</div>
      ${suyo ? '<span class="ins">Tu operación</span>' : ''}</div>`;
  }).join('');
  return `<div class="hoja">
  <div class="contenido">
    <div>
      <h1 class="h1">${brMk(b.segmentos.titulo, b.segmentos.tituloResalta, 'turquesa')}</h1>
      <p class="sub">${brEsc(b.segmentos.sub)}</p>
    </div>
    <div class="segmentos">${tarjetas}</div>
  </div>
  ${brPie(`${d.empresa || ''} · Odoo México ${new Date().getFullYear()}`)}
</div>`;
}

function brHojaRetos(b, pb, d, retos){
  const doo = {azul:'blue', amarillo:'yellow', rosa:'red', turquesa:'green'};
  const filas = retos.map(r => `<div class="fila">
      <div class="reto c-${r.color}"><div class="tit">${brEsc(r.titulo)}</div>
        <div class="txt">${brEsc(r.texto)}</div></div>
      <div class="flecha"><img src="${BR_A}/icons/doodles/${doo[r.color]}_arrow-right.svg"></div>
      <div class="app" style="padding-left:22px">
        <div class="ico"><img src="${BR_A}/icons/apps/${r.app}.svg"></div>
        <div><div class="nom">${brEsc(r.appNombre)}</div>
          <div class="como">${brEsc(r.resuelve)}</div></div>
      </div></div>`).join('');
  const doodle = (pb.material.doodles || [])[2];
  return `<div class="hoja">
  ${doodle ? `<img class="doodle" src="${BR_A}/icons/doodles/${doodle}.svg"
    style="right:64px;top:44px;width:52px;transform:rotate(9deg)">` : ''}
  <div class="contenido">
    <div>
      <h1 class="h1">${brMk(b.retos.titulo, b.retos.tituloResalta, 'turquesa')}</h1>
      <p class="sub">${brEsc(b.retos.sub)}</p>
    </div>
    <div class="filas">${filas}</div>
  </div>
  ${brPie(`${d.empresa || ''} · Odoo México ${new Date().getFullYear()}`)}
</div>`;
}

function brHojaFeature(f, d){
  const puntos = (f.puntos || []).map(([a, b2]) =>
    `<div class="pt"><b>·</b><div><b>${brEsc(a)}</b> — ${brEsc(b2)}</div></div>`).join('');
  return `<div class="hoja">
  <div class="contenido">
    <h1 class="h1">${brEsc(f.titulo)}</h1>
    <div class="feature">
      <div class="lado">
        <div class="app"><div class="ico"><img src="${BR_A}/icons/apps/${f.app}.svg"></div>
          <div><div class="nom">${brEsc(f.nombre)}</div></div></div>
        <div class="pts">${puntos}</div>
      </div>
      <div class="toma"><img src="${BR_A}/images/support/${f.captura}"></div>
    </div>
  </div>
  ${brPie(`${d.empresa || ''} · Odoo México ${new Date().getFullYear()}`)}
</div>`;
}

function brHojaEmpezar(b, pb, d){
  const col = ['var(--azul)', 'var(--turquesa)', 'var(--amarillo)', 'var(--rosa)'];
  const pasos = (b.empezar.pasos || []).map((p, i) =>
    `<div class="paso" style="--c:${col[i % 4]}"><div class="n">${i + 1}</div>
      <div class="t">${brEsc(p.titulo)}</div><div class="d">${brEsc(p.desc)}</div></div>`).join('');
  return `<div class="hoja">
  <div class="contenido">
    <div>
      <h1 class="h1">${brMk(b.empezar.titulo, b.empezar.tituloResalta, 'amarillo')}</h1>
      <p class="sub">${brEsc(b.empezar.sub)}</p>
    </div>
    <div class="pasos">${pasos}</div>
    <div style="background:var(--morado-claro);border-radius:20px;padding:22px 28px">
      <div class="cuerpo" style="font-size:17px">${b.empezar.migracion}</div>
    </div>
  </div>
  ${brPie(`${d.empresa || ''} · Odoo México ${new Date().getFullYear()}`)}
</div>`;
}

function brHojaInversion(b, pb, d, precios){
  return `<div class="hoja">
  <div class="contenido">
    <div>
      <h1 class="h1">${brMk(b.inversion.titulo, b.inversion.tituloResalta, 'amarillo')}</h1>
      <p class="sub">${brEsc(b.inversion.sub)}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:26px">
      <div class="precio c-rosa">
        <div class="plan">${brEsc(precios.estandar.nombre)}</div>
        <div class="n">${brEsc(precios.estandar.precio)}<span>MXN</span></div>
        <div class="por">por usuario / mes · plan anual</div>
        <div class="plat">${brEsc(precios.estandar.plataformas)}</div>
      </div>
      <div class="precio c-turquesa">
        <div class="plan">${brEsc(precios.personalizado.nombre)}</div>
        <div class="n">${brEsc(precios.personalizado.precio)}<span>MXN</span></div>
        <div class="por">por usuario / mes · plan anual</div>
        <div class="plat">${brEsc(precios.personalizado.plataformas)}</div>
        <div class="extra">${brEsc(precios.personalizado.extras)}</div>
      </div>
    </div>
    <div class="planes">
      <div class="p"><div class="t">Mensual</div><div class="v">$225 · $342 por usuario</div></div>
      <div class="p destaca"><div class="t">Anual</div><div class="v">20% menos por usuario que el mensual</div></div>
      <div class="p"><div class="t">Multianual</div><div class="v">De 24 a 60 meses</div></div>
    </div>
    ${b.inversion.quickstart ? `<div style="background:var(--morado-claro);border-radius:20px;padding:20px 28px;
        display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center">
      <div><div class="h2" style="font-size:36px;color:var(--morado)">QuickStart</div>
        <div class="cuerpo" style="margin-top:6px;font-size:15.5px">${b.inversion.quickstart}</div></div>
      <div class="cuerpo" style="font-size:15.5px">${b.empezar.migracion}</div>
    </div>` : ''}
  </div>
  ${brPie('Precios de referencia en MXN · odoo.com/pricing')}
</div>`;
}

function brHojaCierre(b, pb, d, links){
  const chips = links.map(l =>
    `<a href="${brEsc(l.url)}"><span class="ic">${l.ic}</span>${brEsc(l.label)}</a>`).join('');
  return `<div class="hoja">
  <div class="contenido">
    <h1 class="h1">${brMk(b.cierre.titulo, b.cierre.tituloResalta, 'turquesa')}</h1>
    <div class="cta">
      <div class="msg" data-cta="${brEsc(d.cta || 'prospeccion')}">${brEsc(d.ctaTexto || '')}</div>
      <div class="ae">
        ${d.ae?.nombre ? `<div class="n">${brEsc(d.ae.nombre)}</div>` : ''}
        <div class="r">Account Executive</div>
        ${d.ae?.correo ? `<div class="c">${brEsc(d.ae.correo)}</div>` : ''}
        ${d.ae?.agenda ? `<div class="a">Agenda una sesión &#8594;</div>` : ''}
      </div>
    </div>
    <div>
      <div class="h2" style="font-size:38px">Mientras tanto, conócelo
        <span class="mk mk-garabato">por tu cuenta</span></div>
      <div class="links" style="margin-top:18px">${chips}</div>
    </div>
  </div>
  ${brPie(`Odoo México ${new Date().getFullYear()}`)}
</div>`;
}

/* ── Ensamblado ───────────────────────────────────────────────────────── */

/**
 * @param {object} base      contenido de industria (de brochureBases)
 * @param {object} playbook  el JSON curado de la industria
 * @param {object} datos     {empresa, contacto, segmentoId, ae, cta, ctaTexto}
 * @param {object} ctx       {version:'corta'|'larga', casos, precios, links, apps, delta}
 */
function brRender(base, playbook, datos, ctx){
  const b = ctx.delta ? brMezcla(base, ctx.delta) : base;
  const larga = ctx.version === 'larga';

  // Los retos que entran: los que el delta eligió, o los primeros del playbook.
  const retos = (b.retosElegidos || playbook.retos.slice(0, 3))
    .map(r => typeof r === 'string' ? playbook.retos.find(x => x.titulo === r) : r)
    .filter(Boolean);

  const feats = playbook.features.slice(0, larga ? 3 : 0);

  const hojas = larga ? [
    brHojaPortada(b, playbook, datos),
    brHojaQueEsOdoo(b, playbook, datos, ctx.apps),
    brHojaClientes(b, playbook, datos, ctx.casos, false),
    brHojaSegmentos(b, playbook, datos),
    brHojaRetos(b, playbook, datos, retos),
    ...feats.map(f => brHojaFeature(f, datos)),
    brHojaEmpezar(b, playbook, datos),
    brHojaInversion(b, playbook, datos, ctx.precios),
    brHojaCierre(b, playbook, datos, ctx.links),
  ] : [
    brHojaPortada(b, playbook, datos),
    brHojaQueEsOdoo(b, playbook, datos, ctx.apps),
    brHojaRetos(b, playbook, datos, retos),
    brHojaClientes(b, playbook, datos, ctx.casos, true),
    brHojaInversion(b, playbook, datos, ctx.precios),
    brHojaCierre(b, playbook, datos, ctx.links),
  ];

  return hojas.join('\n');
}

/* Mezcla superficial por hoja: el delta solo pisa los campos que trae. */
function brMezcla(base, delta){
  const out = JSON.parse(JSON.stringify(base));
  for(const k of Object.keys(delta || {})){
    if(delta[k] && typeof delta[k] === 'object' && !Array.isArray(delta[k]))
      out[k] = Object.assign({}, out[k] || {}, delta[k]);
    else out[k] = delta[k];
  }
  return out;
}

if(typeof module !== 'undefined') module.exports = { brRender, brMezcla, brMk, brEsc };
