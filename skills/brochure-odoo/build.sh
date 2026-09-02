#!/bin/bash
# Arma un artboard autocontenido para previsualizar o imprimir:
#  · mete marca.css en línea (igual que gcExportBrochurePrint en la app)
#  · empotra como data URI las imágenes que todavía no están publicadas en
#    GitHub Pages, para poder revisarlas antes de hacer push
set -e
python3 - "$1" "${2:-${1%.html}.build.html}" <<'PY'
import sys, re, base64, os, urllib.request
SRC, DEST = sys.argv[1], sys.argv[2]
RAIZ = os.path.expanduser('~/Desktop/outbound-app')
CDN  = 'https://gacj-lang.github.io/outbound-mx/assets'

h = open(SRC, encoding='utf-8').read()
css = open(os.path.join(os.path.dirname(SRC), '../referencias/marca.css'), encoding='utf-8').read()
h = re.sub(r'<link[^>]*marca\.css[^>]*>', '<style>\n' + css + '\n</style>', h)

faltantes = 0
def empotra(m):
    global faltantes
    url = m.group(0)
    rel = url[len(CDN)+1:]
    loc = os.path.join(RAIZ, 'assets', rel)
    if not os.path.isfile(loc):
        return url
    try:                                  # ¿ya está publicada? entonces se deja como URL
        urllib.request.urlopen(url, timeout=4).read(1)
        return url
    except Exception:
        pass
    faltantes += 1
    mime = {'png':'image/png','jpg':'image/jpeg','svg':'image/svg+xml'}[rel.rsplit('.',1)[1]]
    b64 = base64.b64encode(open(loc,'rb').read()).decode()
    return f'data:{mime};base64,{b64}'

h = re.sub(re.escape(CDN) + r'/[A-Za-z0-9_\-/.]+\.(?:png|jpg|svg)', empotra, h)
open(DEST,'w',encoding='utf-8').write(h)
print(f'armado: {DEST} · {len(h)//1024} KB · {faltantes} imagen(es) empotrada(s) por no estar publicadas aún')
PY
