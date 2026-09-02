---
name: capturas-odoo
description: Procesa y revisa capturas de pantalla, logos de clientes y fotos para los brochures por industria. Usar cuando el usuario diga que ya tiene capturas nuevas, mencione una carpeta con pantallazos de Odoo, logos de clientes de un sector, o fotos de portada de industria — o cuando pida preparar material gráfico para el brochure.
---

# Capturas y material gráfico para brochures

Prepara material que el usuario tomó a mano para que entre al brochure por
industria. Tiene dos mitades: una mecánica que hace un script, y una de
criterio que haces tú mirando cada imagen.

## 1. Pregunta lo que falte

Necesitas dos datos antes de correr nada:

- **Carpeta de origen** — dónde dejó las imágenes.
- **Industria** — en minúsculas y sin acentos: `construccion`, `retail`,
  `manufactura`, `comercializadora`, `servicios`, `distribucion`,
  `restaurante`, `salud`.

Y el **tipo**, que casi siempre puedes deducir: `captura` (pantalla de Odoo),
`foto` (portada de industria, vertical) o `logos` (rejilla de clientes).

## 2. Corre el script

```
python3 ~/Desktop/outbound-app/skills/brochure-odoo/procesar-capturas.py \
  <carpeta> --industria <industria> --tipo <captura|foto|logos>
```

Recorta la sombra de ventana de macOS, escala al ancho que usa el artboard,
aplana a sRGB y, si es interfaz, baja la paleta a 256 colores. Una captura
Retina típica pasa de ~1.6 MB a ~340 KB sin que se note.

Deja todo en `assets/images/support/<industria>/`.

## 3. Revisa cada imagen tú mismo

Esta parte no la puede hacer el script. **Abre cada imagen procesada y míralas.**
Cuatro cosas descalifican una captura para el mercado mexicano:

- **Interfaz en inglés.** "Sales Order", "Tasks", "Purchase Order" — cualquier
  etiqueta de Odoo en inglés.
- **Montos en dólares.** Debe decir MXN o `$` con cifras en pesos.
- **IVA distinto de 16%.** La demo de Odoo trae 15% por defecto.
- **Datos reales de un cliente.** Nombres, RFC, correos o montos verdaderos de
  alguien que existe. Esto es lo más grave de la lista.

Los nombres dentro de los datos también cuentan: "Cement Kings" o "Deco Addict"
delatan que es la demo en inglés. Deberían leerse como empresas mexicanas.

Reporta lo que encontraste por imagen. **No la borres tú** — dile al usuario
cuál hay que volver a tomar y por qué.

## 4. Conecta con el playbook

Si las capturas son de una industria que ya tiene playbook en
`skills/brochure-odoo/industrias/<industria>.json`:

- Actualiza los campos `captura` de las features que correspondan.
- Quita `"capturaProvisional": true` de las que se acaben de reemplazar.
- Si la industria todavía no tiene playbook, dilo — el material sin playbook no
  se puede usar aún.

## 5. Publica

Las imágenes se sirven desde GitHub Pages, así que hay que hacer commit y push
para que el brochure las vea. Después de empujar, verifica con `curl` que
respondan 200 antes de decir que quedó: el deploy de Pages ya se ha caído solo
antes.

## Medidas de referencia

| Tipo | Ancho | Peso objetivo | Formato |
|---|---|---|---|
| Captura de Odoo | 1400 px | < 350 KB | PNG |
| Foto de portada | 900 px, vertical | < 200 KB | JPEG |
| Rejilla de logos | 1400 px | < 300 KB | PNG |

Cuántas van por industria, y qué vistas: ver la lista de material del proyecto.
