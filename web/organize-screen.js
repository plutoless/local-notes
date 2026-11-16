import {native} from './bridge.js';
import {CandidateRepository, Organization, CandidateReview, SYSTEM_PROMPT} from './organization.js';
import {allRecords} from './initiatives.js';
const $ = selector => document.querySelector(selector);
export class OrganizeScreen {
  constructor(openNote) {
    this.openNote = openNote; this.repository = new CandidateRepository(native); this.organization = new Organization(native, this.repository); this.offset = 0; this.review = new CandidateReview(native, this.repository); this.drafts = new Map();
    $('#ai-settings').onsubmit = event => { event.preventDefault(); this.attempt(async () => { await native('aiConfigure', {address: $('#ai-address').value, model: $('#ai-model').value, token: $('#ai-token').value}); $('#ai-token').value = ''; this.status('Settings saved on this device.'); }); };
    $('#ai-preview').onclick = () => this.attempt(async () => {
      if (this.organization.running) throw Error('Cancel the active analysis first');
      const paths = [...$('#ai-selection').querySelectorAll('input:checked')].map(input => input.value);
      const batches = await this.organization.preview(paths);
      $('#ai-input').textContent = 'System message:\n' + SYSTEM_PROMPT + '\n\nUser messages (one request per fragment):\n' + batches.map(batch => JSON.stringify(batch)).join('\n\n');
      $('#ai-send').disabled = !batches.length; this.status(`Preview ready: ${paths.length} notes, ${batches.length} complete fragments. Sending requires Start / retry.`);
    });
    $('#ai-send').onclick = () => this.attempt(async () => { $('#ai-preview').disabled = true; try { await this.organization.run(text => this.status(text)); } finally { $('#ai-preview').disabled = false; await this.candidates(); } });
    $('#ai-cancel').onclick = () => this.attempt(async () => { await this.organization.cancel(); this.status(`Canceled. Completed ${this.organization.covered}/${this.organization.batches?.length || 0} fragments; saved suggestions retained.`); });
    $('#ai-directory').onchange = () => { this.selectionOffset = 0; this.inventory(); };
    $('#ai-notes-next').onclick = () => { this.selectionOffset += 50; this.inventory(); };
    $('#ai-notes-previous').onclick = () => { this.selectionOffset = Math.max(0, this.selectionOffset - 50); this.inventory(); };
    $('#ai-results-next').onclick = () => { this.offset += 50; this.candidates(); };
    $('#ai-results-previous').onclick = () => { this.offset = Math.max(0, this.offset - 50); this.candidates(); };
  }
  status(text) { $('#ai-status').textContent = text; }
  async attempt(operation) { try { await operation(); } catch (error) { this.status(`${error.message}. Completed ${this.organization.covered}/${this.organization.batches?.length || 0} fragments. Retry is explicit.`); } }
  async show(library) {
    $('#organize-tools').hidden = false; $('#view-title').textContent = 'Organize'; $('#items').replaceChildren(); $('#filters').hidden = true;
    await this.attempt(async () => {
      await this.repository.open(); await this.review.open(); this.status('Review each suggestion separately. Saved locally; remote receipt is not verified.');
      try { await this.review.recover(); } catch (error) { this.status('Recovery needs attention: ' + error.message); }
      const settings = await native('aiSettings'); $('#ai-address').value = settings.address; $('#ai-model').value = settings.model; $('#ai-token').placeholder = settings.configured ? 'Stored on this device; leave blank to keep' : 'API key';
      this.library = library; await library.open(); await library.sync();
      this.selectionOffset = 0; $('#ai-directory').replaceChildren();
      for (const path of ['*', '', ...(library.directories || [])]) { const option = document.createElement('option'); option.value = path; option.textContent = path === '*' ? 'All directories (select individual notes)' : path || '/'; $('#ai-directory').append(option); }
      await this.inventory(); await this.candidates();
    });
  }
  async inventory() {
    const result = await this.library.query({directory: $('#ai-directory').value, offset: this.selectionOffset, limit: 50});
    $('#ai-selection').replaceChildren();
    for (const note of result.notes) { const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.value = note.path; label.append(input, document.createTextNode(note.path)); $('#ai-selection').append(label); }
    $('#ai-notes-previous').disabled = this.selectionOffset === 0; $('#ai-notes-next').disabled = !result.hasMore;
  }
  async candidates() {
    if (this.reviewing) return;
    const destinations = await allRecords(this.review.targets.initiative);
    const page = await this.repository.query({offset: this.offset, limit: 50}); $('#ai-results').replaceChildren();
    for (const record of page.actions) {
      const card = document.createElement('article'); card.className = 'card';
      for (const text of [`${record.candidateType}: ${record.description}`, `Placement: ${record.placement}`, `Reasoning: ${record.reasoning}`, `Current relevance: ${record.relevance}`, `Saved suggestion: ${record.entityId}`]) { const p = document.createElement('p'); p.textContent = text; card.append(p); }
      for (const source of record.sources) { const quote = document.createElement('blockquote'); quote.textContent = source.quote; const button = document.createElement('button'); button.textContent = `${source.path} [${source.start}–${source.end}]`; button.onclick = () => this.openNote(source.path); card.append(quote, button); }
      const state = document.createElement('p');
      state.textContent = record.syncState ? 'Synchronization conflict: open Sync review / Refresh.' : record.review ? `Decision: ${record.review.decision} (${record.review.state})${record.review.target ? ' · Target: ' + record.review.target.entityId : ''}` : 'Awaiting your decision';
      card.append(state);
      if (!record.syncState && (!record.review || (record.review.decision === 'later' && !record.review.target && record.review.state === 'done'))) {
        const edit = document.createElement('textarea'); edit.setAttribute('aria-label', 'Edit suggestion'); edit.value = this.drafts.get(record.entityId) ?? record.review?.suggestion ?? record.description;
        edit.oninput = () => this.drafts.set(record.entityId, edit.value); card.append(edit);
        const target = document.createElement('select'); target.setAttribute('aria-label', 'Existing initiative');
        target.append(Object.assign(document.createElement('option'), {value: '', textContent: 'Choose existing initiative (for attach, reference, progress or link)'}));
        for (const initiative of destinations.filter(r => !r.syncState)) target.append(Object.assign(document.createElement('option'), {value: initiative.entityId, textContent: initiative.title}));
        card.append(target);
        for (const [decision, label] of [['confirm', 'Confirm'], ['ignore', 'Ignore'], ['later', 'Keep for later'], ['reference', 'Treat as reference'], ['attach', 'Attach to initiative']]) {
          const button = document.createElement('button'); button.textContent = label;
          button.onclick = () => this.attempt(async () => {
            this.reviewing = true; const buttons = [...card.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
            try { await this.review.decide(record, decision, {description: edit.value, targetId: target.value}); this.drafts.delete(record.entityId); this.status('Decision saved locally. Each suggestion needs separate approval.'); }
            finally { this.reviewing = false; buttons.forEach(b => b.disabled = false); await this.candidates(); }
          }); card.append(button);
        }
      } else if (record.review?.state === 'pending' && !record.syncState) {
        const retry = document.createElement('button'); retry.textContent = 'Recover approved decision'; retry.onclick = () => this.attempt(async () => { await this.review.recover(); await this.candidates(); }); card.append(retry);
      }
      $('#ai-results').append(card);
    }
    $('#ai-results-previous').disabled = this.offset === 0; $('#ai-results-next').disabled = !page.hasMore;
  }
}
