import {starterOutfit} from './avatar-data.mjs';

const form = document.querySelector('form');
const original = document.querySelector('#current');
const study = document.querySelector('#study');
const comparison = document.querySelector('.comparison');
const status = document.querySelector('.status');
const assets = new Map();
const artworkScale = .6183;
const hairstyles = {
  lilac: {suffix: '', artwork: {hair: 'hair-lilac', hat: null}},
  beret: {suffix: '-beret', artwork: {hair: 'hair-lilac', hat: 'hat-beret'}},
};
const regions = {
  full: [0, 0, 680, 1060],
  head: [195, 41, 286, 292],
  top: [119, 223, 443, 386],
  feet: [153, 794, 340, 246],
};

function artworkFrame([x, y, width, height]) {
  // Align the reference at the same scale and floor as the Blender study.
  return [528+(x-340)/artworkScale, 1508+(y-1015)/artworkScale,
    width/artworkScale, height/artworkScale];
}

function draw(target, source, bounds, width, height) {
  target.width = width;
  target.height = height;
  target.getContext('2d').drawImage(source, ...bounds, 0, 0, width, height);
}

function texture(name) {
  if (!assets.has(name)) {
    const image = new Image();
    image.src = new URL(`./assets/avatar-studio/${name}.webp?v=19`, import.meta.url);
    assets.set(name, image.decode().then(() => image).catch(error => {
      assets.delete(name);
      throw error;
    }));
  }
  return assets.get(name);
}

let request = 0;
let originalRenderer;
const copy = document.createElement('canvas');
copy.width = 680;
copy.height = 1060;

async function update() {
  const revision = ++request;
  const {top, hair, shoes, view} = Object.fromEntries(new FormData(form));
  const hairstyle = hairstyles[hair];
  const crop = regions[view];
  const [, , width, height] = crop;
  const description = [...form.querySelectorAll('input:checked')].map(input => input.nextElementSibling.textContent).join(', ');
  comparison.setAttribute('aria-busy', 'true');
  status.textContent = '착장을 불러오는 중입니다.';

  const jobs = [
    (async () => {
      originalRenderer ??= import('./avatar-canvas.mjs?renderer=studio-reference-v1').catch(error => {
        originalRenderer = undefined;
        throw error;
      });
      const {renderAvatarCanvas} = await originalRenderer;
      if (revision !== request) return;
      const source = await renderAvatarCanvas({skin: 'peach', face: 'smile'}, {
        frame: artworkFrame(crop), width, height, isCurrent: () => revision === request,
        outfit: {
          ...starterOutfit, ...hairstyle.artwork,
          top: top === 'coat' ? 'top-night' : 'top-mint', shoes: shoes === 'boots' ? 'shoes-star' : 'shoes-canvas',
        },
      });
      try {
        if (revision !== request) return;
        draw(original, source, [0, 0, source.width, source.height], width, height);
        original.setAttribute('aria-label', `현재 옷장 · ${description}`);
      } finally {
        source.width = source.height = 0;
      }
    })(),
    (async () => {
      const [upper, lower] = await Promise.all([texture(top + hairstyle.suffix), texture(shoes)]);
      if (revision !== request) return;
      if (upper.width !== copy.width || lower.width !== copy.width || upper.height + lower.height !== copy.height) {
        throw Error('Unexpected layer dimensions');
      }
      const ctx = copy.getContext('2d');
      ctx.clearRect(0, 0, copy.width, copy.height);
      ctx.drawImage(upper, 0, 0);
      ctx.drawImage(lower, 0, upper.height);
      draw(study, copy, crop, width, height);
      study.setAttribute('aria-label', `3D 모델에서 출력한 착장 · ${description}`);
    })(),
  ];

  const results = await Promise.allSettled(jobs);
  if (revision !== request) return;
  for (const [i, target] of [original, study].entries()) {
    const failed = results[i].status === 'rejected';
    target.style.visibility = failed ? 'hidden' : '';
    document.querySelector(`[data-error="${target.id}"]`).hidden = !failed;
  }
  comparison.setAttribute('aria-busy', 'false');
  status.textContent = results.every(result => result.status === 'fulfilled') ? '' : '일부 착장을 표시할 수 없습니다.';
}

form.addEventListener('change', update);
update();
