import re
src='/home/claude/repo-mf/'
svg=open(src+'svg-sim.js').read()
svgpart=svg[svg.index('const SV = {'):]
cont=open(src+'continut.js').read()
cont=cont[cont.index('/* ---------------- TEORIE'):]
cont=cont.replace('FE(','fmtE(')
cont=re.sub(r'(?<![A-Za-z_])F\(','fmt(',cont)
cont=cont.replace('data-mergi="auto"','data-mergi="aplicatii"')
cont=cont.replace('src="img/','src="img/')
idx=open(src+'index.html').read()
simsec=idx[idx.index('<section id="tab-sim"'):]
simsec=simsec[:simsec.index('</section>')]
simsec=simsec[simsec.index('<div class="sim-grila">'):]
simsec=simsec[:simsec.index('<div class="card formule-vii">')]
simsec=re.sub(r'\s*<div class="scena-bara">.*?</div>\n','\n',simsec,flags=re.S)
simsec=simsec.replace('class="camp doar-demo"','class="camp" data-doar-demo')
simsec=simsec.replace('class="card sim-scena"','class="card sim-scena scena"')
auto=idx[idx.index('<section id="tab-auto" class="tab">')+len('<section id="tab-auto" class="tab">'):]
auto=auto[:auto.index('</section>')]
app=open(src+'app.js').read()
def bloc(a,b):
    i=app.index(a); j=app.index(b,i); return app[i:j]
ped=bloc('const PED = [','/* ================================================================== verificare */')
curba=bloc('function curbaTeoretica(','function deseneazaLive(')
dlive=bloc('function deseneazaLive(','/* ================================================================== determinări */')
tmpl=open('/home/claude/ar/tools/l2_controller.js').read()
out=tmpl.replace('/*@@SIM_HTML@@*/', '`'+simsec.replace('`','\\`').replace('${','\\${')+'`')\
  .replace('/*@@AUTO_HTML@@*/', '`'+auto.replace('`','\\`').replace('${','\\${')+'`')\
  .replace('/*@@SVG@@*/', svgpart)\
  .replace('/*@@CONTINUT@@*/', cont)\
  .replace('/*@@PED@@*/', ped)\
  .replace('/*@@CURBA@@*/', curba+dlive)
import re
out=re.sub(r'\bsim\.log\b','Cadru.D.log',out)
open('/home/claude/ar/mf/l2/lab.js','w').write(out)
print(len(out))
