// Shared browser launcher for every design-research harness.
// BROWSER=chromium (default, real Chrome) | firefox | webkit.
// DEVICE=<Playwright device name, e.g. "iPhone 15", "Pixel 7"> overrides UA, pixel ratio and touch settings; a viewport the harness passes still wins so its layout sizes are kept.
// Firefox does not support isMobile, so it is dropped there (reported as an engine limitation).
//
// SILENCE: headless browsers on macOS still output audio. Every context made here (including the implicit one
// from browser.newPage) aborts /audio/* requests, mutes every media element and zeroes Web Audio output, and
// Chromium gets --mute-audio. Harnesses must launch through this file; never require playwright directly.
const path = process.env.PLAYWRIGHT_PATH || '/Users/elizabethstein/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const pw = require(path);
const engine = process.env.BROWSER || 'chromium';
const type = pw[engine];
let local = {};
try { local = require('./pw.local.cjs'); } catch {} // optional untracked per-machine hooks

const muteScript = () => {
  const p = HTMLMediaElement.prototype;
  const play = p.play;
  p.play = function () { this.muted = true; this.volume = 0; return play.call(this); };
  for (const n of ['AudioContext', 'webkitAudioContext']) {
    const C = window[n];
    if (!C) continue;
    window[n] = class extends C {
      constructor(...a) {
        super(...a);
        try { const g = this.createGain(); g.gain.value = 0; g.connect(super.destination); Object.defineProperty(this, 'destination', { get: () => g }); } catch {}
      }
    };
  }
};

const silence = async (ctx) => {
  await ctx.route('**/audio/**', (r) => r.abort());
  await ctx.addInitScript(muteScript);
  if (local.onContext) await local.onContext(ctx, engine);
};

const launch = (opts = {}) => {
  const o = { ...opts, headless: true };
  if (engine === 'chromium') o.args = [...(opts.args || []), '--mute-audio'];
  if (engine === 'firefox') o.firefoxUserPrefs = { ...(opts.firefoxUserPrefs || {}), 'media.volume_scale': '0.0' };
  if (engine !== 'chromium') delete o.channel;
  return type.launch(o).then((browser) => {
    const nc = browser.newContext.bind(browser);
    browser.newContext = (c = {}) => {
      const dev = process.env.DEVICE ? pw.devices[process.env.DEVICE] : null;
      const o2 = dev ? { ...dev, ...c, viewport: c.viewport || dev.viewport, userAgent: dev.userAgent, deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile, hasTouch: dev.hasTouch } : { ...c };
      if (engine === 'firefox') delete o2.isMobile;
      return nc(o2).then(async (ctx) => { await silence(ctx); return ctx; });
    };
    browser.newPage = async (c = {}) => {
      const ctx = await browser.newContext(c);
      const page = await ctx.newPage();
      const close = page.close.bind(page);
      page.close = async (...a) => { await close(...a); await ctx.close(); };
      return page;
    };
    return browser;
  });
};
module.exports = { chromium: { launch }, engine, devices: pw.devices, silence };
