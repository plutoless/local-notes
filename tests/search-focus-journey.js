import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

// Browser input exercises real controls; native modality is verified separately.
export async function searchFocusJourney(page) {
  const phase = process.env.SEARCH_FOCUS_PHASE || 'after';
  const out = `build/issue84/${phase}`;
  await mkdir(out, {recursive:true});
  const input = page.locator('#global-search-input');
  const first = page.locator('.search-result').first();
  const metrics = [];
  for (const [width,height] of [[1180,800],[393,760],[1180,480],[393,480]]) {
    await page.setViewportSize({width,height});
    const title = first.locator('.search-select');
    // Synthetic user content stays within the rendered fixture only.
    const original = await title.textContent();
    await title.evaluate(n => n.textContent = '核对长期事项与资料来源的完整中文标题以及下一步行动安排'.repeat(3));
    for (const mode of ['pointer','keyboard','selected-child','checked']) {
      if (mode === 'pointer') await title.click();
      if (mode === 'keyboard') { await input.click(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab'); }
      if (mode === 'selected-child') { await title.click(); await page.keyboard.press('Tab'); }
      if (mode === 'checked') { await page.locator('.search-attribution input').uncheck(); await page.locator('.search-attribution input').check(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); }
      await page.screenshot({path:`${out}/${width}-${height}-${mode}.png`});
      const state = await page.evaluate(() => {
        const active = document.activeElement, panel = document.querySelector('#global-search');
        const ancestors = []; for (let n=active.parentElement; n && n!==panel; n=n.parentElement) if (getComputedStyle(n).outlineStyle !== 'none') ancestors.push(n.className);
        return {active:active.className, focusVisible:active.matches(':focus-visible'), outline:getComputedStyle(active).outline, ancestors, panel:panel.getBoundingClientRect().toJSON(), overflow:document.documentElement.scrollWidth>innerWidth,
          targets:[...panel.querySelectorAll('button, label.search-attribution')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent,height:n.getBoundingClientRect().height}))};
      });
      metrics.push({width,height,mode,...state});
      assert.equal(state.overflow,false); assert.ok(state.targets.every(n=>n.height>=44));
      if (mode === 'checked' && phase !== 'before') {
        assert.ok(await page.locator('.search-attribution input').evaluate(n=>n===document.activeElement && n.checked && getComputedStyle(n).outlineStyle==='none' && getComputedStyle(n.parentElement).outlineStyle==='solid'),JSON.stringify(state));
      }
      if (mode === 'selected-child') { assert.ok(state.focusVisible); assert.deepEqual(state.ancestors,[]); }
    }
    await title.evaluate((n,text)=>n.textContent=text,original);
  }
  await writeFile(`${out}/metrics.json`,JSON.stringify(metrics,null,2));
  await page.locator('.search-attribution input').uncheck();
  await page.setViewportSize({width:1180,height:800});
  await input.click();
}
