import {libraryView, libraryPage, shellUpdate} from './assets/react-host.js';
import {requestTaskLeave, feedback, directoryLabel, button, drawer, field, errorFeedback} from './presentation.js';
import {Library, archivedPath} from './library.js';
import {native} from './bridge.js';
const $ = selector => document.querySelector(selector);
export class LibraryScreen {
  constructor(openNote, notice, isActive, favoritePaths = () => undefined) {
    this.favoritePaths = favoritePaths; this.openNote = openNote; this.notice = notice; this.isActive = isActive;
    this.library = new Library(native, () => { if (isActive()) this.render().catch(error => notice(error.message)); });
    this.order = 'current'; this.archives = 'include'; this.offset = 0; this.directory = '*'; this.topic = ''; this.search = ''; this.sequence = 0;
    this.setupTopicDrawer();
    this.ui = libraryView($('#items'), $('#library-tools'), {
      filter: (key, value) => { this[key] = value; this.offset = 0; this.indexChanged = false; this.render(); },
      refresh: async () => {
        this.refreshing = true; this.progress = '正在更新笔记列表…'; this.controls();
        try { await this.library.sync(); this.failed = false; await this.render(); }
        catch (error) { this.failed = true; await this.render(); notice(error.message); }
        finally { this.refreshing = false; this.controls(); }
      },
      createTopic: opener => this.editTopic(null, null, opener),
      renameTopic: opener => { const topic = this.library.records.find(t => t.entityId === this.topic); if (topic) this.editTopic(topic, null, opener); },
      parent: () => { this.directory = this.directory.includes('/') ? this.directory.slice(0, this.directory.lastIndexOf('/')) : this.directory === '' ? '*' : ''; this.offset = 0; this.render(); },
      page: direction => { this.offset = Math.max(0, this.offset + direction * 50); this.render(); }
    });
    this.controls();
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
  editTopic(topic, note = null, origin = document.activeElement) {
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
    this.topicDrawer.open(this.topicRetry ? this.topicSubmit : this.topicInput, origin);
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
    this.progress = '正在打开笔记库…'; this.controls();
    await this.library.open();
    if (this.topic && this.topic !== 'uncategorized' && !this.library.records.some(topic => topic.entityId === this.topic)) { this.topic = ''; this.offset = 0; }
    $('#library-tools').hidden = false; $('#filters').hidden = true;
    await this.render(); this.library.sync().then(() => { this.failed = false; return this.render(); }).catch(error => { this.failed = true; this.render(); this.notice(error.message); });
  }
  async render() {
    if (!this.isActive()) return;
    const sequence = ++this.sequence;
    const generation = this.library.generation;
    if (this.browseRevision !== this.library.revision) {
      if (this.offset) { this.offset = 0; this.indexChanged = true; }
      this.browseRevision = this.library.revision;
    }
    let result;
    try { result = libraryPage(await this.library.query({order: this.order, archives: this.archives, search: this.search, directory: this.directory, topic: this.topic, offset: this.offset, paths: this.favoritePaths()})); }
    catch (error) {
      if (generation !== this.library.generation || sequence !== this.sequence || !this.isActive()) return;
      this.failed = true;
      this.progress = '笔记列表暂不可用，请刷新重试或重新选择目录。'; this.detail = error.message; this.controls();
      return;
    }
    if (generation !== this.library.generation || sequence !== this.sequence || !this.isActive()) return;
    $('#view-title').textContent = this.favoritePaths() ? '收藏' : '笔记库'; $('#search').placeholder = '搜索标题与正文…'; $('#index-state').textContent = '';
    directoryLabel(this.library.root || '本地笔记');
    const coverage = this.library.running || this.failed || this.library.warnings?.length ? '索引未完成' : '已索引';
    this.count = `${coverage}：${result.total ?? this.offset + result.notes.length}${result.total === undefined && result.hasMore ? '+' : ''}；本页 ${result.notes.length ? this.offset + 1 : 0}–${this.offset + result.notes.length}`;
    shellUpdate({count:this.count});
    this.detail = this.library.warnings?.join('\n') || '';
    this.progress = this.detail ? '部分笔记暂不可用，请检查目录后刷新。' : this.failed ? '目录暂不可用，请检查目录权限后刷新，或重新选择目录。' : this.library.running ? '正在更新笔记列表，当前结果可能不完整…' : this.indexChanged ? '索引已更新，已返回第一页。' : '';
    this.previous = this.offset > 0 && !this.library.running; this.next = result.hasMore && !this.library.running;
    this.controls();
    const focusedPath = document.activeElement.closest('#items [data-path]')?.dataset.path;
    const scroll = $('.collection').scrollTop, listScroll = $('#items').scrollTop;
    const list = $('#items');
    const prefix = this.directory === '*' || this.directory === '' ? '' : this.directory + '/';
    const directories = !this.search && this.offset === 0 && this.directory !== '*' ? [...new Set((this.library.directories || []).filter(path => (path + '/_').startsWith(prefix) && (path + '/_').slice(prefix.length).includes('/')).map(path => prefix + path.slice(prefix.length).split('/')[0]))].sort() : [];
    this.ui.rows({notes: result.notes.map(note => ({...note, archived: archivedPath(note.path)})), directories, root: !this.search && this.offset === 0 && this.directory === '*', selectedPath: this.selectedPath,
      empty: !result.notes.length && !this.library.running ? (this.failed || this.library.warnings?.length ? '目录暂不可用，请检查目录后刷新。' : this.search ? '没有找到匹配的笔记。请换个关键词或清除搜索。' : this.archives !== 'include' ? '当前归档范围内没有符合条件的笔记。可切换「归档范围」或清除筛选。' : this.topic === 'uncategorized' ? '没有未分类的笔记。可切换到「全部主题」。' : this.topic ? '这个主题下还没有笔记。打开笔记后可在「笔记信息与整理」中关联主题。' : this.directory !== '*' ? '此目录下没有符合条件的笔记。可返回上一级目录或清除筛选。' : this.favoritePaths() ? '还没有收藏的笔记。打开笔记，在「笔记信息与整理」中收藏。' : '笔记库为空。使用「随手记」创建第一篇笔记，或选择已有笔记目录。') : '',
      browse: directory => { this.directory = directory; this.offset = 0; return this.render(); },
      open: path => { this.browseScroll = $('.collection').scrollTop; this.browseListScroll = $('#items').scrollTop; return this.openNote(path); }
    });
    if (focusedPath) [...list.querySelectorAll('[data-path]')].find(node => node.dataset.path === focusedPath)?.focus({preventScroll: true});
    $('.collection').scrollTop = scroll; $('#items').scrollTop = listScroll;

  }
  controls() {
    this.ui.controls({order: this.order, archives: this.archives, topic: this.topic, topics: this.library.records || [], directory: this.directory,
      progress: this.progress || '', detail: this.detail, count: this.count || '', refreshing: Boolean(this.refreshing), previous: Boolean(this.previous), next: Boolean(this.next)});
  }
  release() { this.sequence++; this.ui.release(); }
  captureContext() {
    return {order: this.order, archives: this.archives, offset: this.offset, directory: this.directory, topic: this.topic, search: this.search, selectedPath: this.selectedPath, browseListScroll: $('#items').scrollTop, browseScroll: $('.collection').scrollTop};
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
