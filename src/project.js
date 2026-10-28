'use strict';
const fs = require('node:fs');
const path = require('node:path');
function projectDirectory(root, file) {
  let dir = file ? path.dirname(file) : root;
  const relative = path.relative(root, dir);
  if (relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) return root;
  while (true) {
    if (['.git','package.json','pyproject.toml','Cargo.toml','go.mod','pom.xml','build.gradle'].some(marker=>fs.existsSync(path.join(dir,marker)))) return dir;
    if (dir === root) return root;
    dir = path.dirname(dir);
  }
}
module.exports = {projectDirectory};
