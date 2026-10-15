"""Original five-by-seven interface alphabet, no downloaded font dependency."""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from pathlib import Path
D={
'A':'0E 11 11 1F 11 11 11','B':'1E 11 11 1E 11 11 1E','C':'0F 10 10 10 10 10 0F','D':'1E 11 11 11 11 11 1E','E':'1F 10 10 1E 10 10 1F','F':'1F 10 10 1E 10 10 10','G':'0F 10 10 17 11 11 0F','H':'11 11 11 1F 11 11 11','I':'0E 04 04 04 04 04 0E','J':'07 02 02 02 12 12 0C','K':'11 12 14 18 14 12 11','L':'10 10 10 10 10 10 1F','M':'11 1B 15 15 11 11 11','N':'11 19 19 15 13 13 11','O':'0E 11 11 11 11 11 0E','P':'1E 11 11 1E 10 10 10','Q':'0E 11 11 11 15 12 0D','R':'1E 11 11 1E 14 12 11','S':'0F 10 10 0E 01 01 1E','T':'1F 04 04 04 04 04 04','U':'11 11 11 11 11 11 0E','V':'11 11 11 11 11 0A 04','W':'11 11 11 15 15 1B 11','X':'11 11 0A 04 0A 11 11','Y':'11 11 0A 04 04 04 04','Z':'1F 01 02 04 08 10 1F',
'0':'0E 11 13 15 19 11 0E','1':'04 0C 04 04 04 04 0E','2':'0E 11 01 02 04 08 1F','3':'1E 01 01 0E 01 01 1E','4':'02 06 0A 12 1F 02 02','5':'1F 10 10 1E 01 01 1E','6':'0E 10 10 1E 11 11 0E','7':'1F 01 02 04 08 08 08','8':'0E 11 11 0E 11 11 0E','9':'0E 11 11 0F 01 01 0E',
'Б':'1F 10 10 1E 11 11 1E','Г':'1F 10 10 10 10 10 10','Д':'06 0A 0A 0A 0A 1F 11','Ж':'15 15 0E 04 0E 15 15','З':'1E 01 01 0E 01 01 1E','И':'11 11 13 15 19 11 11','Й':'0A 04 11 13 15 19 11','Л':'07 09 09 09 09 09 11','П':'1F 11 11 11 11 11 11','У':'11 11 11 0F 01 01 1E','Ф':'04 0E 15 15 15 0E 04','Ц':'12 12 12 12 12 1F 01','Ч':'11 11 11 0F 01 01 01','Ш':'15 15 15 15 15 15 1F','Щ':'15 15 15 15 15 1F 01','Ъ':'18 08 08 0E 09 09 0E','Ы':'11 11 11 19 15 15 19','Ь':'10 10 10 1E 11 11 1E','Э':'0E 11 01 07 01 11 0E','Ю':'12 15 15 1D 15 15 12','Я':'0F 11 11 0F 05 09 11',
'!':'04 04 04 04 04 00 04','?':'0E 11 01 02 04 00 04','.':'00 00 00 00 00 00 04',',':'00 00 00 00 00 04 08',':':'00 04 00 00 04 00 00','/':'01 01 02 04 08 10 10','-':'00 00 00 1F 00 00 00','+':'00 04 04 1F 04 04 00','(':'02 04 08 08 08 04 02',')':'08 04 02 02 02 04 08',' ':'00 00 00 00 00 00 00'}
for a,b in zip('АВЕКМНОРСТХ','ABEKMHOPCTX'):D[a]=D[b]
D['Ё']=D['Е']
for k,v in list(D.items()):D[k.lower()]=v
fb=FontBuilder(1000,isTTF=True);names={c:'g'+str(ord(c)) for c in D};fb.setupGlyphOrder(['.notdef']+list(names.values()));glyphs={};metrics={}
for c,name in [('', '.notdef')]+list(names.items()):
 pen=TTGlyphPen(None)
 for y,row in enumerate(D.get(c,'1F 11 15 15 15 11 1F').split()):
  bits=int(row,16)
  for x in range(5):
   if bits&(1<<(4-x)):
    xx=x*100;yy=(6-y)*100;pen.moveTo((xx,yy));pen.lineTo((xx,yy+100));pen.lineTo((xx+100,yy+100));pen.lineTo((xx+100,yy));pen.closePath()
 glyphs[name]=pen.glyph();metrics[name]=(600,0)
fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=800,descent=-200);fb.setupCharacterMap({ord(c):n for c,n in names.items()});fb.setupNameTable({'familyName':'Safari Pixel','styleName':'Regular','uniqueFontIdentifier':'SafariPixelOriginal1','fullName':'Safari Pixel','psName':'SafariPixel'});fb.setupOS2(sTypoAscender=800,sTypoDescender=-200,usWinAscent=800,usWinDescent=200);fb.setupPost();fb.save(Path(__file__).parent/'assets/pixel.ttf')
