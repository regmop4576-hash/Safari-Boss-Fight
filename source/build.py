"""Produce a no-network, no-install standalone release."""
from pathlib import Path
import base64,json,mimetypes,re
ROOT=Path(__file__).parent; OUT=ROOT.parent/'dist';OUT.mkdir(exist_ok=True)
files=['safari-atlas.png','camera-atlas.png','orb-atlas.png','poster.png','forest.mp4','music.mp3','flash.mp3','swing.mp3']
def uri(n):
 p=ROOT/'assets'/n
 return 'data:'+ (mimetypes.guess_type(n)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(p.read_bytes()).decode()
assets={n:uri(n) for n in files};html=(ROOT/'index.html').read_text();css=(ROOT/'game/style.css').read_text().replace('../assets/pixel.ttf',uri('pixel.ttf'));html=html.replace('<link rel="stylesheet" href="game/style.css">','<style>'+css+'</style>')
# Media URLs are installed by app.js; keep a single copy of each embedded resource.
html=html.replace('poster="assets/poster.png" src="assets/forest.mp4"','')
html=html.replace('<script src="game/engine.js"></script>', '<script>window.SAFARI_ASSETS='+json.dumps(assets)+';</script><script>'+(ROOT/'game/engine.js').read_text()+'</script>')
html=html.replace('<script src="game/app.js"></script>','<script>'+(ROOT/'game/app.js').read_text()+'</script>')
(OUT/'SAFARI-BOSS-FIGHT.html').write_text(html)
print('Standalone release:',len(html.encode()),'bytes')
