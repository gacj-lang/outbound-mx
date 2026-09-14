// Extractor de las Reglas de CRM y Ventas de Odoo México desde el Google Doc oficial.
//
// Se ejecuta DENTRO de la pestaña del documento abierta en su vista /mobilebasic (la única vista de
// Google Docs que trae el texto como HTML; la vista normal pinta en canvas y la exportación pide
// sesión, así que no se puede bajar con curl):
//   https://docs.google.com/document/d/1hD0eI6A7WWH9XQWx7BInpER6J9fSQZnTvSLBkPzGeuo/mobilebasic
//
// Pegar este archivo completo en la consola (o en javascript_tool) y luego llamar:
//   extraerReglasCRM()                          → solo huellas: liviano, sirve para saber si algo cambió
//   extraerReglasCRM({texto:true})              → con el texto de todas las secciones
//   extraerReglasCRM({texto:['id-1','id-2']})   → con el texto solo de esas secciones
//
// El resultado es la "captura" que entiende scripts/build-crm-rules.js.
//
// OJO: limpiar(), slug(), palabras() y huella() tienen que ser IDÉNTICAS a las de build-crm-rules.js.
// Si difieren, todas las secciones van a salir "modificadas" cada mes aunque nadie haya tocado el doc.
function extraerReglasCRM(opts){
  opts=opts||{};
  const limpiar=t=>String(t||'').replace(/​/g,'').replace(/[ \t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{2,}/g,'\n').trim();
  const slug=t=>limpiar(t).replace(/^\d+(\.\d+)*\.?\s*/,'').normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'seccion';
  const palabras=t=>(String(t||'').normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
  const huella=t=>{ const s=palabras(t).join(' '); let h=0x811c9dc5;
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
    return ('00000000'+h.toString(16)).slice(-8); };

  const root=document.querySelector('.doc-content');
  if(!root) throw new Error('No encontré .doc-content. ¿La pestaña está en /mobilebasic y con la sesión de Odoo iniciada?');

  const crudas=[]; let grupo='', actual=null, vistoH1=false, intro=null;
  const abrir=(titulo,grp)=>{ actual={titulo,grupo:grp,lineas:[],imagenes:0}; crudas.push(actual); };
  for(const el of root.children){
    const tag=el.tagName;
    if(tag==='P' && el.classList.contains('title')) continue;
    const txt=limpiar(el.innerText);
    if(tag==='H1'){ if(!txt) continue; grupo=txt; vistoH1=true; abrir(txt,txt); continue; }
    if(tag==='H2'||tag==='H3'){ if(!txt||!vistoH1) continue; abrir(txt,grupo); continue; }
    if(!vistoH1){
      // Antes del primer título solo sirve la introducción (primer párrafo con texto); lo demás es el índice.
      if(tag==='P' && txt && !intro) intro={titulo:'Objetivo y alcance del documento',grupo:'',lineas:[txt],imagenes:0};
      continue;
    }
    if(!actual) continue;
    const imgs=el.querySelectorAll?el.querySelectorAll('img').length:0;
    if(tag==='IMG') actual.imagenes++; else actual.imagenes+=imgs;
    if(tag==='H4'||tag==='H5'||tag==='H6'){ if(txt) actual.lineas.push('## '+txt); continue; }
    if(tag==='UL'||tag==='OL'){
      for(const li of el.querySelectorAll('li')){ const t=limpiar(li.innerText); if(t) actual.lineas.push('- '+t); }
      continue;
    }
    if(txt) actual.lineas.push(txt);
  }
  if(intro) crudas.unshift(intro);

  const vistos={};
  const secciones=crudas.filter(s=>s.lineas.length).map(s=>{
    let id=s===intro?'objetivo-y-alcance':slug(s.titulo);
    if(vistos[id]){ vistos[id]++; id=id+'-'+vistos[id]; } else vistos[id]=1;
    const texto=s.lineas.join('\n');
    const out={id,grupo:s.grupo,titulo:s.titulo,huella:huella(s.titulo+'\n'+texto),palabras:palabras(texto).length,imagenes:s.imagenes};
    if(opts.texto===true || (Array.isArray(opts.texto) && opts.texto.includes(id))) out.texto=texto;
    return out;
  });
  return {
    fuente:{titulo:document.title, url:location.href.replace(/\/mobilebasic.*$/,'/edit'), capturadoEn:new Date().toISOString()},
    secciones,
  };
}
