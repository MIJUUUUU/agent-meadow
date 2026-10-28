const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {projectDirectory}=require('../src/project');
test('uses nearest project marker and never walks outside workspace',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'meadow-project-'));
  try {
    const project=path.join(root,'app');fs.mkdirSync(path.join(project,'src'),{recursive:true});
    fs.writeFileSync(path.join(project,'package.json'),'{}');
    assert.equal(projectDirectory(root,path.join(project,'src','index.js')),project);
    assert.equal(projectDirectory(root,path.join(root,'notes.txt')),root);
    assert.equal(projectDirectory(root,path.join(root,'..','outside','file.js')),root);
    assert.equal(projectDirectory(root),root);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
