import glob, os
R='/home/claude/ar/'
parts=['/* GENERAT AUTOMAT – nu editați aici: modificați comun/config.js, modelele lucrărilor sau server/nucleu.gs și rulați tools/build_server.py */\n']
parts.append(open(R+'comun/config.js').read())
parts.append(open(R+'comun/util.js').read())
for f in sorted(glob.glob(R+'*/l*/model.js'))+sorted(glob.glob(R+'*/e*/model.js')):
    parts.append('\n/* ---- '+os.path.relpath(f,R)+' ---- */\n'+open(f).read())
parts.append(open(R+'server/nucleu.gs').read())
open(R+'server/Code.gs','w').write('\n'.join(parts))
print('ok', len(parts)-4, 'modele')
