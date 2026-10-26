'use strict';
function claudeState(e) {
  const tool = e.tool_name || '';
  switch (e.hook_event_name) {
    case 'SessionStart': return ['idle', '준비됐어요!'];
    case 'UserPromptSubmit': return ['thinking', '생각을 모으는 중…'];
    case 'PermissionRequest': return ['waiting', tool === 'ExitPlanMode' ? '계획을 확인해 주세요!' : '실행을 허락해 주세요!'];
    case 'Notification': return ['permission_prompt', 'idle_prompt', 'elicitation_dialog'].includes(e.notification_type) ? ['waiting', '확인이 필요해요!'] : null;
    case 'PreToolUse': return ['AskUserQuestion', 'ExitPlanMode'].includes(tool) ? ['waiting', tool === 'ExitPlanMode' ? '계획을 확인해 주세요!' : '질문에 답해 주세요!'] : ['working', /Read|Glob|Grep/.test(tool) ? '파일을 살펴보는 중' : /Edit|Write/.test(tool) ? '코드를 다듬는 중' : '도구를 실행하는 중'];
    case 'PostToolUse': return ['thinking', '다음 단계를 생각 중…'];
    case 'PostToolUseFailure': return ['thinking', '결과를 다시 살펴볼게요'];
    case 'Stop': return ['done', '다 했어요!'];
    case 'SessionEnd': return ['sleeping', '다음에 또 만나요'];
    case 'SubagentStart': return ['working', '도우러 왔어요!'];
    case 'SubagentStop': return ['done', '도움 작업 끝!'];
    default: return null;
  }
}
module.exports = { claudeState };
