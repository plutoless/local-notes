import {statusLabel, bindDialog} from './presentation.js';
import {escapeHTML as esc} from './core.js';

// One review surface serves every synchronized confirmed-record type.
export class SyncScreen {
  constructor(repositories, notice, changed) {
    this.repositories = repositories; this.notice = notice; this.changed = changed;
    this.panel = document.createElement('section'); this.panel.hidden = true;
    this.panel.setAttribute('aria-label', '同步检查'); this.panel.className = 'sync-panel'; this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-modal', 'true');
    document.body.append(this.panel); bindDialog(this.panel);
    const button = document.createElement('button'); button.textContent = '同步检查';
    button.onclick = () => this.refresh(true).catch(error => notice(error.message));
    document.querySelector('nav').append(button);
    window.addEventListener('focus', () => this.refresh(false).catch(error => notice(error.message)));
    window.addEventListener('reference-change', () => this.refresh(false).catch(error => notice(error.message)));
  }
  async refresh(show) {
    if (this.running) return;
    this.running = true;
    try {
      const warnings = [];
      for (const repo of this.repositories()) {
        if (!repo.ready) await repo.open();
        const result = await repo.serialize(() => repo.recover()); warnings.push(...result.warnings);
      }
      this.render();
      if (show || this.panel.querySelector('article')) { this.panel.hidden = false; }
      if (show && warnings.length) this.notice(warnings.join('\n'));
      await this.changed();
    } finally { this.running = false; }
  }
  render() {
    this.panel.innerHTML = '<h2>同步检查</h2><p>本地保存不代表其他设备已收到。文件由 Syncthing 传输。</p>';
    const close = document.createElement('button'); close.textContent = '关闭检查'; close.onclick = () => { this.panel.hidden = true; }; this.panel.append(close);
    let count = 0;
    for (const repo of this.repositories()) for (const [id, conflict] of repo.conflicts || []) {
      count++;
      const article = document.createElement('article');
      article.innerHTML = `<h3>${esc({action: '行动', initiative: '事项', topic: '主题', candidate: '建议'}[repo.entityType] || '记录')}<details><summary>记录详情</summary>${esc(id)}</details></h3><p>${conflict.incomplete ? '同步尚未完整，请等待前序版本到达后刷新。' : conflict.cyclic ? '版本历史异常，原文件仍保留。请检查技术详情。' : '发现冲突版本，请比较后选择或合并。'}</p>`;
      const editor = document.createElement('textarea'); editor.rows = 12; editor.setAttribute('aria-label', '合并版本 JSON');
      for (const version of conflict.versions) {
        const details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre');
        summary.textContent = `${version.description} · ${statusLabel(version.status)} · ${version.revision}${version.deleted ? ' · 已删除' : ''}`;
        pre.textContent = JSON.stringify(version, null, 2); details.append(summary, pre);
        const select = document.createElement('button'); select.textContent = '选择此版本'; select.onclick = () => { editor.value = JSON.stringify(version, null, 2); };
        details.append(select); article.append(details);
      }
      editor.value = JSON.stringify(conflict.tips[0] || conflict.versions[0], null, 2); article.append(editor);
      const save = document.createElement('button'); save.textContent = '将选定或合并的版本保存到本地'; save.disabled = conflict.incomplete || conflict.cyclic;
      save.onclick = async () => {
        try { save.disabled = true; await repo.resolve(id, JSON.parse(editor.value), conflict.tips.map(record => record.revision)); this.notice('解决结果已保存到本地，尚未验证其他设备是否收到。', true); await this.refresh(true); }
        catch (error) { this.notice(error.message); } finally { save.disabled = conflict.incomplete || conflict.cyclic; }
      };
      if (save.disabled) { const reason = document.createElement('p'); reason.textContent = '版本历史未完整或存在异常，暂不能保存。请等待同步完成后重新检查。'; article.append(reason); } article.append(save); this.panel.append(article);
    }
    if (!count) this.panel.append(Object.assign(document.createElement('p'), {textContent: '现有版本中未发现待处理冲突。'}));
  }
}
