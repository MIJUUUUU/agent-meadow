const {createInterface}=require('node:readline');
let initialized=false;
const send=m=>process.stdout.write(JSON.stringify(m)+'\n');
createInterface({input:process.stdin}).on('line',line=>{
  const m=JSON.parse(line);
  if(m.method==='initialize')send({id:m.id,result:{}});
  else if(m.method==='initialized')initialized=true;
  else if(!initialized)send({id:m.id,error:{message:'not initialized'}});
  else if(m.method==='thread/start')send({id:m.id,result:{thread:{id:'thread-1'}}});
  else if(m.method==='turn/start'){
    send({id:m.id,result:{turn:{id:'turn-1'}}});
    send({id:99,method:'item/commandExecution/requestApproval',params:{threadId:'thread-1',command:'echo hello'}});
  }else if(m.id===99&&m.result){
    send({method:'serverRequest/resolved',params:{requestId:99,threadId:'thread-1'}});
    send({method:'turn/completed',params:{turn:{status:'completed'}}});
  }else send({id:m.id,error:{message:'unsupported test method'}});
});
