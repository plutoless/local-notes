// Presentation vocabulary never changes persisted enum values or user content.
export const workspacePageLabels = {focus: '当前重点', notes: '笔记库', favorites: '收藏', actions: '行动', initiatives: '事项', organize: '整理'};
export const actionLabels = {todo: '待办', 'in-progress': '进行中', waiting: '等待中', completed: '已完成', canceled: '已取消'};
export const initiativeLabels = {active: '进行中', later: '以后再做', ended: '已结束'};
export const sourceLabels = {unchanged: '来源未变', available: '来源可用', changed: '来源已修改，请核对引用', valid: '来源可用', unavailable: '来源不可用，请重新关联', missing: '来源缺失，请重新关联', moved: '来源已移动', ambiguous: '找到多个来源，请手动关联'};
export const statusLabel = value => actionLabels[value] || initiativeLabels[value] || sourceLabels[value] || '需要核对';


export function failureMessage(diagnostic) {
  let message = '操作未完成。请检查目录是否可用，然后重试；未保存的编辑仍保留。';
  if (/conflict|CONFLICT|branch/i.test(diagnostic)) message = '发现版本冲突。请打开「同步检查」核对版本后重试，现有内容仍保留。';
  else if (/请填写|请选择|引用原文|required|description|title|date|Choose|Quote|fragment|handle every unfinished/i.test(diagnostic)) message = '内容需要核对。请检查必填项、日期和来源引用后重新保存。';
  else if (/workspace changed/i.test(diagnostic)) message = '笔记目录已切换。请从当前目录重新打开内容。';
  else if (/有效.*路径|路径超出|relative.*path|invalid.*path/i.test(diagnostic)) message = '路径无效。请填写笔记目录内、以 .md 结尾的相对路径，再重试。';
  return message;
}
