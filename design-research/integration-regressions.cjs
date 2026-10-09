const { chromium } = require('/Users/elizabethstein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.REVIEW_URL || 'http://127.0.0.1:5184';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const passed = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + '\nwindow.__review={world,team,wallet,makeCritter,onSummoned,onFused,openSummonLab,openFusionLab,setSprigs:n=>{sprigs=n;drawHud();persist()}};' });
    });
    let mode = 'success'; let requests = 0;
    await page.route('**/api/summon*', async route => {
      requests++;
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ status: mode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(mode === 'error' ? { error: 'Fixture outage' } : route.request().method() === 'POST' ? { runId: 'mock-run-1234567890' } : { status: 'done', result: [base + '/sprites/emberpup.png'] }) });
    });
    await page.goto(base);
    await page.locator('.starter').first().click();
    const balance = () => page.evaluate(() => __review.wallet.balance());
    const open = () => page.evaluate(() => __review.openSummonLab(__review.onSummoned, __review.wallet, 60, () => __review.team.length >= 6));
    await page.evaluate(() => __review.setSprigs(300));
    await open(); await page.locator('.summon-desc').fill('a leafy test creature');
    await page.locator('.summon-go').click(); assert.equal(await balance(), 240);
    await page.locator('.summon-close').click(); await page.waitForTimeout(800);
    assert.equal(await balance(), 240); assert.equal(await page.evaluate(() => __review.team.length), 1);
    passed.push('Cancel keeps the generation charge, adds no creature, and saves the debit');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('critter-vale-save-v1')).sprigs), 240);
    mode = 'error'; await open(); await page.locator('.summon-desc').fill('another leafy test creature'); await page.locator('.summon-go').click();
    await page.locator('[data-act="retry"]').waitFor(); assert.equal(await balance(), 240);
    await page.locator('[data-act="retry"]').click(); assert.equal(await page.locator('.summon-desc').inputValue(), 'another leafy test creature');
    mode = 'success'; await page.locator('.summon-name').fill('Integration Test'); await page.locator('.summon-go').click(); await page.locator('[data-act="add"]').click();
    assert.equal(await balance(), 180); assert.equal(await page.evaluate(() => __review.team.length), 2);
    passed.push('Failed summon refunds once; retry retains draft; kept success charges once and adds to party');
    await page.evaluate(() => { while (__review.team.length < 6) __review.team.push(__review.makeCritter('tadmite', 6)); });
    const before = requests; await open(); assert(await page.locator('.summon-go').isDisabled());
    await page.locator('.summon-desc').fill('blocked test creature'); await page.waitForTimeout(300);
    assert.equal(requests, before); assert.equal(await balance(), 180); await page.keyboard.press('Escape');
    passed.push('Full party blocks generation before API request or spend');
    await page.evaluate(() => { __review.team.splice(2); __review.setSprigs(120); __review.openFusionLab({ party: __review.team, wallet: __review.wallet, cost: 80, onFused: __review.onFused }); });
    await page.locator('.fusion-cell').nth(0).click(); await page.locator('.fusion-cell').nth(1).click(); mode = 'error';
    await page.locator('[data-act="fuse"]').click(); await page.locator('[data-act="retry"]').waitFor(); assert.equal(await balance(), 120);
    await page.locator('[data-act="retry"]').click(); mode = 'success'; await page.locator('[data-act="fuse"]').click(); await page.locator('[data-act="keep"]').click();
    assert.equal(await balance(), 40); assert.equal(await page.evaluate(() => __review.team.length), 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('critter-vale-save-v1')).sprigs), 40);
    passed.push('Fusion refunds failure, preserves selections, charges successful generation once and saves hybrid');
    await open(); assert(await page.locator('.summon-go').isDisabled()); await page.keyboard.press('Escape');
    passed.push('Insufficient Sprigs block a summon');
    await page.evaluate(() => { localStorage.setItem('critter-vale-save-v1', '{bad json'); });
    // Navigate without beforeunload overwriting the corrupt fixture.
    const corrupt = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await corrupt.addInitScript(() => localStorage.setItem('critter-vale-save-v1', '{bad json'));
    const recovery = await corrupt.newPage(); await recovery.goto(base);
    assert((await recovery.locator('.notice').innerText()).includes('could not be read'));
    await recovery.screenshot({ path: 'design-research/screenshots/integration/corrupt-save-mobile.png', fullPage: true });
    passed.push('Corrupt save displays the upstream recovery notice on the redesigned title');
    assert.deepEqual(errors, []);
    fs.writeFileSync('design-research/integration-regressions.json', JSON.stringify({ passed, errors, generation: 'All API responses mocked; all saves isolated' }, null, 2));
    console.log(passed);
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
