import glob, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
parts = ['/* GENERAT AUTOMAT – nu editați aici: modificați comun/config.js, modelele lucrărilor, băncile de întrebări (date.js ale lucrărilor) sau fișierele .gs din server și rulați tools/build_server.py */\n']
parts.append(open(R + 'comun/config.js').read())
parts.append(open(R + 'comun/util.js').read())
modele = sorted(glob.glob(R + '*/l*/model.js')) + sorted(glob.glob(R + '*/e*/model.js'))
for f in modele + sorted(glob.glob(R + '*/l*/date.js')):
    parts.append('\n/* ---- ' + os.path.relpath(f, R) + ' ---- */\n' + open(f).read())
parts.append(open(R + 'server/colocviu.gs').read())
parts.append(open(R + 'server/nucleu.gs').read())
open(R + 'server/Code.gs', 'w').write('\n'.join(parts))
print('ok', len(modele), 'modele')
