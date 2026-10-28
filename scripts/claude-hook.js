'use strict';
// Observer only: never emits a Claude permission decision.
const http = require('node:http');
const {taskLabel} = require('../src/labels');
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { if (data.length < 262144) data += c; });
process.stdin.on('end', () => {
  try {
    const e = JSON.parse(data);
    const body = JSON.stringify({hook_event_name:e.hook_event_name, session_id:e.session_id, agent_id:e.agent_id, tool_name:e.tool_name, notification_type:e.notification_type,
      task_label:e.hook_event_name==='UserPromptSubmit'?taskLabel(e.prompt):undefined,
      agent_type:typeof e.agent_type==='string'?taskLabel(e.agent_type,'도우미'):undefined});
    const request = http.request({hostname:'127.0.0.1', port:Number(process.env.MEADOW_PORT), path:'/event', method:'POST', headers:{'Authorization':'Bearer '+process.env.MEADOW_TOKEN, 'X-Meadow-Session':process.env.MEADOW_SESSION, 'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}, timeout:1500}, r => r.resume());
    request.on('error', () => {}); request.on('timeout', () => request.destroy()); request.end(body);
  } catch {}
});
