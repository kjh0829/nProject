const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const {mkdirSync} = require('node:fs');

const site = process.env.AVATAR_BASE_URL || 'http://127.0.0.1:8000/';
const engine = process.env.AVATAR_BROWSER || 'chromium';

(async () => {
  const browser = await {chromium, webkit}[engine].launch({headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 850}});
    const wardrobe = await context.newPage();
    await wardrobe.goto(site + '#avatar');
    await wardrobe.waitForSelector('#avatar-stage canvas');
    await wardrobe.locator('#avatar-reference-menu summary').click();
    await wardrobe.getByRole('link', {name: '3D 제작 시안'}).click();
    await wardrobe.waitForURL('**/avatar-3d.html');
    const previewUrl = wardrobe.url();
    await wardrobe.close();

    // Use a separate page so WebKit's cancellation of the departing
    // wardrobe's thumbnail downloads is outside the preview assertions.
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(previewUrl);
    const stored = await page.evaluate(() => JSON.stringify(localStorage));

    const ready = () => page.waitForSelector('.comparison[aria-busy="false"]');
    const select = (name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
    await ready();
    const hairChoices = page.getByRole('group', {name: '헤어', exact: true});
    assert.equal(await hairChoices.getByRole('radio').count(), 2);
    assert.equal(await page.locator('input[name="hat"]').count(), 0);
    const images = new Set();
    for (const top of ['hoodie', 'coat']) for (const hair of ['beret', 'lilac']) for (const shoe of ['boots', 'sneakers']) {
      await select('top', top);
      await select('hair', hair);
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
        const fraction = (x, y, width, height, matches) => {
          const {data} = study.getContext('2d').getImageData(x, y, width, height);
          let count = 0;
          for (let i=0; i<data.length; i+=4) if (matches(data[i], data[i+2], data[i+3])) count++;
          return count/(width*height);
        };
        // These landmarks belong to the fixed three-quarter camera. Sample
        // the ear behind the near lock and the gap beside the lower jaw.
        const exposedEar = fraction(294, 166, 8, 15, (red, blue, alpha) => alpha>160 && red>blue+45);
        const jawGap = fraction(302, 191, 15, 15, (_red, _blue, alpha) => alpha<150);
        const neckWidth = 64*fraction(300, 224, 64, 14, (red, blue, alpha) => alpha>190 && red>134 && red>blue+38);
        const hasBeret = canvas => {
          const {data} = canvas.getContext('2d').getImageData(200, 53, 250, 35);
          let opaque = 0;
          for (let i=3; i<data.length; i+=4) if (data[i]>190) opaque++;
          return opaque > 100;
        };
        return {hash: Array.from(hash).join(','), newPixels: rendered.pixels, oldPixels: read(current).pixels,
          exposedEar, jawGap, neckWidth, studyBeret: hasBeret(study), artworkBeret: hasBeret(current)};
      });
      assert(result.newPixels > 60_000 && result.oldPixels > 60_000);
      assert.equal(result.studyBeret, hair === 'beret', `${top}/${hair}: rendered headwear differs from the hairstyle`);
      assert.equal(result.artworkBeret, hair === 'beret', `${top}/${hair}: reference headwear differs from the hairstyle`);
      assert(result.exposedEar < .12, `${top}/${hair}: the side lock exposes the ear`);
      assert(result.jawGap < .10, `${top}/${hair}: the side lock separates from the jaw`);
      assert(result.neckWidth >= 20 && result.neckWidth <= 36,
        `${top}/${hair}: visible neck width drifted (${result.neckWidth.toFixed(1)}px)`);
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

    await select('top', 'hoodie');
    await select('hair', 'lilac');
    await select('shoes', 'boots');
    await ready();
    const [artwork, study] = await page.evaluate(() => ['current','study'].map(id => {
      const ctx = document.querySelector('#'+id).getContext('2d');
      const opaqueColumns = (y, start, end) => {
        const {data} = ctx.getImageData(start, y, end-start, 1);
        const opaque = [];
        for (let x=start; x<end; x++) if (data[(x-start)*4+3] > 190) opaque.push(x);
        return opaque;
      };
      const span = (y, start=195, end=470) => {
        const opaque = opaqueColumns(y, start, end);
        return [opaque[0], opaque.at(-1)];
      };
      const width = bounds => bounds[1]-bounds[0];
      const center = bounds => (bounds[0]+bounds[1])/2;
      const crown = [168, 182, 196, 208, 220].map(y => width(span(y))).sort((a,b) => a-b)[2];
      let consecutive = 0;
      let inseam;
      for (let y=540; y<700; y++) {
        const columns = opaqueColumns(y, 228, 452);
        const gap = columns.some((x, i) => i>=30 && columns.length-i>=30 && x-columns[i-1]>=5);
        consecutive = gap ? consecutive+1 : 0;
        if (consecutive === 7) {
          inseam = y-6;
          break;
        }
      }
      return {crown, inseam, hips: width(span(552,230,457)),
        nearAnkle: center(span(827,160,327)), farAnkle: center(span(827,330,501))};
    }));
    assert(study.crown >= artwork.crown*.82 && study.crown <= artwork.crown*1.17,
      `head width drifted from the same-scale illustration: ${study.crown}/${artwork.crown}`);
    assert(Math.abs(study.inseam-artwork.inseam) <= 20,
      `inseam height drifted from the same-scale illustration: ${study.inseam}/${artwork.inseam}`);
    assert(study.hips >= artwork.hips*.89 && study.hips <= artwork.hips*1.13,
      `hip width drifted from the same-scale illustration: ${study.hips}/${artwork.hips}`);
    for (const landmark of ['nearAnkle','farAnkle']) {
      assert(Math.abs(study[landmark]-artwork[landmark]) < 16,
        `${landmark} drifted from the same-scale illustration: ${study[landmark]}/${artwork[landmark]}`);
    }

    await select('top', 'coat');
    await select('hair', 'beret');
    await select('shoes', 'boots');
    for (const view of ['head', 'top', 'feet']) {
      await select('view', view);
      await ready();
      const width = await page.locator('#study').getAttribute('width');
      assert.notEqual(width, '680');
    }
    const shoeEdges = await page.locator('#current').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const clear = pixels => pixels.every((value, index) => index % 4 !== 3 || value < 15);
      return clear(ctx.getImageData(0, 0, 1, canvas.height).data)
        && clear(ctx.getImageData(canvas.width-1, 0, 1, canvas.height).data)
        && clear(ctx.getImageData(0, canvas.height-1, canvas.width, 1).data);
    });
    assert(shoeEdges, 'shoe zoom must show both shoes without clipping');
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
