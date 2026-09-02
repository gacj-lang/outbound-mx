/* Verificación previa a entregar un brochure.
   Se pega en la consola del navegador con el brochure abierto, o se corre
   desde el panel. Devuelve una fila por artboard.

   Revisa las dos fallas que sí se cuelan sin avisar:
   · desborde — algo se sale del artboard y en el PDF sale cortado
   · choque con el pie — un bloque de contenido se encima con el pie de hoja

   Lo que NO revisa y hay que ver a ojo: ortografía, que el marcador caiga
   sobre la palabra correcta, y que las capturas estén en español.          */
(() => {
  const hojas = [...document.querySelectorAll('.hoja')];
  const filas = hojas.map((h, i) => {
    const hr = h.getBoundingClientRect();
    let peor = 0, quien = '';
    h.querySelectorAll('*').forEach(el => {
      const b = el.getBoundingClientRect();
      if (!b.height) return;
      const d = Math.max(0, b.bottom - hr.bottom, hr.top - b.top,
                            b.right - hr.right, hr.left - b.left);
      if (d > peor) { peor = d; quien = el.className || el.tagName; }
    });
    let choque = '';
    const pie = h.querySelector('.pie');
    if (pie) {
      const pb = pie.getBoundingClientRect();
      h.querySelectorAll('.contenido > *').forEach(el => {
        if (el.getBoundingClientRect().bottom > pb.top + 2)
          choque = el.className || el.tagName;
      });
    }
    return { hoja: i + 1, desborde: Math.round(peor),
             en: String(quien).slice(0, 34), chocaConPie: choque };
  });
  const malas = filas.filter(f => f.desborde > 1 || f.chocaConPie);
  console.table(filas);
  console.log(malas.length ? `✗ ${malas.length} hoja(s) con problema` : '✓ las ' + filas.length + ' hojas limpias');
  return filas;
})();
