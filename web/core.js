export function titleOf(text,path){return text.match(/^# (.+)$/m)?.[1] || path.split('/').pop().replace(/\.md$/i,'');}
export function tasksOf(text){let fenced=false;return text.split('\n').flatMap((line,index)=>{if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;return [];}if(fenced)return [];const m=line.match(/^(\s*[-*+] \[)([ xX])(\] )(.+?)(\r?)$/);return m?[{line:index,done:m[2].toLowerCase()==='x',text:m[4]}]:[];});}
export function toggleTask(text,index,done){const lines=text.split('\n');if(!tasksOf(text).some(t=>t.line===index))throw Error('待办位置已改变，请刷新');lines[index]=lines[index].replace(/^(\s*[-*+] \[)[ xX](\])/,(_,a,b)=>a+(done?'x':' ')+b);return lines.join('\n');}
export function withTitle(text,title){return /^# .+$/m.test(text)?text.replace(/^# .+$/m,()=>`# ${title}`):`# ${title}\n\n${text}`;}
export function safePath(path){return !path.startsWith('/') && !path.includes('\\') && path.split('/').every(p=>p && p!=='.' && p!=='..' && !p.startsWith('.') && !['credentials','localnotesdata'].includes(p.toLowerCase())) && /\.md$/i.test(path);}
export const escapeHTML=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderMarkdown(text, {sourceLines = false} = {}) {
  let fenced = false, list = '';
  const closeList = () => { const end = list ? `</${list}>` : ''; list = ''; return end; };
  const lines = text.split('\n');
  const tasks = new Map(tasksOf(text).map(task => [task.line, task]));
  const html = lines.map((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return closeList() + (fenced ? '<pre><code>' : '</code></pre>'); }
    if (fenced) return escapeHTML(line) + '\n';
    const task = tasks.get(index);
    if (task) return closeList() + `<label class="checkline"><input type="checkbox" aria-label="${escapeHTML(task.text)}" data-line="${index}" ${task.done ? 'checked' : ''}><span>${escapeHTML(task.text)}</span></label>`;
    const value = escapeHTML(line).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const item = value.match(/^\s*(?:[-*+] |(\d+)\. )(.*)$/);
    if (item) { const type = item[1] ? 'ol' : 'ul'; const start = list === type ? '' : closeList() + (type === 'ol' ? `<ol start="${Number(item[1])}">` : '<ul>'); list = type; return start + `<li>${item[2]}</li>`; }
    const end = closeList(), heading = value.match(/^(#{1,6}) (.*)$/);
    if (heading) return end + `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;
    if (value.startsWith('&gt; ')) return end + `<blockquote>${value.slice(5)}</blockquote>`;
    return end + (value ? `<p>${value}</p>` : '');
  }).map((html, index) => sourceLines ? html.replace(/<(h[1-6]|p|li|label|blockquote|pre)(?=[ >])/, `<$1 data-source-line="${index}"`) : html).join('\n');
  return html + closeList() + (fenced ? '</code></pre>' : '');
}
