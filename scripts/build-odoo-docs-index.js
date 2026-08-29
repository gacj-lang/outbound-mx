#!/usr/bin/env node
/**
 * Regenera odoo-docs-index.json desde el repo oficial de documentación de Odoo.
 *
 *   node scripts/build-odoo-docs-index.js [rama]
 *   node scripts/build-odoo-docs-index.js saas-19.4     (por defecto)
 *
 * Por qué existe: Ninja IA responde dudas técnicas de Odoo leyendo la fuente real en vez de
 * resumir resultados de búsqueda web. Para eso necesita un índice local de qué páginas existen
 * (este archivo) y luego baja el .rst concreto de raw.githubusercontent.com en el momento.
 * raw.githubusercontent.com responde con CORS abierto, así que el navegador puede bajarlo
 * directo — sin backend y sin costo de API. www.odoo.com/documentation NO manda CORS, por eso
 * se usa el repo como fuente y la URL pública solo para citar el link al usuario.
 *
 * Cuando Odoo saque una versión nueva: correr esto con la rama nueva y comitear el JSON.
 */
const fs=require('fs'), path=require('path');
const RAMA=process.argv[2]||'saas-19.4';
const API=`https://api.github.com/repos/odoo/documentation/git/trees/${RAMA}?recursive=1`;
const RAW=`https://raw.githubusercontent.com/odoo/documentation/${RAMA}/content/applications/`;
const CONC=24;

// Primer encabezado RST (línea seguida de una de ===/---/~~~) + primer párrafo de prosa real.
// Ojo: hay que saltar directivas (`..`) y sus continuaciones indentadas, o la descripción sale
// con fragmentos de `.. |PAC| replace::` en vez del texto de la página.
function parse(rst, fallbackTitulo){
  const lines=rst.split('\n');
  let title='', ti=-1;
  for(let i=0;i<lines.length-1;i++){
    const a=lines[i].trim(), b=lines[i+1].trim();
    if(a&&b&&/^[=\-~^"'`*+#]{3,}$/.test(b)&&b.length>=a.length-2){ title=a; ti=i+1; break; }
  }
  const buf=[];
  for(let i=ti+1;i<lines.length;i++){
    const raw=lines[i], t=raw.trim();
    if(!t){ if(buf.length) break; continue; }
    if(raw.startsWith(' ')||raw.startsWith('\t')){ if(buf.length) break; continue; }
    if(t.startsWith('..')||t.startsWith(':')||t.startsWith('|')||/^[=\-~^"'`*+#]{3,}$/.test(t)){ if(buf.length) break; continue; }
    buf.push(t);
    if(buf.join(' ').length>190) break;
  }
  const d=buf.join(' ')
    .replace(/:[a-z:-]+:`([^`<]*?)(?:\s*<[^>]*>)?`/g,'$1')
    .replace(/[`*]/g,'').replace(/\s+/g,' ').slice(0,190);
  return {t:title||fallbackTitulo, d};
}

(async()=>{
  console.log('rama:',RAMA);
  const tree=await (await fetch(API)).json();
  if(tree.message) throw new Error('GitHub: '+tree.message);
  if(tree.truncated) console.warn('AVISO: GitHub truncó el árbol, el índice puede quedar incompleto.');
  const archivos=tree.tree
    .filter(x=>x.path.startsWith('content/applications/')&&x.path.endsWith('.rst'))
    .map(x=>x.path.replace('content/applications/','').replace(/\.rst$/,''));
  console.log('páginas a indexar:',archivos.length);

  const queue=[...archivos], out=[]; let done=0, fail=0;
  const titulizar=s=>s.split('/').pop().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  async function worker(){
    while(queue.length){
      const p=queue.pop();
      try{
        const r=await fetch(RAW+p+'.rst');
        if(!r.ok) throw new Error(r.status);
        out.push({p, ...parse(await r.text(), titulizar(p))});
      }catch(e){ fail++; out.push({p, t:titulizar(p), d:''}); }
      if(++done%200===0) process.stdout.write(done+'… ');
    }
  }
  await Promise.all(Array.from({length:CONC},worker));
  out.sort((a,b)=>a.p.localeCompare(b.p));

  const dest=path.join(__dirname,'..','odoo-docs-index.json');
  fs.writeFileSync(dest, JSON.stringify({
    _comentario:'Índice de la documentación oficial de Odoo, generado desde github.com/odoo/documentation. Lo consume Ninja IA. Regenerar con scripts/build-odoo-docs-index.js.',
    version:RAMA,
    generado:new Date().toISOString().slice(0,10),
    baseRaw:RAW,
    baseUrl:`https://www.odoo.com/documentation/${RAMA}/applications/`,
    paginas:out,
  }));
  console.log(`\nlisto: ${out.length} páginas (${fail} fallos) → ${dest}`);
})();
