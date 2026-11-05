"""macOS: capture the current panel and transparent desktop UI using sample states."""
from pathlib import Path
import re, shutil, subprocess, tempfile
root = Path(__file__).resolve().parent.parent
output = root / 'docs/images'
with tempfile.TemporaryDirectory(prefix='meadow-capture-') as temp:
    temp = Path(temp)
    media = temp / 'media'
    shutil.copytree(root / 'media', media)
    html = (media / 'index.html').read_text()
    html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', '', html)
    html = html.replace('__CSS__', 'garden.css').replace('__JS__', 'garden.js')
    (media / 'capture-garden.html').write_text(html)
    subprocess.run(['xcrun', 'swiftc', str(root / 'scripts/capture.swift'), '-module-cache-path', str(temp / 'cache'), '-framework', 'Cocoa', '-framework', 'WebKit', '-o', str(temp / 'capture')], check=True)
    subprocess.run([str(temp / 'capture'), str(media), str(output)], check=True, timeout=30)
