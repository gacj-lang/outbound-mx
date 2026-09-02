#!/usr/bin/env python3
"""
Deja listas para el brochure las capturas que salen de la herramienta de macOS.

Una captura de Mac en pantalla Retina sale al doble de pixeles (~2880 px de
ancho), con canal alfa y con un perfil de color Display P3 incrustado. Eso son
unos 1.6 MB por imagen: 4-5x lo que necesita el brochure. Este script arregla
las cuatro cosas de un jalón.

  python3 procesar-capturas.py <origen> --industria construccion
  python3 procesar-capturas.py foto.png --industria retail --tipo foto

Lo que hace, en orden:
  1. Recorta el borde transparente — es la sombra que macOS le pone a una
     captura de ventana (Cmd+Shift+4 y luego Espacio). Sin esto, la imagen
     llega al artboard con ~100 px de aire vacío alrededor.
  2. Recorta también un marco de color uniforme, si lo hay.
  3. Escala al ancho objetivo (1400 px para captura, 900 para foto de portada).
  4. Aplana sobre blanco y convierte a sRGB, tirando el perfil P3.
  5. Si la imagen es de interfaz —pocos colores distintos por pixel— le baja la
     paleta a 256. En una pantalla de Odoo eso no se nota y pesa la mitad; en
     una foto sí se notaría, por eso se decide sola y no siempre se aplica.
  6. Guarda optimizado y reporta cuánto bajó.

Lo que este script NO puede revisar y hay que ver a ojo — para eso está el
skill `capturas-odoo`, que le pide a Claude mirar cada imagen:
  · que la interfaz esté en español
  · que los montos estén en pesos, no en dólares
  · que el IVA sea 16%
  · que no se haya colado un dato real de un cliente
"""
import argparse, os, sys
from PIL import Image, ImageChops

ANCHOS = {'captura': 1400, 'foto': 900, 'logos': 1400}
DESTINO = os.path.expanduser('~/Desktop/outbound-app/assets/images/support')


def recorta_transparente(im):
    """La sombra de ventana de macOS llega como alfa 0 alrededor del contenido."""
    if im.mode not in ('RGBA', 'LA'):
        return im, False
    caja = im.getchannel('A').getbbox()
    if caja and caja != (0, 0, im.width, im.height):
        return im.crop(caja), True
    return im, False


def recorta_marco_liso(im, tol=8):
    """Marco de un solo color (pasa cuando se captura sobre un fondo plano)."""
    base = im.convert('RGB')
    esquina = base.getpixel((0, 0))
    fondo = Image.new('RGB', base.size, esquina)
    dif = ImageChops.difference(base, fondo).convert('L').point(lambda p: 255 if p > tol else 0)
    caja = dif.getbbox()
    if caja and caja != (0, 0, im.width, im.height):
        return im.crop(caja), True
    return im, False


def procesa(ruta, tipo, industria, destino=None, ancho=None):
    ancho = ancho or ANCHOS[tipo]
    antes = os.path.getsize(ruta)
    im = Image.open(ruta)
    orig = im.size

    im, corto_alfa = recorta_transparente(im)
    im, corto_marco = recorta_marco_liso(im)

    if im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)

    # Aplanar sobre blanco: un PNG con alfa se comporta distinto según el motor
    # que arme el PDF, y aquí el fondo siempre es la hoja blanca.
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        fondo = Image.new('RGB', im.size, (255, 255, 255))
        fondo.paste(im, mask=im.getchannel('A'))
        im = fondo
    else:
        im = im.convert('RGB')

    carpeta = destino or os.path.join(DESTINO, industria)
    os.makedirs(carpeta, exist_ok=True)
    nombre = os.path.splitext(os.path.basename(ruta))[0]
    nombre = ''.join(c if c.isalnum() or c in '-_' else '-' for c in nombre.lower()).strip('-')
    nombre = '-'.join(filter(None, nombre.split('-')))

    # Interfaz o foto: se decide por cuántos colores distintos hay por pixel.
    # Una pantalla de Odoo anda en 0.01-0.05; una foto se va muy por arriba.
    paleta = False
    if tipo != 'foto':
        n = len(im.getcolors(maxcolors=im.width * im.height) or [])
        if n and n / (im.width * im.height) < 0.15:
            im = im.quantize(colors=256, method=Image.MEDIANCUT,
                             dither=Image.FLOYDSTEINBERG)
            paleta = True

    if tipo == 'foto':
        salida = os.path.join(carpeta, nombre + '.jpg')
        im.save(salida, 'JPEG', quality=86, optimize=True)   # sin icc_profile = sRGB
    else:
        salida = os.path.join(carpeta, nombre + '.png')
        im.save(salida, 'PNG', optimize=True)

    despues = os.path.getsize(salida)
    marcas = []
    if corto_alfa:  marcas.append('sombra recortada')
    if corto_marco: marcas.append('marco recortado')
    if paleta:      marcas.append('paleta 256')
    print(f'  {os.path.basename(ruta)[:38]:<40} {orig[0]}x{orig[1]} -> {im.width}x{im.height}'
          f'  {antes//1024}KB -> {despues//1024}KB ({100-despues*100//antes}% menos)'
          + (' · ' + ', '.join(marcas) if marcas else ''))
    return salida, despues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('origen', nargs='+', help='archivo o carpeta con las capturas')
    ap.add_argument('--industria', required=True, help='construccion, retail, manufactura...')
    ap.add_argument('--tipo', default='captura', choices=list(ANCHOS))
    ap.add_argument('--ancho', type=int, help='sobreescribe el ancho objetivo')
    ap.add_argument('--destino', help='carpeta de salida (por defecto assets/images/support/<industria>)')
    a = ap.parse_args()

    archivos = []
    for o in a.origen:
        o = os.path.expanduser(o)
        if os.path.isdir(o):
            archivos += [os.path.join(o, f) for f in sorted(os.listdir(o))
                         if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        elif os.path.isfile(o):
            archivos.append(o)
        else:
            print(f'no existe: {o}', file=sys.stderr)

    if not archivos:
        print('no se encontró ninguna imagen', file=sys.stderr); sys.exit(1)

    print(f'\n{len(archivos)} imagen(es) · industria "{a.industria}" · tipo {a.tipo}\n')
    total_antes = total_despues = 0
    salidas = []
    for f in archivos:
        total_antes += os.path.getsize(f)
        s, d = procesa(f, a.tipo, a.industria, a.destino, a.ancho)
        total_despues += d; salidas.append(s)

    print(f'\ntotal: {total_antes//1024}KB -> {total_despues//1024}KB')
    print(f'guardado en: {os.path.dirname(salidas[0])}')
    print('\nFalta revisar a ojo — el script no puede:')
    print('  · interfaz en español   · montos en MXN')
    print('  · IVA 16%               · sin datos reales de clientes')

if __name__ == '__main__':
    main()
