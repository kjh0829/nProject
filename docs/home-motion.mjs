import {collectionOf} from './collection-core.mjs';
import {pieceArt} from './soft-graphics.mjs';
import {createScorePuzzle,applyMove} from './puzzle-core.mjs';
import {specialMarks} from './puzzle-specials.mjs';
import {readJourney,JOURNEY_KEY} from './journey-saves.mjs';
import {readAvatar,AVATAR_KEY} from './avatar-store.mjs';

const home = document.getElementById('home');
const board = home.querySelector('.soft-preview');
const control = home.querySelector('.home-demo-control');
const start = home.querySelector('[data-menu-journey-action]');
const avatarCard = home.querySelector('.avatar-entry');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
// A deterministic three-wave move from the real engine, isolated from saved games.
const initial = createScorePuzzle('home-demo-v1');
const pair = [3, 9];
const demo = applyMove(initial, ...pair);
const animations = new Set();
let playing = false;
let generation = 0;
let onHome = false;
let paused = false;
let repeatTimer = null;
let cueShown = false;
let inView = false;
let entered = false;
let lastRecords = recordSignature();
let lastOutfit = outfitSignature();

function visible() {
  return document.body.dataset.view === 'home' && !document.hidden;
}

function recordSignature() {
  return JSON.stringify(readJourney().value.records);
}

function outfitSignature() {
  const value = readAvatar().value;
  return JSON.stringify([value.skin, value.face, value.equipped, collectionOf(value).background]);
}

function draw(tiles, births = []) {
  const specials = new Map(births.map(birth => [birth.at, birth.special]));
  board.replaceChildren(...tiles.map((tile, index) => {
    const el = document.createElement('span');
    el.className = 'soft-piece';
    el.dataset.color = tile.color;
    el.innerHTML = pieceArt(tile.color);
    const special = specials.get(index) || tile.special;
    if (special) {
      const mark = document.createElement('span');
      mark.className = 'home-demo-special';
      mark.textContent = specialMarks[special];
      el.append(mark);
    }
    return el;
  }));
}

async function animate(el, frames, options) {
  if (!el || !visible() || motion.matches || !el.animate) return;
  const animation = el.animate(frames, options);
  animations.add(animation);
  try { await animation.finished; } catch {}
  finally { animations.delete(animation); }
}

function pulse(el) {
  return animate(el, [
    {boxShadow: '0 0 0 0 #f7ca7e00'},
    {boxShadow: '0 0 0 5px #f7ca7e77, 0 8px 24px #b87c3628', offset: .35},
    {boxShadow: '0 0 0 0 #f7ca7e00'}
  ], {duration: 430, easing: 'ease-out'});
}

function stop() {
  generation++;
  clearTimeout(repeatTimer);
  repeatTimer = null;
  playing = false;
  home.removeAttribute('data-demo-playing');
  updateControl();
  for (const animation of animations) animation.cancel();
  animations.clear();
  draw(initial.board);
}

async function fall(previous, next) {
  draw(next.board, next.births);
  const cleared = new Set(previous.clear);
  const step = board.children[6].offsetTop - board.children[0].offsetTop;
  const falls = [];
  for (let column = 0; column < 6; column++) {
    const survivors = [];
    for (let row = 0; row < 6; row++) {
      if (!cleared.has(row * 6 + column)) survivors.push(row);
    }
    for (let row = 5; row >= 0; row--) {
      const source = survivors.pop();
      const distance = source === undefined ? row + 1 : row - source;
      if (distance) falls.push(animate(board.children[row * 6 + column], [
        {transform: `translateY(${-distance * step}px)`, opacity: source === undefined ? .1 : 1},
        {transform: 'translateY(0)', opacity: 1}
      ], {duration: 145, easing: 'cubic-bezier(.22,.8,.35,1)'}));
    }
  }
  await Promise.all(falls);
}

async function play() {
  if (playing || paused || !inView || !visible() || motion.matches || !board.animate) return;
  stop();
  const token = generation;
  const current = () => token === generation && inView && visible() && !motion.matches;
  playing = true;
  home.dataset.demoPlaying = 'true';
  updateControl();
  const positions = pair.map(index => ({x: board.children[index].offsetLeft, y: board.children[index].offsetTop}));
  await Promise.all(pair.map((index, n) => animate(board.children[index], [
    {transform: 'translate(0,0) scale(.94)'},
    {transform: `translate(${positions[1 - n].x - positions[n].x}px,${positions[1 - n].y - positions[n].y}px) scale(1.05)`}
  ], {duration: 180, easing: 'ease-in-out'})));

  for (const [index, frame] of demo.frames.entries()) {
    if (!current()) return;
    if (index) await fall(demo.frames[index - 1], frame);
    else draw(frame.board, frame.births);
    if (!current()) return;
    if (index >= 1) void pulse(board);
    await Promise.all(frame.clear.map(at => animate(board.children[at], [
      {transform: 'scale(1)', opacity: 1},
      {transform: 'scale(1.16)', filter: 'brightness(1.4)', opacity: 1, offset: .32},
      {transform: 'scale(.2) rotate(10deg)', opacity: 0}
    ], {duration: 190 - index * 20, easing: 'ease-out', fill: 'forwards'})));
  }
  if (!current()) return;
  await fall(demo.frames.at(-1), {board: demo.state.board});
  if (!current()) return;
  playing = false;
  home.removeAttribute('data-demo-playing');
  if (!cueShown) {
    cueShown = true;
    void pulse(start);
  }
  repeatTimer = setTimeout(() => {
    repeatTimer = null;
    maybePlay();
  }, 1000);
}

function maybePlay() {
  if (inView && !paused && !playing && repeatTimer === null && visible() && !motion.matches) void play();
}

function refresh() {
  const active = visible();
  if (!active) {
    onHome = false;
    stop();
    return;
  }
  const records = recordSignature();
  const outfit = outfitSignature();
  if (!onHome) {
    onHome = true;
    if (!entered && !motion.matches) {
      entered = true;
      const targets = [...home.querySelectorAll('.soft-game-copy > *, .home-game-paths > a')];
      targets.forEach((el, index) => void animate(el, [
        {opacity: .3, transform: 'translateY(8px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 280, delay: Math.min(index * 35, 175), easing: 'ease-out'}));
    }
  }
  maybePlay();
  if (records !== lastRecords) void pulse(start);
  if (outfit !== lastOutfit) void pulse(avatarCard);
  lastRecords = records;
  lastOutfit = outfit;
}

function updateControl() {
  control.textContent = paused ? '시연 재생 ▶' : '시연 일시정지 Ⅱ';
}

control.addEventListener('click', () => {
  paused = !paused;
  stop();
  maybePlay();
});
window.addEventListener('hashchange', refresh);
document.addEventListener('visibilitychange', refresh);
window.addEventListener('teum-avatar-changed', refresh);
window.addEventListener('storage', event => {
  if (event.key === null || event.key === JOURNEY_KEY || event.key === AVATAR_KEY) refresh();
});
motion.addEventListener('change', () => {
  stop();
  control.hidden = motion.matches;
  refresh();
});
draw(initial.board);
updateControl();
control.hidden = motion.matches;
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
    if (!inView) stop();
    maybePlay();
  }, {threshold: .2});
  observer.observe(board);
} else inView = true;
refresh();
