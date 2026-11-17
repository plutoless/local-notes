import {actionLabels, initiativeLabels, statusLabel, bindDialog, button, feedback, icon} from './presentation.js';
import {escapeHTML as esc} from './core.js';

const types = {action: '行动', initiative: '事项', topic: '主题', candidate: '建议'};
const fields = {description: '内容', title: '名称', status: '状态', goal: '目标', progress: '当前进展', dueDate: '截止日期', waitingOn: '等待对象或条件', initiativeId: '所属事项标识', focusPosition: '重点排序', placement: '建议归属', reasoning: '建议理由', relevance: '当前相关性', deleted: '删除状态', sources: '来源引用', review: '已保存的审核决定', candidateType: '建议类型'};
const candidateTypes = {action: '行动', initiative: '事项', progress: '进展', relationship: '关联'};
const text = (key, value) => value == null || value === '' ? '未设置' : key === 'sources' ? (value.length ? value.map(source => `${source.path}：${source.quote}${source.role ? `（${source.role === 'reference' ? '参考资料' : source.role === 'working-note' ? '工作笔记' : source.role}）` : ''}`).join('\n') : '无来源引用') : key === 'review' ? `审核进度：${value.state === 'done' ? '已完成' : '待完成'}；决定：${({confirm:'确认',ignore:'忽略',later:'以后再做',reference:'作为参考',attach:'关联'})[value.decision] || '待核对'}` : key === 'status' ? (value === 'suggested' ? '待审核' : statusLabel(value)) : key === 'candidateType' ? candidateTypes[value] || value : key === 'deleted' ? (value ? '已删除' : '保留') : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

