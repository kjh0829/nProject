import {starterOutfit} from './avatar-data.mjs';

const form = document.querySelector('form');
const original = document.querySelector('#current');
const study = document.querySelector('#study');
const comparison = document.querySelector('.comparison');
const status = document.querySelector('.status');
const assets = new Map();
const regions = {
  full: {study: [0, 0, 680, 1060], current: frame(510, 750, 1700, 680/1060)},
  head: {study: [159, 24, 360, 332], current: frame(513, 104, 396, 360/332)},
  top: {study: [120, 245, 454, 326], current: frame(514, 465, 572, 454/326)},
  feet: {study: [206, 797, 285, 249], current: frame(463, 1371, 318, 285/249)},
};

function frame(cx, cy, height, aspect) {
  const width = height * aspect;
  return [cx-width/2, cy-height/2, width, height];
}

function draw(target, source, bounds, width, height) {
  target.width = width;
  target.height = height;
  target.getContext('2d').drawImage(source, ...bounds, 0, 0, width, height);
}

function texture(name) {
  if (!assets.has(name)) {
    const image = new Image();
    image.src = new URL(`./assets/avatar-studio/${name}.webp`, import.meta.url);
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
  const {top, hat, shoes, view} = Object.fromEntries(new FormData(form));
  const {study: crop, current: originalFrame} = regions[view];
  const [, , width, height] = crop;
  const description = [...form.querySelectorAll('input:checked')].map(input => input.nextElementSibling.textContent).join(', ');
  const withHat = hat === 'beret';
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
        frame: originalFrame, width, height, isCurrent: () => revision === request,
        outfit: {
          ...starterOutfit, hair: 'hair-lilac', hat: withHat ? 'hat-beret' : null,
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
      const [upper, lower] = await Promise.all([texture(top + (withHat ? '-beret' : '')), texture(shoes)]);
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
