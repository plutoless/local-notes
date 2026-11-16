import {escapeHTML as esc} from './core.js';

// One review surface serves every synchronized confirmed-record type.
export class SyncScreen {
  constructor(repositories, notice, changed) {
    this.repositories = repositories; this.notice = notice; this.changed = changed;
    this.panel = document.createElement('section'); this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'Synchronization review');
    document.querySelector('.app').append(this.panel);
    const button = document.createElement('button'); button.textContent = 'Sync review / Refresh';
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
      if (show || this.panel.querySelector('article')) this.panel.hidden = false;
      if (show && warnings.length) this.notice(warnings.join('\n'));
      await this.changed();
    } finally { this.running = false; }
  }
  render() {
    this.panel.innerHTML = '<h2>Synchronization review</h2><p>Saved locally does not confirm receipt on another device. Files are transferred by Syncthing.</p>';
    const close = document.createElement('button'); close.textContent = 'Close review'; close.onclick = () => { this.panel.hidden = true; }; this.panel.append(close);
    let count = 0;
    for (const repo of this.repositories()) for (const [id, conflict] of repo.conflicts || []) {
      count++;
      const article = document.createElement('article');
      article.innerHTML = `<h3>${esc(repo.entityType)} · ${esc(id)}</h3><p>${conflict.incomplete ? 'Synchronization incomplete: waiting for parent revisions.' : conflict.cyclic ? 'Invalid cyclic history; source files retained.' : 'Conflicting versions: compare, select or merge below.'}</p>`;
      const editor = document.createElement('textarea'); editor.rows = 12; editor.setAttribute('aria-label', 'Merged version JSON');
      for (const version of conflict.versions) {
        const details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre');
        summary.textContent = `${version.description} · ${version.status} · ${version.revision}${version.deleted ? ' · Deleted' : ''}`;
        pre.textContent = JSON.stringify(version, null, 2); details.append(summary, pre);
        const select = document.createElement('button'); select.textContent = 'Use this version as resolution'; select.onclick = () => { editor.value = JSON.stringify(version, null, 2); };
        details.append(select); article.append(details);
      }
      editor.value = JSON.stringify(conflict.tips[0] || conflict.versions[0], null, 2); article.append(editor);
      const save = document.createElement('button'); save.textContent = 'Save selected / merged resolution locally'; save.disabled = conflict.incomplete || conflict.cyclic;
      save.onclick = async () => {
        try { save.disabled = true; await repo.resolve(id, JSON.parse(editor.value)); this.notice('Resolution saved locally; remote receipt is not verified.'); await this.refresh(true); }
        catch (error) { this.notice(error.message); } finally { save.disabled = conflict.incomplete || conflict.cyclic; }
      };
      article.append(save); this.panel.append(article);
    }
    if (!count) this.panel.append(Object.assign(document.createElement('p'), {textContent: 'No unresolved conflicts found in the available revisions.'}));
  }
}
