from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
html = (root/'media/index.html').read_text()
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', '', html)
html = html.replace('<link rel="stylesheet" href="__CSS__">', '<style>'+(root/'media/garden.css').read_text()+'</style>')
html = html.replace('<script nonce="__NONCE__" src="__JS__"></script>', '<script>'+(root/'media/garden.js').read_text()+'''</script><script>
let n=0;
const states=[['working','로그인 화면 만드는 중!'],['waiting','계획을 확인해 주세요!'],['sleeping','잠깐 쉬는 중…'],['thinking','생각을 모으는 중…'],['done','다 했어요!'],['idle','산책하기 좋은 날이에요']];
function render(){window.postMessage({type:'state',pets:['codex','claude'].map((p,i)=>({id:p,provider:p,name:p==='codex'?'Codex':'Claude',state:states[(n+i)%states.length][0],message:states[(n+i)%states.length][1],demo:true}))},'*');}
render();setInterval(()=>{n++;render();},6500);
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>{n++;render();}));
</script>''')
out=root/'dist/preview.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(out)
