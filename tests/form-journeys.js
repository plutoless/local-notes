import assert from 'node:assert/strict';

// Journey callers explicitly finish modal tasks before using the background.
export async function closeSavedAction(page) {
  if (!await page.locator('#action-drawer').evaluate(node => node.open)) return;
  await page.waitForFunction(() => document.querySelector('#action-save-state').dataset.state !== 'saving');
  assert.equal(await page.locator('#action-save-state').getAttribute('data-state'), 'saved', 'Save or explicitly discard the action before leaving');
  await page.locator('#action-drawer .ui-drawer-header button').click();
  await page.locator('#action-drawer').waitFor({state: 'hidden'});
}

export async function closeNoteInfo(page) {
  if (await page.locator('#note-info-drawer').evaluate(node => node.open)) {
    await page.waitForFunction(() => !document.querySelector('#note-topics').inert);
    await page.locator('#note-info-drawer .ui-drawer-footer button').click();
    await page.locator('#note-info-drawer').waitFor({state: 'hidden'});
  }
}

export async function captureNote(page, title = '随手记测试', body = '') {
  await page.locator('#new').click();
  await page.locator('#capture-title').fill(title);
  await page.locator('#capture-body').fill(body);
  await page.getByRole('button', {name: '创建笔记', exact: true}).click();
  await page.locator('#note-task-drawer').waitFor({state: 'hidden'});
  await page.locator('#capture-return').waitFor({state: 'visible'});
}

export async function moveNote(page, target) {
  if (!await page.locator('#note-info-drawer').evaluate(node => node.open)) await page.locator('#note-info-open').click();
  await page.locator('#rename').click();
  await page.locator('#note-location').fill(target);
  await page.locator('#note-task-drawer .ui-drawer-footer .primary').click();
}

export async function saveAndLeave(page) {
  await page.waitForFunction(async () => !(await import('/presentation.js')).taskLeavePending() || document.querySelector('#task-leave-decision'));
  if (await page.locator('#task-leave-decision').count()) {
    await page.locator('#task-leave-decision').getByRole('button', {name:'保存并离开',exact:true}).click();
    await page.waitForFunction(async () => !(await import('/presentation.js')).taskLeavePending());
  }
}

export async function enterNoteEditing(page) {
  if (await page.locator('#title').evaluate(node => node.readOnly)) await page.locator('#mode').click();
}
