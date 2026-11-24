import base64,re
p='/home/claude/game/index.html'; s=open(p).read()
lib=open('/home/claude/g3d/g3d.bundle.js').read(); glb=base64.b64encode(open('/home/claude/g3d/player.glb','rb').read()).decode()
i=s.index('<script id="g3dlib">')+len('<script id="g3dlib">'); j=s.index('</script>',i); s=s[:i]+lib+s[j:]
i=s.index('<script type="text/plain" id="g3dglb">')+len('<script type="text/plain" id="g3dglb">'); j=s.index('</script>',i); s=s[:i]+glb+s[j:]
open(p,'w').write(s)
a="loadLocal();\nif (saved) ui.name = "
i=s.find(a); j=s.find('\n',i+len(a))
s=s[:j+1]+"window.__LB={get ui(){return ui},get state(){return state},go:go,FM:FM,render:render,get M(){return ui.match},mkCam:mkCam};\n"+s[j+1:]
open('/home/claude/game/tmp_sub.html','w').write(s)
print('embedded',len(lib),len(glb))
