/* Prueba del renderizador: junta base + playbook + datos y escupe las dos
   versiones, para revisarlas en el navegador antes de tocar la app. */
const fs = require('fs'), path = require('path');
const { brRender } = require('./render.js');

const D = __dirname;
const base     = JSON.parse(fs.readFileSync(D + '/bases/construccion_v1.json', 'utf8'));
const playbook = JSON.parse(fs.readFileSync(D + '/industrias/construccion.json', 'utf8'));
const css      = fs.readFileSync(D + '/referencias/marca.css', 'utf8');

// Lo que la app estampa sin gastar tokens.
const datos = {
  empresa: 'Constructora de ejemplo',
  contacto: 'Ing. Ramírez',
  segmentoId: 'constructoras',
  ae: { nombre: 'Ariel', correo: 'gacj@odoo.com', agenda: 'https://www.odoo.com/book/...' },
  cta: 'prospeccion',
  ctaTexto: 'Media hora para entender cómo trabajas hoy: tus obras, tus procesos y dónde se te va el control. Con eso sobre la mesa, lo que sigue se arma sobre tu operación.'
};

const ctx = {
  apps: ['project','account','purchase','stock','sale','sign','documents',
         'hr_timesheet','hr_expense','crm','maintenance','spreadsheet'],
  precios: {
    estandar:      { nombre:'Estándar',      precio:'180', plataformas:'Odoo en línea', extras:'' },
    personalizado: { nombre:'Personalizado', precio:'274', plataformas:'Odoo en línea · Odoo.sh · Local',
                     extras:'+ Studio · Multiempresas · API externa' }
  },
  casos: [
    { empresa:'Odisa',   ubicacion:'Ciudad de México', resumen:'centralizó operaciones fragmentadas y agilizó su gestión de inventario de maquinaria para concreto.', url:'https://www.odoo.com/es/blog/customer-reviews-6/odisa-and-odoo-transforming-the-concrete-machinery-industry-with-innovation-and-business-efficiency-1161' },
    { empresa:'CANTAB',  ubicacion:'Ciudad de México', resumen:'fortaleció la gestión de cuentas por cobrar y optimizó el monitoreo de inventario con Odoo.', url:'https://www.odoo.com/es/blog/customer-reviews-6/cantab-raises-business-efficiency-with-odoo-1152' },
    { empresa:'Artdeko', ubicacion:'México', resumen:'logró visibilidad en tiempo real y mejor eficiencia operativa centralizando procesos con Odoo.', url:'https://www.odoo.com/es/blog/customer-reviews-6/artdeko-y-odoo-innovacion-que-construye-exito-1613' }
  ],
  links: [
    { ic:'💬', label:'Opiniones de clientes', url:'https://www.odoo.com/blog/customer-reviews-6' },
    { ic:'📘', label:'Documentación',         url:'https://www.odoo.com/documentation/user' },
    { ic:'▶️', label:'Odoo Tour (vídeos)',    url:'https://www.odoo.com/page/tour' },
    { ic:'🛡️', label:'Seguridad',             url:'https://www.odoo.com/security' },
    { ic:'👁️', label:'Privacidad',            url:'https://www.odoo.com/privacy' },
    { ic:'⚖️', label:'Legal',                 url:'https://www.odoo.com/legal' }
  ]
};

const envuelve = (titulo, cuerpo) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${titulo}</title><style>${css}
.filas{display:flex;flex-direction:column;gap:20px}
.fila{display:grid;grid-template-columns:1fr 60px 1fr;align-items:center}
.flecha{display:flex;align-items:center;justify-content:center}
.flecha img{width:44px;height:auto;opacity:.9}
</style></head><body>${cuerpo}</body></html>`;

for (const version of ['corta','larga']) {
  const html = brRender(base, playbook, datos, Object.assign({ version }, ctx));
  const n = (html.match(/class="hoja/g) || []).length;
  const f = `${D}/layouts/render-${version}.html`;
  fs.writeFileSync(f, envuelve(`Brochure Odoo · ${playbook.industria} · ${version}`, html));
  console.log(`${version}: ${n} artboards · ${Math.round(html.length/1024)} KB · ${path.basename(f)}`);
}
