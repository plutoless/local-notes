import test from 'node:test';import assert from 'node:assert/strict';import {tasksOf,toggleTask,safePath,renderMarkdown,withTitle} from '../web/core.js';
test('task writeback preserves CRLF, nesting, and surrounding text',()=>{const original='# Meeting\r\n\r\n  - [ ] Call Chen\r\n- [x] Done\r\n';assert.equal(toggleTask(original,2,true),'# Meeting\r\n\r\n  - [x] Call Chen\r\n- [x] Done\r\n');assert.equal(tasksOf(original).length,2);});
test('code examples must never become live tasks',()=>{const text='```md\n- [ ] example\n```\n- [ ] actual';assert.deepEqual(tasksOf(text),[{line:3,done:false,text:'actual'}]);assert.throws(()=>toggleTask(text,1,true));});
test('paths exclude traversal, hidden folders and credentials',()=>{for(const p of ['../a.md','/tmp/a.md','a/../b.md','.git/a.md','Credentials/key.md','LocalNotesData/reference.md','a\\b.md','a//b.md','a.txt'])assert.equal(safePath(p),false,p);assert.equal(safePath('Work/会议.md'),true);});
test('reading view escapes HTML and attribute injection',()=>{const html=renderMarkdown('# <img src=x onerror=alert(1)>\n- [ ] <script>bad</script>');assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('data-line="1"'));});
test('title update preserves dollar signs literally',()=>{assert.equal(withTitle('# Old\n\nText','$& New'),'# $& New\n\nText');});
test('Chinese reading renders semantic lists, quotations and named checkboxes without changing source lines',()=>{const source='# 长标题\n\n中文段落\n\n- 第一项\n- 第二项\n\n> 引用原文\n\n1. 顺序\n\n- [ ] 单独跟进';const html=renderMarkdown(source);assert.match(html, /<ul>/);assert.match(html, /<ol start="1">/);assert.match(html, /<blockquote>/);assert.match(html, /aria-label="单独跟进"/);assert.match(html, /data-line="11"/);assert.equal(toggleTask(source,11,true),source.replace('[ ]','[x]'));});

test('ordered lists preserve the author start number',()=>{assert.match(renderMarkdown('5. 第五步\n6. 第六步'), /<ol start="5"><li>第五步<\/li>/);});

test('tables require delimiter cells and protect escaped pipes, inline code and fences',()=>{
  const html=renderMarkdown('| 项目 | Code |\r\n| :--- | ---: |\r\n| A\\|B | `x|y` |\r\n\n~~~md\n| a | b |\n| --- | --- |\n~~~');
  assert.equal((html.match(/<table>/g)||[]).length,1);
  assert.match(html,/<th scope="col">项目<\/th>/); assert.match(html,/<td>A\|B<\/td><td><code>x\|y<\/code>/);
  for(const text of ['literal | prose','`a|b`\n--- | ---','a | b\n--- | invalid']) assert.ok(!renderMarkdown(text).includes('<table>'));
});
test('reader links and table cells never execute markup or unsafe protocols',()=>{
  const html=renderMarkdown('A | B\n--- | ---\n<img onerror=x> | [bad](javascript:alert)\n\n[web](https://example.com/?q="x") [mail](mailto:a@example.com) `**literal**`');
  assert.ok(!html.includes('<img')); assert.ok(!html.includes('href="javascript:')); assert.match(html,/href="https:\/\/example.com/); assert.match(html,/<code>\*\*literal\*\*<\/code>/);
  assert.match(renderMarkdown('- [ ] original',{readOnly:true}),/disabled/);
});
