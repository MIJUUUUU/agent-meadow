'use strict';
// Read-only compatibility adapter for local conversation logs. No resume or writes.
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {taskLabel}=require('./labels');
const LIMIT=256*1024;
const within=(root,file)=>{const r=path.relative(root,file);return r===''||(!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep));};
function roots(){return [{provider:'codex',root:path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions')},{provider:'claude',root:path.join(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'projects')}];}
function records(text){return text.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});}
function snapshot(provider,events,mtime,now=Date.now()) {
  const result={state:'idle',message:'기록 연결 · 원래 대화에서 계속하세요',task:'기존 대화',cwd:null,session:null};
  let lastActivity=0;
  let title;
  const set=(state,message,e)=>{result.state=state;result.message=message;lastActivity=Date.parse(e.timestamp)||mtime;};
  for(const e of events){
    const p=e.payload||{};
    if(provider==='codex'){
      if(e.type==='session_meta'){result.cwd=p.cwd;result.session=p.id||p.session_id;if(p.title||p.name)title=taskLabel(p.title||p.name,'기존 대화');}
      if(e.type==='event_msg'){
        if(p.type==='task_started')set('thinking','응답 생성 기록이 있어요',e);
        if(p.type==='task_complete')set('done','답변이 완료됐어요',e);
        if(p.type==='turn_aborted')set('idle','작업이 중단됐어요',e);
      }
      if(e.type==='response_item'){
        if(['function_call','custom_tool_call'].includes(p.type))set('working','도구 사용 기록이 있어요',e);
        if(['function_call_output','custom_tool_call_output'].includes(p.type))set('thinking','도구 결과를 확인하는 중',e);
      }
    }else{
      if(e.cwd)result.cwd=e.cwd;
      if(e.sessionId)result.session=e.sessionId;
      if(e.type==='ai-title'&&e.aiTitle)title=taskLabel(e.aiTitle,'기존 대화');
      if(e.type==='user'){
        const content=e.message?.content;
        if(typeof content==='string'&&!e.isMeta){set('thinking','요청을 처리하는 중',e);}
        else if(Array.isArray(content)&&content.some(b=>b.type==='tool_result'))set('thinking','도구 결과를 확인하는 중',e);
        else if(Array.isArray(content)&&!e.isMeta){if(content.some(b=>b.type==='text'))set('thinking','요청을 처리하는 중',e);}
      }
      if(e.type==='assistant'){
        const content=e.message?.content||[];
        const tool=Array.isArray(content)&&content.find(b=>b.type==='tool_use');
        if(tool)set('working','도구 사용 기록이 있어요',e);
        else if(e.message?.stop_reason==='end_turn')set('done','답변이 완료됐어요',e);
      }
      if(e.type==='system'&&e.subtype==='turn_duration')set('done','답변이 완료됐어요',e);
    }
  }
  if(title)result.task=title;
  // Logs cannot distinguish a silent long-running command from a closed client.
  if(['working','thinking'].includes(result.state)&&now-lastActivity>120000){result.state='idle';result.message='최근 상태 미확인 · 원래 대화를 확인해 주세요';}
  return result;
}
async function readSnapshot(file,provider){
  const handle=await fs.open(file,'r');
  try{
    const stat=await handle.stat();
    const head=Buffer.alloc(Math.min(stat.size,LIMIT));await handle.read(head,0,head.length,0);
    let data=head.toString('utf8');
    if(stat.size>LIMIT){const tail=Buffer.alloc(LIMIT);await handle.read(tail,0,LIMIT,stat.size-LIMIT);const text=tail.toString('utf8');data+='\n'+text.slice(text.indexOf('\n')+1);}
    return {...snapshot(provider,records(data),stat.mtimeMs),mtime:stat.mtimeMs};
  }finally{await handle.close();}
}
async function discover(workspaces){
  const candidates=[];
  for(const {provider,root} of roots()){
    let visited=0;
    async function walk(dir,depth){
      if(depth>6||visited>12000)return;
      let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{return;}
      entries.sort((a,b)=>b.name.localeCompare(a.name));
      for(const entry of entries){
        if(++visited>12000)break;
        const file=path.join(dir,entry.name);
        if(entry.isDirectory())await walk(file,depth+1);
        else if(entry.isFile()&&entry.name.endsWith('.jsonl')){
          try{const stat=await fs.stat(file);candidates.push({provider,file,mtime:stat.mtimeMs});}catch{}
        }
      }
    }
    await walk(root,0);
  }
  const found=[];
  for(const c of candidates.sort((a,b)=>b.mtime-a.mtime).slice(0,150)){
    try{const s=await readSnapshot(c.file,c.provider);if(s.cwd&&workspaces.some(root=>within(root,s.cwd)))found.push({...c,...s});}catch{}
  }
  return found;
}
function observe(session,onUpdate,onMissing,onError=()=>{}){
  let closed=false,busy=false;
  async function tick(){
    if(closed||busy)return;busy=true;
    try{const data=await readSnapshot(session.file,session.provider);if(!closed)onUpdate(data);}
    catch(e){if(!closed){if(e.code==='ENOENT'){closed=true;clearInterval(timer);onMissing();}else onError(e);}}
    finally{busy=false;}
  }
  const timer=setInterval(tick,3000);tick();
  return {dispose(){closed=true;clearInterval(timer);}};
}
module.exports={discover,observe,readSnapshot,snapshot,records,within};
