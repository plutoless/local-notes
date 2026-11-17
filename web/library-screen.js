import {feedback, directoryLabel, button, selectionRow} from './presentation.js';
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
    const editTopic = topic => { this.topicOpener = document.activeElement; this.editingTopic = topic; $('#topic-name').value = topic?.description || ''; $('#topic-form').hidden = false; $('#topic-name').focus(); };
    $('#library-create-topic').onclick = () => editTopic(null);
    $('#library-rename-topic').onclick = () => { const topic = this.library.records.find(t => t.entityId === this.topic); if (topic) editTopic(topic); };
    this.topicOpener = null;
    $('#topic-cancel').onclick = () => { $('#topic-form').hidden = true; this.topicOpener?.focus(); };
    $('#topic-form').onsubmit = async event => { event.preventDefault(); try { await this.library.saveTopic($('#topic-name').value, this.editingTopic); $('#topic-form').hidden = true; this.topicOpener?.focus(); } catch (error) { notice(error.message); } };
    $('#library-back').onclick = () => { this.directory = this.directory.includes('/') ? this.directory.slice(0, this.directory.lastIndexOf('/')) : this.directory === '' ? '*' : ''; this.offset = 0; this.render(); };
    $('#library-next').onclick = () => { this.offset += 50; this.render(); };
    $('#library-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.render(); };
  }
  async show() {
    this.failed = false;
    $('.app').classList.add('library-view');
    $('#search').value = this.search;
    $('#library-progress').textContent = '正在打开笔记库…';
    await this.library.open();
    $('#library-tools').hidden = false; $('#filters').hidden = true;
    await this.render(); this.library.sync().then(() => { this.failed = false; return this.render(); }).catch(error => { this.failed = true; this.render(); this.notice(error.message); });
  }
  async render() {
    if (!this.isActive()) return;
    const sequence = ++this.sequence;
    const result = await this.library.query({search: this.search, directory: this.directory, topic: this.topic, offset: this.offset, paths: this.favoritePaths()});
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
    $('#library-previous').disabled = this.offset === 0; $('#library-next').disabled = !result.hasMore;
    const focusedPath = document.activeElement.closest('#items [data-path]')?.dataset.path;
    const scroll = $('.collection').scrollTop;
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
      const card = selectionRow(note.title, () => { this.browseScroll = $('.collection').scrollTop; return this.openNote(note.path); }, {selected: note.path === this.selectedPath}); card.classList.add('card'); card.dataset.path = note.path;
      card.innerHTML = `<h3>${esc(note.title)}</h3><p>${esc(note.excerpt)}</p><small>${esc(note.path)} · ${new Date(note.modified * 1000).toLocaleDateString()}</small>`;
      card.classList.toggle('selected', note.path === this.selectedPath); card.setAttribute('aria-current', note.path === this.selectedPath ? 'true' : 'false');
      list.append(card);
    }
    if (focusedPath) [...list.querySelectorAll('[data-path]')].find(node => node.dataset.path === focusedPath)?.focus({preventScroll: true});
    $('.collection').scrollTop = scroll;
  }
  async restore() {
    await this.render();
    $('#items .selected')?.focus({preventScroll: true});
    $('.collection').scrollTop = this.browseScroll || 0;
  }
  async noteTopics(path) {
    await this.library.open();
    const note = (await this.library.query({exactPath: path})).notes[0];
    const container = $('#note-topics'); container.replaceChildren();
    if (!note) return;
    if (!this.library.records.length) { const message = document.createElement('p'); message.textContent = '尚未创建主题。可返回笔记库新建主题。'; container.append(message); }
    for (const topic of this.library.records) {
      const label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = topic.sources.some(source => source.path === path);
      checkbox.onchange = async () => { checkbox.disabled = true; try { await this.library.link(topic, note, checkbox.checked); await this.noteTopics(path); } catch (error) { this.notice(error.message); checkbox.checked = !checkbox.checked; checkbox.disabled = false; } };
      label.append(checkbox, document.createTextNode(topic.description)); container.append(label);
    }
  }
}
