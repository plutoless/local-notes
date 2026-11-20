import {pageAvailability, requestTaskLeave, feedback, directoryLabel, button, selectionRow, drawer, field, errorFeedback} from './presentation.js';
import {Library} from './library.js';
import {native} from './bridge.js';
import {escapeHTML as esc} from './core.js';
const $ = selector => document.querySelector(selector);
export class LibraryScreen {
  constructor(openNote, notice, isActive, favoritePaths = () => undefined) {
    this.favoritePaths = favoritePaths; this.openNote = openNote; this.notice = notice; this.isActive = isActive;
    this.library = new Library(native, () => { if (isActive()) this.render().catch(error => notice(error.message)); });
    this.offset = 0; this.directory = '*'; this.topic = ''; this.search = ''; this.sequence = 0;
    $('#library-refresh').onclick = async () => { $('#library-refresh').disabled = true; $('#library-progress').textContent = '正在更新笔记列表…'; try { await this.library.sync(); this.failed = false; await this.render(); } catch (error) { this.failed = true; await this.render(); notice(error.message); } finally { $('#library-refresh').disabled = false; } };
    $('#library-topic').onchange = () => { this.topic = $('#library-topic').value; this.offset = 0; this.render(); };
    this.setupTopicDrawer();
    $('#library-create-topic').onclick = () => this.editTopic(null);
    $('#library-rename-topic').onclick = () => { const topic = this.library.records.find(t => t.entityId === this.topic); if (topic) this.editTopic(topic); };
    $('#library-back').onclick = () => { this.directory = this.directory.includes('/') ? this.directory.slice(0, this.directory.lastIndexOf('/')) : this.directory === '' ? '*' : ''; this.offset = 0; this.render(); };
    $('#library-next').onclick = () => { this.offset += 50; this.render(); };
    $('#library-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.render(); };
  }
  setupTopicDrawer() {
    this.topicDrawer = drawer({id: 'topic-drawer', title: '新建主题', onDismiss: () => this.leaveTopic()});
    const form = document.createElement('form'); form.id = 'topic-form'; form.noValidate = true;
    const input = document.createElement('input'); input.id = 'topic-name'; input.required = true;
    const status = document.createElement('div'); status.id = 'topic-status'; status.setAttribute('role', 'status');
    const error = document.createElement('div'); error.id = 'topic-error'; error.setAttribute('role', 'alert'); error.tabIndex = -1;
    input.setAttribute('aria-describedby', 'topic-error topic-status');
    form.append(field('主题名称', input, {density: 'compact'}), status, error);
    this.topicDrawer.body.append(form);
    const cancel = button('取消', () => this.leaveTopic(), {density: 'compact'}); cancel.id = 'topic-cancel';
    const submit = document.createElement('button'); submit.type = 'submit'; submit.setAttribute('form', form.id); submit.className = 'ui-action primary ui-compact';
    this.topicDrawer.footer.append(cancel, submit);
    input.oninput = () => {
      input.setAttribute('aria-invalid', 'false'); error.replaceChildren();
      status.textContent = input.value === (this.editingTopic?.description || '') ? '' : '主题名称尚未保存。';
      try { localStorage.setItem(this.topicDraftKey, JSON.stringify({name: input.value, previous: this.editingTopic})); }
      catch { status.textContent = '草稿暂时无法在关闭后恢复，请保持窗口打开并保存。'; }
    };
    form.onsubmit = event => { event.preventDefault(); this.saveTopicTask(); };
    this.saveTopicTask = () => {
      if (this.topicPending) return this.topicPending;
      this.topicPending = (async () => {
      await Promise.resolve();
      if (!input.value.trim()) { input.setAttribute('aria-invalid', 'true'); error.textContent = '请填写主题名称。'; input.focus(); return false; }
      this.topicSaving = true; submit.disabled = true; input.disabled = true;
      status.textContent = '正在保存…'; error.replaceChildren();
      try {
        await this.library.saveTopic(input.value, this.editingTopic, this.topicRetry, this.topicNote);
        const restored = await this.closeTopic(true); if (restored) this.notice('主题已保存到本地。', true); return true;
      } catch (failure) {
        if (failure.revisionSaved) {
          this.topicRetry = failure.record;
          try { localStorage.setItem(this.topicDraftKey, JSON.stringify({name: input.value, previous: this.editingTopic, retry: this.topicRetry})); }
          catch { /* The open drawer still retains the recoverable revision. */ }
        }
        if (this.topicRetry) {
          status.textContent = '主题版本已保存，恢复尚未完成。名称暂时锁定，请重试恢复。';
          feedback(error, '恢复未完成，已保存的版本仍保留。', failure.message);
        } else { status.textContent = ''; errorFeedback(error, failure.message); }
        error.focus(); submit.textContent = this.topicRetry ? '重试恢复' : '重试保存'; return false;
      }
      finally { this.topicSaving = false; submit.disabled = false; input.disabled = Boolean(this.topicRetry); }
      })();
      return this.topicPending.finally(() => { this.topicPending = null; });
    };
    this.topicInput = input; this.topicSubmit = submit; this.topicStatus = status; this.topicError = error;
  }
  get topicDirty() { return this.topicDrawer.panel.open && (Boolean(this.topicRetry) || this.topicInput.value !== (this.editingTopic?.description || '')); }
  editTopic(topic, note = null) {
    if (this.topicDrawer.panel.open) { this.leaveTopic(); return; }
    this.topicBrowseScroll = $('.collection').scrollTop;
    this.topicNote = note; this.editingTopic = topic; this.topicRetry = null; this.topicInput.disabled = false;
    this.topicDraftKey = `topic-draft:${this.library.workspaceId}:${topic?.entityId || (note ? 'note:' + note.path : 'new')}`;
    let draft;
    try { draft = JSON.parse(localStorage.getItem(this.topicDraftKey)); } catch { /* Invalid private drafts do not replace saved records. */ }
    this.topicInput.value = draft?.name ?? topic?.description ?? '';
    this.topicRetry = draft?.retry || null; this.topicInput.disabled = Boolean(this.topicRetry);
    // Keep the original revision as the save base so recovered edits cannot overwrite a newer revision.
    if (draft?.previous) this.editingTopic = draft.previous;
    this.topicDrawer.setTitle(topic ? '重命名主题' : '新建主题');
    this.topicSubmit.textContent = this.topicRetry ? '重试恢复' : topic ? '保存' : '创建';
    this.topicStatus.textContent = this.topicRetry ? '主题版本已保存，恢复尚未完成。名称暂时锁定，请重试恢复。' : draft ? '已恢复未保存的主题名称，请核对后保存。' : '';
    this.topicError.replaceChildren(); this.topicInput.setAttribute('aria-invalid', 'false');
    this.topicDrawer.open(this.topicRetry ? this.topicSubmit : this.topicInput);
  }
  async closeTopic(committed = false) {
    try { localStorage.removeItem(this.topicDraftKey); } catch { /* Persistence succeeded even when private draft cleanup is unavailable. */ } this.topicDrawer.hide();
    $('.collection').scrollTop = this.topicBrowseScroll;
    const note = this.topicNote; this.topicNote = null;
    return !note || await this.returnToNoteInfo?.(note, committed) !== false;
  }
  topicTask() {
    return {label: '主题', dirty: () => this.topicDirty, committed: () => Boolean(this.topicRetry), pending: () => this.topicPending,
      save: () => this.saveTopicTask(), discard: () => this.closeTopic(), close: () => { if (this.topicDrawer.panel.open) return this.closeTopic(); }};
  }
  leaveTopic() { return this.topicDrawer.panel.open ? requestTaskLeave(this.topicTask()) : Promise.resolve(true); }
  async show() {
    this.failed = false;
    $('.app').classList.add('library-view');
    $('#search').value = this.search;
    $('#library-progress').textContent = '正在打开笔记库…';
    await this.library.open();
    if (this.topic && this.topic !== 'uncategorized' && !this.library.records.some(topic => topic.entityId === this.topic)) { this.topic = ''; this.offset = 0; }
    $('#library-tools').hidden = false; $('#filters').hidden = true;
    await this.render(); this.library.sync().then(() => { this.failed = false; return this.render(); }).catch(error => { this.failed = true; this.render(); this.notice(error.message); });
  }
  async render() {
    if (!this.isActive()) return;
    const sequence = ++this.sequence;
    const generation = this.library.generation;
    let result;
    try { result = await this.library.query({search: this.search, directory: this.directory, topic: this.topic, offset: this.offset, paths: this.favoritePaths()}); }
    catch (error) {
      if (generation !== this.library.generation || sequence !== this.sequence || !this.isActive()) return;
      this.failed = true;
      feedback($('#library-progress'), '笔记列表暂不可用，请刷新重试或重新选择目录。', error.message);
      return;
    }
    if (sequence !== this.sequence || !this.isActive()) return;
    $('#view-title').textContent = this.favoritePaths() ? '收藏' : '笔记库'; $('#search').placeholder = '搜索标题与正文…'; $('#index-state').textContent = '';
    directoryLabel(this.library.root || '本地笔记');
    $('#note-count').textContent = `${this.offset + result.notes.length}${result.hasMore ? '+' : ''}`;
    if (this.library.warnings?.length) feedback($('#library-progress'), '部分笔记暂不可用，请检查目录后刷新。', this.library.warnings.join('\n')); else $('#library-progress').textContent = this.failed ? '目录暂不可用，请检查目录权限后刷新，或重新选择目录。' : this.library.running ? '正在更新笔记列表…' : '';
    const select = $('#library-topic'); select.replaceChildren();
    for (const [value, name] of [['', '全部主题'], ['uncategorized', '未分类'], ...(this.library.records || []).map(t => [t.entityId, t.description])]) { const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option); }
    select.value = this.topic;
    $('#library-rename-topic').disabled = !this.library.records?.some(t => t.entityId === this.topic);
    $('#library-location').textContent = this.directory === '*' ? '全部目录' : this.directory || '/';
    $('#library-back').disabled = this.directory === '*';
    pageAvailability($('#library-previous'), $('#library-next'), this.offset > 0, result.hasMore);
    const focusedPath = document.activeElement.closest('#items [data-path]')?.dataset.path;
    const scroll = $('.collection').scrollTop, listScroll = $('#items').scrollTop;
    const list = $('#items'); list.replaceChildren();
    if (!this.search && this.offset === 0) {
      const inventory = (this.library.directories || []).map(directory => ({path: directory + '/_'}));
      if (sequence !== this.sequence || !this.isActive()) return;
      const prefix = this.directory === '*' || this.directory === '' ? '' : this.directory + '/';
      const directories = new Set(inventory.filter(n => n.path.startsWith(prefix)).map(n => n.path.slice(prefix.length)).filter(p => p.includes('/')).map(p => prefix + p.split('/')[0]));
      if (this.directory === '*') { const root = button('浏览目录', () => { this.directory = ''; return this.render(); }); list.append(root); }
      else for (const directory of [...directories].sort()) { const entry = button('目录：' + directory, () => { this.directory = directory; this.offset = 0; return this.render(); }); list.append(entry); }
    }
    if (!result.notes.length && !this.library.running) {
      const empty = document.createElement('p'); empty.className = 'no-items'; empty.setAttribute('role', 'status');
      empty.textContent = this.failed || this.library.warnings?.length ? '目录暂不可用，请检查目录后刷新。' : this.search ? '没有找到匹配的笔记。请换个关键词或清除搜索。' : this.topic === 'uncategorized' ? '没有未分类的笔记。可切换到「全部主题」。' : this.topic ? '这个主题下还没有笔记。打开笔记后可在「笔记信息与整理」中关联主题。' : this.directory !== '*' ? '此目录下没有符合条件的笔记。可返回上一级目录或清除筛选。' : this.favoritePaths() ? '还没有收藏的笔记。打开笔记，在「笔记信息与整理」中收藏。' : '笔记库为空。使用「随手记」创建第一篇笔记，或选择已有笔记目录。';
      list.append(empty);
    }
    for (const note of result.notes) {
      const card = selectionRow(note.title, () => { this.browseScroll = $('.collection').scrollTop; this.browseListScroll = $('#items').scrollTop; return this.openNote(note.path); }, {selected: note.path === this.selectedPath}); card.classList.add('card'); card.dataset.path = note.path;
      card.innerHTML = `<h3>${esc(note.title)}</h3><p>${esc(note.excerpt || '暂无正文摘要')}</p><small>${esc(note.path)}</small><small>${Number.isFinite(note.modified) ? '文件修改：' + new Date(note.modified * 1000).toLocaleDateString() : '文件修改时间未知'}</small>`;
      list.append(card);
    }
    if (focusedPath) [...list.querySelectorAll('[data-path]')].find(node => node.dataset.path === focusedPath)?.focus({preventScroll: true});
    $('.collection').scrollTop = scroll; $('#items').scrollTop = listScroll;
  }
  captureContext() {
    return {offset: this.offset, directory: this.directory, topic: this.topic, search: this.search, selectedPath: this.selectedPath, browseListScroll: $('#items').scrollTop, browseScroll: $('.collection').scrollTop};
  }
  async restoreContext(context) {
    Object.assign(this, context); $('#search').value = this.search;
    await this.restore();
  }
  async restore() {
    await this.render();
    $('#items .selected')?.focus({preventScroll: true});
    $('.collection').scrollTop = this.browseScroll || 0;
    $('#items').scrollTop = this.browseListScroll || 0;
  }
  async noteTopics(path, focusId = null) {
    this.noteTopicPath = path;
    await this.library.open();
    const workspaceId = this.library.workspaceId;
    const ownsNote = () => this.noteTopicPath === path && this.library.workspaceId === workspaceId;
    const note = (await this.library.query({exactPath: path})).notes[0];
    if (!ownsNote()) return;
    const container = $('#note-topics'); container.replaceChildren();
    if (!note) return;
    if (!this.library.records.length) { const message = document.createElement('p'); message.textContent = '尚未关联主题，可新建或选择已有主题。'; container.append(message); }
    const create = button('新建并关联主题', () => this.createNoteTopic?.(note), {density: 'compact'}); create.id = 'note-create-topic'; container.append(create);
    for (const topic of this.library.records) {
      const label = document.createElement('label'), checkbox = document.createElement('input'); label.className = 'ui-selection'; checkbox.type = 'checkbox'; checkbox.dataset.topicId = topic.entityId; checkbox.checked = topic.sources.some(source => source.path === path);
      checkbox.onchange = () => {
        this.noteTopicPending = (async () => {
        this.noteTopicSaving = true; container.inert = true; checkbox.disabled = true;
        try { await this.library.link(topic, note, checkbox.checked); if (ownsNote()) await this.noteTopics(path, topic.entityId); }
        catch (error) {
          if (!ownsNote()) return;
          const failure = document.createElement('div'); failure.setAttribute('role', 'alert'); container.append(failure);
          if (error.associationSaved) {
            for (const input of container.querySelectorAll('input')) input.disabled = true;
            feedback(failure, '主题关联已保存，但列表尚未更新。请重试更新。', error.message);
            const retry = button('重试更新关联', async () => {
              this.noteTopicPending = (async () => {
              this.noteTopicSaving = true; container.inert = true;
              try { await this.library.sync(); if (ownsNote()) await this.noteTopics(path, topic.entityId); }
              catch (recoveryError) { if (!ownsNote()) return; feedback(failure, '主题关联已保存，但列表尚未更新。请重试更新。', recoveryError.message); failure.append(retry); }
              finally { this.noteTopicSaving = false; container.inert = false; }
              })(); return this.noteTopicPending.finally(() => { this.noteTopicPending = null; });
            });
            failure.append(retry);
          } else { errorFeedback(failure, error.message); checkbox.checked = !checkbox.checked; checkbox.disabled = false; }
        } finally { this.noteTopicSaving = false; container.inert = false; }
        })(); return this.noteTopicPending.finally(() => { this.noteTopicPending = null; });
      };
      label.append(checkbox, document.createTextNode(topic.description)); container.append(label);
    }
    container.inert = false;
    if (focusId) [...container.querySelectorAll('input')].find(input => input.dataset.topicId === focusId)?.focus({preventScroll: true});
  }
}
