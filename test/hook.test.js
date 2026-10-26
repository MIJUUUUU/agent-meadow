const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const path=require('node:path');
test('Claude hook forwards state and session authentication, excludes private prompt and tool content',async()=>{
  let received;
  const server=http.createServer((req,res)=>{let text='';req.on('data',c=>text+=c);req.on('end',()=>{received={headers:req.headers,body:JSON.parse(text)};res.writeHead(204).end();});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const proc=spawn(process.execPath,[path.join(__dirname,'../scripts/claude-hook.js')],{env:{...process.env,MEADOW_PORT:String(server.address().port),MEADOW_TOKEN:'test-secret',MEADOW_SESSION:'terminal-1'}});
    proc.stdin.end(JSON.stringify({hook_event_name:'PermissionRequest',session_id:'session-1',tool_name:'Bash',tool_input:{command:'private'},prompt:'secret'}));
    let stdout='';proc.stdout.on('data',c=>stdout+=c);
    const code=await new Promise(r=>proc.on('close',r));
    assert.equal(code,0);assert.equal(stdout,'');
    assert.equal(received.headers.authorization,'Bearer test-secret');assert.equal(received.headers['x-meadow-session'],'terminal-1');
    assert.deepEqual(received.body,{hook_event_name:'PermissionRequest',session_id:'session-1',tool_name:'Bash'});
  }finally{server.close();}
});
