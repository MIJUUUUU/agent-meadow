from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
html = (root/'media/index.html').read_text()
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', '', html)
html = html.replace('<link rel="stylesheet" href="__CSS__">', '<style>'+(root/'media/garden.css').read_text().replace("url('stars.svg')", "url('../media/stars.svg')")+'</style>')
html = html.replace('<script nonce="__NONCE__" src="__JS__"></script>', '<script>'+(root/'media/garden.js').read_text()+'</script>')
out=root/'dist/preview.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(out)
