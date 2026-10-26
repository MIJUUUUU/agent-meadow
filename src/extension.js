'use strict';
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {Codex} = require('./codex');
const {claudeState} = require('./state');
const {removeFamily} = require('./lifecycle');
const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";
function activate(context) {
  const pets = new Map(), clients = new Map(), terminals = new Map(), requests = new Map(), queues = new Map(), restTimers = new Map();
  const token = crypto.randomBytes(32).toString('hex');
  const output = vscode.window.createOutputChannel('Agent Meadow');
  let view, demo, port;
  const config = () => vscode.workspace.getConfiguration('agentMeadow');
  const publish = () => {view?.webview.postMessage({type:'state',pets:[...pets.values()]}); status.text = '$(heart) Meadow'+([...pets.values()].some(p=>p.state==='waiting') ? ' · 확인 필요' : '');};
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
  status.command = 'agentMeadow.open'; status.tooltip = '작은 에이전트 정원'; status.show();
  function remove(id) {
    removeFamily(pets,id,key=>{
      clearTimeout(restTimers.get(key));restTimers.delete(key);
      requests.delete(key);queues.delete(key);
    });
    publish();
  }
  function update(id, provider, state, message, extra={}) {
    const previous = pets.get(id);
    pets.set(id,{id,provider,name:provider==='codex'?'Codex':'Claude',...previous,state,message,...extra}); publish();
    clearTimeout(restTimers.get(id)); restTimers.delete(id);
    if (state === 'done' && !extra.demo) restTimers.set(id,setTimeout(()=>{restTimers.delete(id);if(pets.get(id)?.state==='done')update(id,provider,'sleeping','잠깐 쉬고 있어요…');},12000));
    if (state === 'waiting' && previous?.state !== 'waiting' && !extra.demo) {
      vscode.window.showInformationMessage(`${provider==='codex'?'Codex':'Claude'}: ${message}`, '확인하기').then(v=>{if(v) inspect(id);});
      if (!vscode.window.state.focused && config().get('nativeNotifications') && process.platform === 'darwin') {
        // Constant text; never interpolates model output into AppleScript.
        const child = spawn('/usr/bin/osascript',['-e','display notification "에이전트가 선택을 기다리고 있어요. VS Code의 Agent Meadow를 열어 주세요." with title "Agent Meadow"']);
        child.on('error',e=>output.appendLine('시스템 알림: '+e.message));
      }
    }
  }
  function resolveRequest(id, requestId) {
    if(requests.get(id)?.msg.id===requestId){
      const next=queues.get(id)?.shift();
      if(next){requests.set(id,next);update(id,'codex','waiting','다음 요청도 확인해 주세요!');}
      else {requests.delete(id);queues.delete(id);update(id,'codex','thinking','다음 단계로 가는 중…');}
    } else if(queues.has(id)) queues.set(id,queues.get(id).filter(e=>e.msg.id!==requestId));
  }
  async function inspect(id) {
    const pending = requests.get(id);
    if (pending) { await answer(id, pending); return; }
    const terminal = terminals.get(id) || terminals.get(pets.get(id)?.parent);
    if (terminal) terminal.show();
    else {output.show(true); await vscode.commands.executeCommand('agentMeadow.open');}
  }
  async function answer(id, entry) {
    if (entry.open) return; entry.open = true;
    const {client, msg} = entry; const p = msg.params || {};
    try {
      let result;
      if (['item/commandExecution/requestApproval','item/fileChange/requestApproval'].includes(msg.method)) {
        output.appendLine('\n승인 요청\n'+JSON.stringify(p,null,2)); output.show(true);
        const choice = await vscode.window.showWarningMessage(p.command || p.reason || '파일 변경 승인이 필요해요. 출력 창에서 변경 정보를 확인해 주세요.',{modal:true,detail:JSON.stringify(p,null,2)},'이번만 허용','거절');
        if (!choice) return;
        result = {decision:choice==='이번만 허용'?'accept':'decline'};
      } else if (msg.method === 'item/tool/requestUserInput') {
        const answers = {};
        for (const q of p.questions || []) {
          let value;
          if (q.options?.length) {
            const selected = await vscode.window.showQuickPick([...q.options.map(o=>({label:o.label,description:o.description})),{label:'직접 입력…'}],{title:q.question,ignoreFocusOut:true});
            if (!selected) return;
            value = selected.label === '직접 입력…' ? await vscode.window.showInputBox({prompt:q.question,ignoreFocusOut:true,password:!!q.isSecret}) : selected.label;
          } else value = await vscode.window.showInputBox({prompt:q.question,ignoreFocusOut:true,password:!!q.isSecret});
          if (value === undefined) return; answers[q.id] = {answers:[value]};
        }
        result = {answers};
      } else return;
      if (requests.get(id) !== entry) return;
      client.send({id:msg.id,result}); resolveRequest(id,msg.id);
    } finally {entry.open=false;}
  }
  const provider = {resolveWebviewView(v) {
    view=v; v.webview.options={enableScripts:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media')]};
    const nonce = crypto.randomBytes(16).toString('hex');
    const asset = file => v.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media',file));
    v.webview.html=fs.readFileSync(path.join(context.extensionPath,'media/index.html'),'utf8').replaceAll('__CSP__',v.webview.cspSource).replaceAll('__NONCE__',nonce).replace('__CSS__',asset('garden.css')).replace('__JS__',asset('garden.js'));
    v.webview.onDidReceiveMessage(async m => {
      try {
        if(m.type==='ready') publish();
        if(m.type==='inspect' && pets.has(m.id)) await inspect(m.id);
        if(m.type==='command' && ['codex','claude','demo'].includes(m.command)) await vscode.commands.executeCommand('agentMeadow.'+m.command);
      } catch(e) {vscode.window.showErrorMessage(e.message);}
    },null,context.subscriptions);
  }};
  const server = http.createServer((req,res) => {
    if(req.method!=='POST'||req.url!=='/event'||req.headers.authorization!=='Bearer '+token) {res.writeHead(403).end();return;}
    let body=''; req.on('data',c=>{body+=c;if(body.length>16384)req.destroy();});
    req.on('end',()=>{
      try {
        const e=JSON.parse(body); const session=req.headers['x-meadow-session'];
        // Session comes from a per-terminal token encoded into the hook URL header.
        const parent=typeof session==='string' && terminals.has(session) ? session : null;
        if(!parent) {res.writeHead(400).end();return;}
        const state=claudeState(e);
        const id=e.agent_id ? parent+':'+String(e.agent_id).slice(0,100) : parent;
        if(e.hook_event_name==='SessionEnd') remove(parent);
        else if(e.hook_event_name==='SubagentStop' && e.agent_id) remove(id);
        else if(state) update(id,'claude',...state,{parent:id===parent?undefined:parent,name:e.agent_id?'Claude 도우미':'Claude'});
        res.writeHead(204).end();
      } catch {res.writeHead(400).end();}
    });
  });
  const listening = new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{port=server.address().port;resolve();});});
  listening.catch(e=>output.appendLine('Claude 연결 서버: '+e.message));
  const register=(name,fn)=>vscode.commands.registerCommand('agentMeadow.'+name,async()=>{try {await fn();}catch(e){vscode.window.showErrorMessage('Agent Meadow: '+e.message);}});
  context.subscriptions.push(output,status,vscode.window.registerWebviewViewProvider('agentMeadow.garden',provider,{webviewOptions:{retainContextWhenHidden:true}}),
    register('open',()=>vscode.commands.executeCommand('agentMeadow.garden.focus')),
    register('claude',async()=>{
      if(!vscode.workspace.isTrusted) return;
      await listening;
      const cwd=vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if(!cwd) throw new Error('먼저 작업 폴더를 열어 주세요.');
      const id='claude-'+crypto.randomUUID();
      const hook=path.join(context.extensionPath,'scripts/claude-hook.js');
      const command=process.platform==='win32' ? '"'+process.execPath+'" "'+hook+'"' : 'ELECTRON_RUN_AS_NODE=1 '+quote(process.execPath)+' '+quote(hook);
      const hooks={};
      for(const event of ['SessionStart','UserPromptSubmit','PermissionRequest','Notification','PreToolUse','PostToolUse','PostToolUseFailure','Stop','SessionEnd','SubagentStart','SubagentStop']) hooks[event]=[{hooks:[{type:'command',command,timeout:3}]}];
      await fs.promises.mkdir(context.globalStorageUri.fsPath,{recursive:true});
      const file=path.join(context.globalStorageUri.fsPath,id+'.json');
      await fs.promises.writeFile(file,JSON.stringify({hooks}),{mode:0o600});
      const configured=config().get('claudePath');
      const fallback=path.join(require('node:os').homedir(),'.local/bin/claude');
      const binary=configured==='claude' && fs.existsSync(fallback) ? fallback : configured;
      const terminal=vscode.window.createTerminal({name:'Claude · Meadow',cwd,shellPath:binary,shellArgs:['--settings',file],env:{MEADOW_PORT:String(port),MEADOW_TOKEN:token,MEADOW_SESSION:id,ELECTRON_RUN_AS_NODE:'1'}});
      terminals.set(id,terminal);update(id,'claude','idle','연결을 기다리고 있어요');terminal.show();
      context.subscriptions.push({dispose(){terminal.dispose();fs.promises.unlink(file).catch(()=>{});}});
    }),
    register('codex',async()=>{
      if(!vscode.workspace.isTrusted) return;
      const cwd=vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if(!cwd) throw new Error('먼저 작업 폴더를 열어 주세요.');
      const prompt=await vscode.window.showInputBox({title:'Codex 토끼에게 부탁하기',prompt:'이 폴더에서 어떤 작업을 할까요?',ignoreFocusOut:true});
      if(!prompt?.trim()) return;
      const id='codex-'+crypto.randomUUID();
      let client;
      client=new Codex(config().get('codexPath'),cwd,msg=>{
        const p=msg.params||{};
        if(msg.id!==undefined && msg.method) {
          if(['item/commandExecution/requestApproval','item/fileChange/requestApproval','item/tool/requestUserInput'].includes(msg.method)) {
            if(requests.has(id)){if(!queues.has(id))queues.set(id,[]);queues.get(id).push({client,msg});}
            else requests.set(id,{client,msg});
            update(id,'codex','waiting',msg.method.includes('UserInput')?'질문에 답해 주세요!':'실행을 허락해 주세요!');
          } else {
            // Unsupported requests fail closed, never grant permissions implicitly.
            client.send({id:msg.id,error:{code:-32601,message:'Agent Meadow does not support this request'}});
            output.appendLine('지원하지 않는 요청: '+msg.method);
          } return;
        }
        if(msg.method==='item/agentMessage/delta') output.append(p.delta||'');
        if(msg.method==='item/started') {
          output.appendLine('\n'+JSON.stringify(p.item));
          if(!requests.has(id)) update(id,'codex',p.item?.type==='reasoning'?'thinking':'working',p.item?.type==='commandExecution'?'명령을 실행하는 중':p.item?.type==='fileChange'?'코드를 다듬는 중':'작업하고 있어요');
        }
        if(msg.method==='serverRequest/resolved') resolveRequest(id,p.requestId);
        if(msg.method==='turn/completed') {
          requests.delete(id);queues.delete(id);
          update(id,'codex',p.turn?.status==='completed'?'done':'idle',p.turn?.status==='completed'?'다 했어요!':'작업이 중단됐어요. 로그를 확인해 주세요');
          // This UI starts one-shot Codex tasks. Release their process after showing the result.
          clearTimeout(restTimers.get(id));
          restTimers.set(id,setTimeout(()=>{remove(id);client.dispose();},12000));
        }
        if(msg.method==='meadow/disconnected') {clients.delete(id);remove(id);}
      },s=>output.append(s));
      clients.set(id,client);update(id,'codex','thinking','연결하는 중…');
      try {
        await client.init();
        const {thread}=await client.request('thread/start',{cwd,approvalPolicy:'on-request',sandbox:'workspace-write'});
        await client.request('turn/start',{threadId:thread.id,input:[{type:'text',text:prompt}]});
        await vscode.commands.executeCommand('agentMeadow.open');
      } catch(e) {client.dispose();throw e;}
    }),
    register('demo',()=>{
      if(demo) {clearInterval(demo);demo=null;pets.delete('demo-codex');pets.delete('demo-claude');publish();return;}
      const states=[['idle','산책하기 좋은 날이에요'],['thinking','생각을 모으는 중…'],['working','로그인 화면 만드는 중!'],['waiting','계획을 확인해 주세요!'],['done','다 했어요!'],['sleeping','잠깐 쉬는 중…']];let n=0;
      const tick=()=>{for(const [i,p] of ['codex','claude'].entries()) update('demo-'+p,p,...states[(n+i*3)%states.length],{demo:true});n++;};tick();demo=setInterval(tick,6500);
    }),
    vscode.window.onDidCloseTerminal(t=>{for(const [id,term] of terminals) if(term===t){terminals.delete(id);remove(id);}}),
    {dispose(){clearInterval(demo);for(const timer of restTimers.values())clearTimeout(timer);server.close();for(const client of clients.values())client.dispose();}}
  );
  publish();
}
module.exports={activate};
