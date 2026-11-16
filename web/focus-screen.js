import {escapeHTML as esc} from './core.js';
import {isOverdue} from './actions.js';
const $ = selector => document.querySelector(selector);
export class FocusScreen {
  constructor(actions, initiatives, navigate, notice) {
    Object.assign(this, {actions, initiatives, navigate, notice});
    this.limit = 7; this.waitingLimit = 50; this.initiativeLimit = 50;
  }
  button(text, run) {
    const button = document.createElement('button'); button.textContent = text;
    button.onclick = async () => { button.disabled = true; try { await run(); } catch (error) { this.notice(error.message); } finally { button.disabled = false; } };
    return button;
  }
  async show() {
    $('#library-tools').hidden = true;
    const request = this.request = (this.request || 0) + 1;
    const repository = this.actions.repository;
    $('#view-title').textContent = 'Current Focus'; $('#search').hidden = true;
    $('#filters').hidden = true; $('#action-tools').hidden = true; $('#initiative-tools').hidden = true;
    $('#editor').hidden = true; $('#action-editor').hidden = true; $('#initiative-editor').hidden = true; $('#empty').hidden = false;
    const [focused, waiting, initiatives] = await Promise.all([
      repository.query({focus: true, offset: this.focusOffset || 0, limit: this.limit + 1}),
      repository.query({status: 'waiting', limit: this.waitingLimit}),
      this.initiatives.repository.query({status: 'active', limit: this.initiativeLimit})
    ]);
    if (!this.active || repository !== this.actions.repository || request !== this.request) return;
    const list = $('#items'); list.replaceChildren();
    list.append(this.button('Full action list', () => this.navigate('actions')),
      this.button('New action', async () => { await this.navigate('actions'); await this.actions.edit(null); }),
      this.button('New initiative', async () => { await this.navigate('initiatives'); await this.initiatives.edit(null); }),
      this.button('Organize — AI not connected', () => this.notice('AI organization is not connected yet. Create actions and initiatives manually, including offline.')),
      this.button('Refresh confirmed data', async () => {
        const actionResult = await repository.serialize(() => repository.recover());
        const initiativeResult = await this.initiatives.repository.serialize(() => this.initiatives.repository.recover());
        const warnings = [...actionResult.warnings, ...initiativeResult.warnings];
        if (warnings.length) this.notice(warnings.join('\n'));
        await this.show();
      }));
    const section = title => { const node = document.createElement('section'); const heading = document.createElement('h2'); heading.textContent = title; node.append(heading); list.append(node); return node; };
    const focus = section('Current Focus');
    if (!focused.actions.length) focus.append('No focused actions. Choose unfinished actions from the full action list.');
    const shown = focused.actions.slice(0, this.limit);
    for (const [index, action] of shown.entries()) {
      const row = this.actionRow(action);
      row.append(this.button('Remove', async () => { await repository.save({...action, focusPosition: null}, action); await this.show(); }));
      for (const direction of [-1, 1]) {
        if (index + direction < 0 || !focused.actions[index + direction]) continue;
        row.append(this.button(direction < 0 ? 'Move up' : 'Move down', async () => {
          const neighbor = focused.actions[index + direction];
          const beyond = focused.actions[index + direction * 2];
          const position = beyond ? (neighbor.focusPosition + beyond.focusPosition) / 2 : neighbor.focusPosition + direction;
          if (position === neighbor.focusPosition || position === beyond?.focusPosition) throw Error('Focus positions are too close; remove and add this action again.');
          await repository.save({...action, focusPosition: position}, action); await this.show();
        }));
      }
      focus.append(row);
    }
    if (focused.actions.length > this.limit || focused.hasMore) focus.append(this.button('Show more focused actions', async () => { this.limit = Math.min(99, this.limit + 50); await this.show(); }));
    // Beyond one bounded page, navigate explicit pages rather than rendering the collection.
    if (this.focusOffset) focus.append(this.button('Previous focus page', async () => { this.focusOffset = Math.max(0, this.focusOffset - 99); await this.show(); }));
    if (this.limit === 99 && (focused.hasMore || focused.actions.length > this.limit)) focus.append(this.button('Next focus page', async () => { this.focusOffset = (this.focusOffset || 0) + 99; await this.show(); }));
    const followUp = section('Waiting and Follow-up');
    if (!waiting.actions.length) followUp.append('No waiting actions.');
    for (const action of waiting.actions) followUp.append(this.actionRow(action));
    if (waiting.hasMore) followUp.append(this.button('More waiting actions', async () => { this.actions.status = 'waiting'; this.actions.offset = 0; this.actions.search = ''; this.actions.initiativeFilter = ''; $('#search').value = ''; await this.navigate('actions'); $('#action-filter').value = 'waiting'; }));
    const work = section('Continue Working');
    if (!initiatives.actions.length) work.append('No active initiatives. Create one to save a goal and progress.');
    for (const initiative of initiatives.actions) {
      const row = document.createElement('div'); row.className = 'card';
      row.innerHTML = `<h3>${esc(initiative.title)}</h3><p>${esc(initiative.progress || 'No progress summary saved.')}</p>`;
      row.append(this.button('Open initiative', async () => { await this.navigate('initiatives'); await this.initiatives.edit(initiative); })); work.append(row);
    }
    if (initiatives.hasMore) work.append(this.button('All initiatives', () => this.navigate('initiatives')));
  }
  actionRow(action) {
    const row = document.createElement('div'); row.className = 'card';
    row.innerHTML = `<h3>${esc(action.description)}</h3><p>${esc(action.status)}${action.dueDate ? ` · ${esc(action.dueDate)}${isOverdue(action) ? ' · Overdue' : ''}` : ''}</p><p>${esc(action.waitingOn || (action.status === 'waiting' ? 'No person or condition specified.' : ''))}</p>`;
    row.append(this.button('Open action', async () => { await this.navigate('actions'); await this.actions.edit(action); })); return row;
  }
}