// Presentation only: repositories retain ownership of validation and revision ancestry.
export class SyncScreen {
  constructor(repositories, notice, changed) {
    this.repositories = repositories; this.notice = notice; this.changed = changed; this.dirty = false;
    this.panel = document.createElement('section'); this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '同步检查'); this.panel.className = 'sync-panel'; this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-modal', 'true');
    document.body.append(this.panel); bindDialog(this.panel);
    // Handle Escape before the shared dialog's default close, preserving unsaved work.
    this.panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.close(); }
    }, true);
    this.opener = button('同步检查', () => this.refresh(true));
    this.opener.innerHTML = icon('sync') + '同步检查';
    document.querySelector('nav').append(this.opener);
    const refresh = () => this.refresh(false);
    window.addEventListener('focus', refresh); window.addEventListener('reference-change', refresh);
  }
  canLeave() {
    if (!this.dirty && !this.saving) return true;
    this.panel.hidden = false;
    feedback(this.status, '还有解决内容未保存。请继续编辑并保存，或明确放弃编辑。');
    return false;
  }
  close() {
    if (!this.canLeave()) return;
    this.panel.hidden = true;
  }
  async refresh(show) {
    if (show) { this.panel.hidden = false; this.panel.querySelector('button')?.focus(); }
    if (this.running || this.saving) return;
    if (this.dirty) { if (show) this.canLeave(); return; }
    if (show) this.panel.hidden = false;
    this.running = true;
    this.render(); for (const article of this.panel.querySelectorAll('article')) article.inert = true; feedback(this.status, '正在检查本地版本…'); this.panel.setAttribute('aria-busy', 'true');
    try {
      const warnings = [];
      for (const repo of this.repositories()) {
        if (!repo.ready) await repo.open();
        const result = await repo.serialize(() => repo.recover()); warnings.push(...result.warnings);
      }
      this.warnings = warnings;
      this.render();
      if (!this.panel.hidden && !this.panel.contains(document.activeElement)) this.panel.querySelector('button')?.focus();
      await this.changed();
    } catch (error) {
      feedback(this.status, '检查未完成。请确认目录可用，然后点击「重新检查」；原文件仍保留。', error.message);
    } finally { this.running = false; this.panel.setAttribute('aria-busy', 'false'); this.refreshButton.disabled = false; }
  }
  render() {
    this.panel.innerHTML = '<h2>同步检查</h2><p>这里只检查本地版本；无法确认其他设备是否收到。</p>';
    this.panel.append(button('关闭检查', () => this.close()));
    this.refreshButton = button('重新检查', () => this.refresh(true)); this.refreshButton.disabled = this.running; this.panel.append(this.refreshButton);
    this.status = document.createElement('div'); this.status.setAttribute('role', 'status'); this.panel.append(this.status);
    if (this.saved) feedback(this.status, this.saved);
    if (this.warnings?.length) {
      const warning = document.createElement('div'); feedback(warning, '部分版本需要核对；原文件和历史均保留。缺失历史请等待文件到达后重新检查；损坏文件请从保留的副本恢复。', this.warnings.join('\n')); this.panel.append(warning);
    }
    let count = 0;
    for (const repo of this.repositories()) for (const [id, conflict] of repo.conflicts || []) {
      count++;
      const article = document.createElement('article');
      const name = conflict.versions.find(v => v.title || v.description);
      const blocked = conflict.incomplete || conflict.cyclic;
      article.innerHTML = `<h3>${esc(types[repo.entityType])}：${esc(name?.title || name?.description || '未命名记录')}</h3><p>${conflict.cyclic ? '版本历史形成循环，暂不能保存。请从保留的副本恢复历史，再重新检查。' : conflict.incomplete ? '缺少前序版本，暂不能保存。请等待文件到达后重新检查。' : '发现冲突版本，请比较后选择或合并。'}</p><h4>1. 比较版本</h4>`;
      const draft = {value: structuredClone(conflict.tips[0] || conflict.versions[0])};
      const editor = document.createElement('div'); editor.className = 'sync-editor';
      const editStatus = document.createElement('p'); editStatus.setAttribute('role', 'status'); editStatus.textContent = '尚未选择解决版本。';
      let selected = false;
      const markDirty = () => { selected = true; this.dirty = true; for (const other of this.panel.querySelectorAll('article')) if (other !== article) other.inert = true; editStatus.textContent = '解决内容尚未保存。原版本均会保留。'; };
      const advanced = document.createElement('details'); advanced.innerHTML = '<summary>高级：完整 JSON 与版本诊断</summary>';
      const json = document.createElement('textarea'); json.rows = 12; json.setAttribute('aria-label', '合并版本 JSON');
      const renderEditor = () => {
        editor.replaceChildren();
        const keys = repo.entityType === 'initiative' ? ['title', 'goal', 'progress', 'status'] : repo.entityType === 'action' ? ['description', 'status', 'dueDate', 'waitingOn', 'initiativeId', 'focusPosition'] : repo.entityType === 'topic' ? ['description'] : ['description', 'placement', 'reasoning', 'relevance'];
        for (const key of keys) {
          const label = document.createElement('label'); label.textContent = fields[key];
          const control = document.createElement(key === 'status' ? 'select' : ['dueDate', 'focusPosition'].includes(key) ? 'input' : 'textarea');
          if (key === 'status') for (const [value, title] of Object.entries(repo.entityType === 'initiative' ? initiativeLabels : actionLabels)) { const option = document.createElement('option'); option.value = value; option.textContent = title; control.append(option); }
          if (key === 'dueDate') control.type = 'date';
          if (key === 'focusPosition') control.type = 'number';
          control.dataset.field = key; control.value = draft.value[key] ?? ''; control.disabled = Boolean(blocked);
          control.oninput = () => { draft.value[key] = control.type === 'number' ? (control.value === '' ? null : Number(control.value)) : control.value; json.value = JSON.stringify(draft.value, null, 2); markDirty(); };
          label.append(control); editor.append(label);
        }
        json.value = JSON.stringify(draft.value, null, 2);
      };
      for (const [index, version] of conflict.versions.entries()) {
        const details = document.createElement('details'); details.className = 'sync-version'; details.open = conflict.tips.some(t => t.revision === version.revision);
        details.innerHTML = `<summary>版本 ${index + 1} · ${esc(version.title || version.description)} · ${conflict.tips.some(t => t.revision === version.revision) ? '待解决分支' : '历史版本'}</summary>`;
        const context = document.createElement('p'); context.textContent = `修改时间：${version.modifiedAt}；${version.deleted ? '已删除' : '保留记录'}`; details.append(context);
        const values = document.createElement('dl');
        for (const [key, label] of Object.entries(fields)) if (Object.hasOwn(version, key)) {
          const term = document.createElement('dt'), value = document.createElement('dd'); term.textContent = label; value.textContent = text(key, version[key]);
          if (conflict.versions.some(other => JSON.stringify(other[key]) !== JSON.stringify(version[key]))) term.textContent += ' · 有差异';
          values.append(term, value);
        }
        details.append(values);
        const choose = button(`选择版本 ${index + 1}`, () => {
          if (this.dirty) { feedback(this.status, '选择其他版本会替换尚未保存的编辑。请先保存，或点击「放弃编辑」。'); return; }
          selected = true; draft.value = structuredClone(version); renderEditor(); markDirty(); editor.querySelector('textarea, input, select')?.focus();
        }); choose.disabled = Boolean(blocked); details.append(choose); article.append(details);
      }
      const heading = document.createElement('h4'); heading.textContent = '2. 审核与编辑解决内容'; article.append(heading, editStatus, editor);
      renderEditor();
      const diagnostics = document.createElement('pre'); diagnostics.textContent = JSON.stringify({entityId: id, tips: conflict.tips.map(v => v.revision), versions: conflict.versions}, null, 2);
      json.disabled = Boolean(blocked); json.oninput = () => {
        markDirty();
        try {
          const parsed = JSON.parse(json.value);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Invalid resolution');
          draft.value = parsed;
          for (const control of editor.querySelectorAll('[data-field]')) { control.disabled = Boolean(blocked); control.value = parsed[control.dataset.field] ?? ''; }
        } catch { for (const control of editor.querySelectorAll('[data-field]')) control.disabled = true; }
      }; advanced.append(diagnostics, json); article.append(advanced);
      article.append(button('放弃编辑', () => { selected = false; this.dirty = false; this.saved = ''; this.render(); }));
      const consequence = document.createElement('p'); consequence.textContent = '保存会创建引用全部待解决分支的新版本；原始历史和来源笔记均保留。删除状态、来源引用和审核决定沿用所选版本，可在高级详情核对。'; article.append(consequence);
      const save = button('3. 保存解决结果到本地', async () => {
        if (!selected) { feedback(this.status, '请先选择一个版本，再审核需要保留的内容。'); return; }
        this.saving = true; article.inert = true;
        try {
          await repo.resolve(id, JSON.parse(json.value), conflict.tips.map(record => record.revision));
          this.dirty = false; this.saved = '解决结果已保存到本地；无法确认其他设备是否收到。';
        } catch (error) { feedback(this.status, '解决结果未保存。请核对内容和目录后重试；编辑仍保留。若版本已变化，请放弃编辑并重新检查。', error.message); }
        finally { this.saving = false; article.inert = false; }
        if (!this.dirty) await this.refresh(true);
      }, {primary: true}); save.disabled = Boolean(blocked); article.append(save); this.panel.append(article);
    }
    if (!count) this.panel.append(Object.assign(document.createElement('p'), {textContent: this.warnings?.length ? '未发现可解决的冲突，请先核对上方异常详情。' : '现有版本中未发现待处理冲突。'}));
  }
}
