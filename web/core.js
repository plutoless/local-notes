export function titleOf(text,path){return text.match(/^# (.+)$/m)?.[1] || path.split('/').pop().replace(/\.md$/i,'');}
export function tasksOf(text){let fenced=false;return text.split('\n').flatMap((line,index)=>{if(/^\s*(```|~~~)/.test(line)){fenced=!fenced;return [];}if(fenced)return [];const m=line.match(/^(\s*[-*+] \[)([ xX])(\] )(.+?)(\r?)$/);return m?[{line:index,done:m[2].toLowerCase()==='x',text:m[4]}]:[];});}
export function toggleTask(text,index,done){const lines=text.split('\n');if(!tasksOf(text).some(t=>t.line===index))throw Error('待办位置已改变，请刷新');lines[index]=lines[index].replace(/^(\s*[-*+] \[)[ xX](\])/,(_,a,b)=>a+(done?'x':' ')+b);return lines.join('\n');}
export function withTitle(text,title){return /^# .+$/m.test(text)?text.replace(/^# .+$/m,()=>`# ${title}`):`# ${title}\n\n${text}`;}
export function safePath(path){return !path.startsWith('/') && !path.includes('\\') && path.split('/').every(p=>p && p!=='.' && p!=='..' && !p.startsWith('.') && !['credentials','localnotesdata'].includes(p.toLowerCase())) && /\.md$/i.test(path);}
export const escapeHTML=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Inline content is escaped before creating the small supported markup set.
function inlineMarkdown(text) {
  const tokens = /(`+)([\s\S]*?)\1|\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*(.+?)\*\*/g;
  let html = '', end = 0;
  for (const match of text.matchAll(tokens)) {
    html += escapeHTML(text.slice(end, match.index));
    if (match[1]) html += `<code>${escapeHTML(match[2])}</code>`;
    else if (match[3]) {
      const url = match[4];
      html += /^(https?:\/\/|mailto:)/i.test(url)
        ? `<a href="${escapeHTML(url)}" rel="noreferrer noopener">${escapeHTML(match[3])}</a>` : escapeHTML(match[0]);
    } else html += `<strong>${escapeHTML(match[5])}</strong>`;
    end = match.index + match[0].length;
  }
  return html + escapeHTML(text.slice(end));
}

// Pipes inside escaped text or matched code spans are cell content.
function tableCells(line) {
  const cells = []; let cell = '', separators = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && i + 1 < line.length) { cell += line[i + 1] === '|' ? '|' : line.slice(i, i + 2); i++; continue; }
    if (line[i] === '`') {
      const run = line.slice(i).match(/^`+/)[0], close = line.indexOf(run, i + run.length);
      if (close >= 0) { cell += line.slice(i, close + run.length); i = close + run.length - 1; continue; }
    }
    if (line[i] === '|') { cells.push(cell.trim()); cell = ''; separators++; } else cell += line[i];
  }
  cells.push(cell.trim());
  if (!separators) return null;
  if (!cells[0]) cells.shift();
  if (!cells.at(-1)) cells.pop();
  return cells;
}

export function renderMarkdown(text, {readOnly = false, sourceLines = false} = {}) {
  let fence = null, list = '';
  const closeList = () => { const end = list ? `</${list}>` : ''; list = ''; return end; };
  const lines = text.split(/\r?\n/), html = [];
  const push = (value, line) => html.push(sourceLines ? value.replace(/<(h[1-6]|p|li|label|blockquote|pre|div)(?=[ >])/, `<$1 data-source-line="${line}"`) : value);
  const tasks = new Map(tasksOf(text).map(task => [task.line, task]));
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index], marker = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) { fence = null; push('</code></pre>', index); }
      else push(escapeHTML(line) + '\n', index);
      continue;
    }
    if (marker) { fence = marker[1]; push(closeList() + '<pre><code>', index); continue; }
    const header = tableCells(line), delimiter = tableCells(lines[index + 1] || '');
    if (header?.length && delimiter?.length === header.length && delimiter.every(cell => /^:?-{3,}:?$/.test(cell))) {
      const tableStart = index;
      let table = closeList() + '<div class="markdown-table" tabindex="0" role="region" aria-label="表格"><table><thead><tr>';
      table += header.map(cell => `<th scope="col">${inlineMarkdown(cell)}</th>`).join('') + '</tr></thead><tbody>';
      index++;
      while (index + 1 < lines.length) {
        const row = tableCells(lines[index + 1]);
        if (!row || /^\s*(?:`{3,}|~{3,}|#{1,6}\s|[-*+]\s|\d+\.\s|>\s)/.test(lines[index + 1])) break;
        index++;
        table += `<tr${sourceLines ? ` data-source-line="${index}"` : ''}>` + header.map((_, i) => `<td>${inlineMarkdown(row[i] || '')}</td>`).join('') + '</tr>';
      }
      push(table + '</tbody></table></div>', tableStart); continue;
    }
    const task = tasks.get(index);
    if (task) { push(closeList() + `<label class="checkline"><input type="checkbox" aria-label="${escapeHTML(task.text)}" data-line="${index}" ${task.done ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span>${escapeHTML(task.text)}</span></label>`, index); continue; }
    const value = inlineMarkdown(line);
    const item = value.match(/^\s*(?:[-*+] |(\d+)\. )(.*)$/);
    if (item) { const type = item[1] ? 'ol' : 'ul'; const start = list === type ? '' : closeList() + (type === 'ol' ? `<ol start="${Number(item[1])}">` : '<ul>'); list = type; push(start + `<li>${item[2]}</li>`, index); continue; }
    const end = closeList(), heading = value.match(/^(#{1,6}) (.*)$/);
    if (heading) push(end + `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`, index);
    else if (value.startsWith('&gt; ')) push(end + `<blockquote>${value.slice(5)}</blockquote>`, index);
    else push(end + (value ? `<p>${value}</p>` : ''), index);
  }
  return html.join('\n') + closeList() + (fence ? '</code></pre>' : '');
}
