const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const {mkdirSync} = require('node:fs');

const site = process.env.AVATAR_BASE_URL || 'http://127.0.0.1:8000/';
const engine = process.env.AVATAR_BROWSER || 'chromium';

(async () => {
  const browser = await {chromium, webkit}[engine].launch({headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 850}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(site + '#avatar');
    await page.locator('#avatar-reference-menu summary').click();
    await page.getByRole('link', {name: '3D 제작 시안'}).click();
    await page.waitForURL('**/avatar-3d.html');
    const stored = await page.evaluate(() => JSON.stringify(localStorage));

    const ready = () => page.waitForSelector('.comparison[aria-busy="false"]');
    const select = (name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
    await ready();
    const images = new Set();
    for (const top of ['hoodie', 'coat']) for (const hat of ['beret', 'none']) for (const shoe of ['boots', 'sneakers']) {
      await select('top', top);
      await select('hat', hat);
      await select('shoes', shoe);
      await ready();
      assert.equal(await page.locator('.failure:visible').count(), 0);
      const result = await page.evaluate(async () => {
        const study = document.querySelector('#study');
        const current = document.querySelector('#current');
        const read = canvas => {
          const {data} = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
          let pixels = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i] > 200) pixels++;
          return {pixels, data};
        };
        const rendered = read(study);
        const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', rendered.data));
        return {hash: Array.from(hash).join(','), newPixels: rendered.pixels, oldPixels: read(current).pixels};
      });
      assert(result.newPixels > 60_000 && result.oldPixels > 60_000);
      images.add(result.hash);
    }
    assert.equal(images.size, 8, 'each outfit must change the pixels');
    const boundaries = await page.evaluate(() => {
      const ctx = document.querySelector('#study').getContext('2d');
      return [747, 748, 749, 750, 751, 752].map(y => {
        const {data} = ctx.getImageData(0, y, 680, 1);
        let count = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 220) count++;
        return count;
      });
    });
    assert(Math.max(...boundaries)-Math.min(...boundaries) < 9, 'denim silhouette jumps at the split');

    await select('hat', 'beret');
    await select('shoes', 'boots');
    for (const view of ['head', 'top', 'feet']) {
      await select('view', view);
      await ready();
      const width = await page.locator('#study').getAttribute('width');
      assert.notEqual(width, '680');
    }
    await select('view', 'full');
    await ready();
    assert.equal(await page.locator('#study').getAttribute('width'), '680');
    for (const width of [320, 390, 1200]) {
      await page.setViewportSize({width, height: 900});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      mkdirSync('test-results', {recursive: true});
      await page.screenshot({path: `test-results/avatar-studio-${engine}-${width}.png`, fullPage: true});
    }

    assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), stored);
    const loadedParts = new Set(requests.filter(url => url.includes('/assets/avatar-studio/')));
    assert.equal(loadedParts.size, 6);
    assert(requests.every(url => !/\.(blend|glb|gltf|obj)(\?|$)/.test(url)));
    assert.deepEqual(errors, []);
    console.log(engine + ': 8 outfits, 6 transparent parts, 4 frames, mobile sizing, unchanged storage PASS');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
