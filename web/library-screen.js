import {Library} from './library.js';
import {native} from './bridge.js';
import {escapeHTML as esc} from './core.js';
const $ = selector => document.querySelector(selector);
export class LibraryScreen {
  constructor(openNote, notice, isActive) {
    this.openNote = openNote; this.notice = notice; this.isActive = isActive;
    this.library = new Library(native, () => { if (isActive()) this.render().catch(error => notice(error.message)); });
    this.offset = 0; this.directory = '*'; this.topic = ''; this.search = ''; this.sequence = 0;
    $('#library-refresh').onclick = () => this.library.sync().catch(error => notice(error.message));
    $('#library-topic').onchange = () => { this.topic = $('#library-topic').value; this.offset = 0; this.render(); };
    $('#library-create-topic').onclick = async () => { try { const name = prompt('Topic name'); if (name) await this.library.saveTopic(name); } catch (error) { notice(error.message); } };
    $('#library-rename-topic').onclick = async () => { try { const topic = this.library.records.find(t => t.entityId === this.topic); if (!topic) return; const name = prompt('Rename topic', topic.description); if (name) await this.library.saveTopic(name, topic); } catch (error) { notice(error.message); } };
    $('#library-back').onclick = () => { this.directory = this.directory.includes('/') ? this.directory.slice(0, this.directory.lastIndexOf('/')) : this.directory === '' ? '*' : ''; this.offset = 0; this.render(); };
    $('#library-next').onclick = () => { this.offset += 50; this.render(); };
    $('#library-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.render(); };
  }
  async show() {
    await this.library.open();
    $('#library-tools').hidden = false; $('#filters').hidden = true;
    await this.render(); this.library.sync().catch(error => this.notice(error.message));
  }
  async render() {
    if (!this.isActive()) return;
    const sequence = ++this.sequence;
    const result = await this.library.query({search: this.search, directory: this.directory, topic: this.topic, offset: this.offset});
    if (sequence !== this.sequence || !this.isActive()) return;
    $('#view-title').textContent = 'Reference library';
    $('#root-label').textContent = this.library.root || 'Local reference index';
    $('#note-count').textContent = `${this.offset + result.notes.length}${result.hasMore ? '+' : ''}`;
    $('#library-progress').textContent = [this.library.progress, ...(this.library.warnings || [])].filter(Boolean).join(' · ');
    const select = $('#library-topic'); select.replaceChildren();
    for (const [value, name] of [['', 'All topics'], ['uncategorized', 'Uncategorized'], ...(this.library.records || []).map(t => [t.entityId, t.description])]) { const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option); }
    select.value = this.topic;
    $('#library-rename-topic').disabled = !this.library.records?.some(t => t.entityId === this.topic);
    $('#library-location').textContent = this.directory === '*' ? 'All directories' : this.directory || '/';
    $('#library-previous').disabled = this.offset === 0; $('#library-next').disabled = !result.hasMore;
    const list = $('#items'); list.replaceChildren();
    if (!this.search && this.offset === 0) {
      const inventory = await this.library.inventory();
      if (sequence !== this.sequence || !this.isActive()) return;
      const prefix = this.directory === '*' || this.directory === '' ? '' : this.directory + '/';
      const directories = new Set(inventory.filter(n => n.path.startsWith(prefix)).map(n => n.path.slice(prefix.length)).filter(p => p.includes('/')).map(p => prefix + p.split('/')[0]));
      if (this.directory === '*') { const root = document.createElement('button'); root.textContent = 'Browse directories'; root.onclick = () => { this.directory = ''; this.render(); }; list.append(root); }
      else for (const directory of [...directories].sort()) { const button = document.createElement('button'); button.textContent = '📁 ' + directory; button.onclick = () => { this.directory = directory; this.offset = 0; this.render(); }; list.append(button); }
    }
    for (const note of result.notes) {
      const card = document.createElement('button'); card.className = 'card';
      card.innerHTML = `<h3>${esc(note.title)}</h3><p>${esc(note.excerpt)}</p><small>${esc(note.path)}</small>`;
      card.onclick = () => this.openNote(note.path); list.append(card);
    }
  }
  async noteTopics(path) {
    await this.library.open();
    const note = (await this.library.inventory()).find(n => n.path === path);
    const container = $('#note-topics'); container.replaceChildren();
    if (!note) return;
    for (const topic of this.library.records) {
      const label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = topic.sources.some(source => source.path === path);
      checkbox.onchange = async () => { checkbox.disabled = true; try { await this.library.link(topic, note, checkbox.checked); await this.noteTopics(path); } catch (error) { this.notice(error.message); checkbox.checked = !checkbox.checked; checkbox.disabled = false; } };
      label.append(checkbox, document.createTextNode(topic.description)); container.append(label);
    }
  }
}
