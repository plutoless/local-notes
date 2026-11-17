import {statusLabel, button as controlButton, disclosure, sectionHeading, selectionRow} from './presentation.js';
import {escapeHTML as esc} from './core.js';
import {isOverdue} from './actions.js';
const $ = selector => document.querySelector(selector);
export class FocusScreen {
  constructor(actions, initiatives, navigate, notice) {
    Object.assign(this, {actions, initiatives, navigate, notice});
    this.limit = 7; this.waitingLimit = 50; this.initiativeLimit = 50;
  }
  button(text, run, options = {}) {
    return controlButton(text, async () => { try { await run(); } catch (error) { this.notice(error.message); } }, options);
  }
  async show() {
    $('.app').classList.remove('workspace'); $('#workspace-context').hidden = true; $('.app').classList.add('home'); $('#library-tools').hidden = true; $('#index-state').textContent = '正在载入重点…';
    const request = this.request = (this.request || 0) + 1;
    const repository = this.actions.repository;
    $('#view-title').textContent = '当前重点'; $('#search').hidden = true;
    $('#filters').hidden = true; $('#action-tools').hidden = true; $('#initiative-tools').hidden = true;
    $('#editor').hidden = true; $('#action-editor').hidden = true; $('#initiative-editor').hidden = true; $('#empty').hidden = true;
    const [focused, waiting, initiatives] = await Promise.all([
      repository.query({focus: true, offset: this.focusOffset || 0, limit: this.limit + 1}),
      repository.query({status: 'waiting', limit: this.waitingLimit}),
      this.initiatives.repository.query({status: 'active', limit: this.initiativeLimit})
    ]);
    if (!this.active || repository !== this.actions.repository || request !== this.request) return;
    $('#index-state').textContent = ''; const list = $('#items'); list.replaceChildren();
    const tools = document.createElement('div'); tools.className = 'home-tools'; list.append(tools);
    const title = sectionHeading('当前重点'); tools.append(title);
    const utilities = disclosure('更多操作', [], 'home-utilities'); tools.append(utilities);
    tools.append(this.button('新建行动', async () => { await this.navigate('actions'); await this.actions.edit(null); }, {primary: true}),
      this.button('全部行动', () => this.navigate('actions')));
    utilities.append(this.button('新建事项', async () => { await this.navigate('initiatives'); await this.initiatives.edit(null); }),
      this.button('整理所选笔记', () => this.navigate('organize')),
      this.button('刷新本地记录', async () => {
        const actionResult = await repository.serialize(() => repository.recover());
        const initiativeResult = await this.initiatives.repository.serialize(() => this.initiatives.repository.recover());
        const warnings = [...actionResult.warnings, ...initiativeResult.warnings];
        if (warnings.length) this.notice(warnings.join('\n'));
        await this.show();
      }));
    const section = title => { const node = document.createElement('section'); const heading = sectionHeading(title); node.append(heading); list.append(node); return node; };
    const focus = section('优先处理');
    if (!focused.actions.length) focus.append('还没有重点行动。可从「全部行动」选择已确认的下一步。', this.button('选择重点行动', () => this.navigate('actions')));
    const shown = focused.actions.slice(0, this.limit);
    for (const [index, action] of shown.entries()) {
      const row = this.actionRow(action);
      const menu = disclosure(`管理：${action.description}`, [], 'row-menu'); menu.querySelector('summary').textContent = '管理'; menu.querySelector('summary').setAttribute('aria-label', `管理：${action.description}`); row.append(menu);
      menu.append(this.button('移出重点', async () => { await repository.save({...action, focusPosition: null}, action); await this.show(); $('#items .focus-row-open, .home-tools .primary')?.focus(); }, {variant: 'danger'}));
      for (const direction of [-1, 1]) {
        if (index + direction < 0 || !focused.actions[index + direction]) continue;
        menu.append(this.button(direction < 0 ? '上移' : '下移', async () => {
          const neighbor = focused.actions[index + direction];
          const beyond = focused.actions[index + direction * 2];
          const position = beyond ? (neighbor.focusPosition + beyond.focusPosition) / 2 : neighbor.focusPosition + direction;
          if (position === neighbor.focusPosition || position === beyond?.focusPosition) throw Error('Focus positions are too close; remove and add this action again.');
          await repository.save({...action, focusPosition: position}, action); await this.show(); [...document.querySelectorAll('.focus-row-open')].find(node => node.getAttribute('aria-label') === `打开行动：${action.description}`)?.focus();
        }));
      }
      focus.append(row);
    }
    if (focused.actions.length > this.limit || focused.hasMore) focus.append(this.button('展开更多重点行动', async () => { this.limit = Math.min(99, this.limit + 50); await this.show(); }));
    // Beyond one bounded page, navigate explicit pages rather than rendering the collection.
    if (this.focusOffset) focus.append(this.button('上一页重点', async () => { this.focusOffset = Math.max(0, this.focusOffset - 99); await this.show(); }));
    if (this.limit === 99 && (focused.hasMore || focused.actions.length > this.limit)) focus.append(this.button('下一页重点', async () => { this.focusOffset = (this.focusOffset || 0) + 99; await this.show(); }));
    const followUp = section('等待与跟进');
    if (!waiting.actions.length) followUp.append('没有等待中的行动。');
    for (const action of waiting.actions) followUp.append(this.actionRow(action));
    if (waiting.hasMore) followUp.append(this.button('全部等待行动', async () => { this.actions.status = 'waiting'; this.actions.offset = 0; this.actions.search = ''; this.actions.initiativeFilter = ''; $('#search').value = ''; await this.navigate('actions'); $('#action-filter').value = 'waiting'; }));
    const work = section('继续推进');
    const side = document.createElement('div'); side.className = 'home-side'; side.append(followUp, work); list.append(side);
    if (!initiatives.actions.length) work.append('还没有进行中的事项。', this.button('创建第一个事项', async () => { await this.navigate('initiatives'); await this.initiatives.edit(null); }));
    for (const initiative of initiatives.actions) {
      const row = document.createElement('div'); row.className = 'card';
      row.innerHTML = `<h3>${esc(initiative.title)}</h3><p>${esc(initiative.progress || '尚未记录进展。')}</p>`;
      row.append(this.button('打开事项', async () => { await this.navigate('initiatives'); await this.initiatives.edit(initiative); })); work.append(row);
    }
    if (initiatives.hasMore) work.append(this.button('全部事项', () => this.navigate('initiatives')));
  }
  actionRow(action) {
    const row = document.createElement('div'); row.className = 'card focus-row ui-row';
    const open = selectionRow('', async () => { try { if (await this.navigate('actions')) await this.actions.edit(action); } catch (error) { this.notice(error.message); } });
    open.className = 'focus-row-open'; open.setAttribute('aria-label', `打开行动：${action.description}`);
    open.innerHTML = `<span class="action-marker" aria-hidden="true"></span><span><h3>${esc(action.description)}</h3><span class="row-meta">${esc(statusLabel(action.status))}${action.dueDate ? ` · ${esc(action.dueDate)}${isOverdue(action) ? ' · 已逾期' : ''}` : ''}</span>${action.waitingOn ? `<span class="waiting-condition">${esc(action.waitingOn)}</span>` : ''}</span>`;
    row.append(open); return row;
  }
}
