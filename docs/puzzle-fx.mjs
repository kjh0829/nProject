import {specialMarks} from './puzzle-specials.mjs';
// Presentation only: no changes to puzzle rules, random sequence or saved state.
export function createPuzzleFX(board,{prefix='',activeView='challenge'}={}) {
  const get=id=>document.getElementById(prefix+id);
  const stage=document.createElement('div');stage.className='puzzle-stage';board.before(stage);stage.append(board);
  const layer=document.createElement('div');layer.className='puzzle-fx';layer.setAttribute('aria-hidden','true');stage.append(layer);
  const collection=document.createElement('div');collection.className='puzzle-collect-fx';collection.setAttribute('aria-hidden','true');stage.append(collection);
  const banner=document.createElement('div');banner.className='puzzle-burst';layer.append(banner);
  const controls=board.closest('section').querySelector('.puzzle-controls');
  const sound = document.createElement('button');
  sound.type = 'button';
  sound.id = prefix + 'puzzle-sound';
  controls.append(sound);
  let enabled = false, context, bannerEpoch = 0;
  const animations = new Set(), timers = new Set();
  let particles = 0;
  const soundKey = 'teum-puzzle-sound';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = () => document.body.dataset.view === activeView && !document.hidden;
  const mainBoard = activeView === 'challenge';

  function updateSound(value) {
    enabled = value;
    sound.textContent = enabled ? '효과음 켬' : '효과음 끔';
    sound.setAttribute('aria-pressed', String(enabled));
    if (!enabled && context) void context.suspend().catch(() => {});
  }

  function prepareAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      context ??= new Audio();
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch {}
  }

  try { updateSound(localStorage.getItem(soundKey) === 'on'); }
  catch { updateSound(false); }
  // Enter and pointer gestures unlock audio again after refresh on mobile browsers.
  for (const event of ['pointerup', 'keydown']) {
    board.addEventListener(event, () => { if (enabled) prepareAudio(); });
  }
  window.addEventListener('teum-sound-setting', event => updateSound(event.detail));
  window.addEventListener('storage', event => {
    if (event.key === soundKey || event.key === null) updateSound(event.newValue === 'on');
  });
  function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);}
  function animate(el,frames,options){if(reduced()||!visible()||!el.animate)return null;const a=el.animate(frames,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));return a;}
  const specialNotes = {
    color: [4, 7, 12], nova: [4, 7, 12],
    bomb: [0, 7], mega: [0, 7], rocket: [7, 12], vortex: [0, 3, 7]
  };

  function playNote(type, frequency, endFrequency, start, volume, decay, stopAfter) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + Math.min(.085, decay * .85));
    gain.gain.setValueAtTime(.001, start);
    gain.gain.linearRampToValueAtTime(volume, start + .004);
    gain.gain.exponentialRampToValueAtTime(.001, start + decay);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + stopAfter);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  function tone(combo = 1, win = false, kind = '', size = 3) {
    if (!enabled || !visible() || !context) return;
    try {
      if (context.state === 'suspended') void context.resume().catch(() => {});
      const start = context.currentTime;
      const root = Math.min(combo - 1, 6) * 2;
      const ordinary = combo >= 3 ? [root, root + 7] : [root];
      const notes = win ? [0, 4, 7, 12] : specialNotes[kind] || ordinary;
      if (!win) {
        const strong = combo >= 3 || kind || size >= 6;
        playNote('sine', 150 + Math.min(size, 20) * 3, 48, start, strong ? .046 : .021, .10, .11);
      }
      for (const [index, step] of notes.entries()) {
        const frequency = 360 * 2 ** (step / 12);
        playNote(win ? 'sine' : 'triangle', frequency * 1.2, frequency,
          start + index * .055, win ? .035 : .026, win ? .15 : .09, .17);
      }
    } catch {}
  }
  sound.addEventListener('click', () => {
    const next = !enabled;
    if (next && !window.AudioContext && !window.webkitAudioContext) {
      sound.textContent = '효과음 지원 안 됨';
      sound.disabled = true;
      return;
    }
    window.dispatchEvent(new CustomEvent('teum-sound-setting', {detail: next}));
    try { localStorage.setItem(soundKey, next ? 'on' : 'off'); } catch {}
    if (next) {
      prepareAudio();
      tone();
    }
  });

  async function swap(first, second, valid = true) {
    if (reduced() || !visible()) return;
    const a = board.children[first], b = board.children[second];
    const origin = a.getBoundingClientRect(), target = b.getBoundingClientRect();
    const dx = target.x - origin.x, dy = target.y - origin.y;
    const animations = [a, b].map((tile, index) => {
      const direction = index === 0 ? 1 : -1;
      const move = (fraction, scale = 1) =>
        `translate(${dx * direction * fraction}px, ${dy * direction * fraction}px) scale(${scale})`;
      const frames = valid
        ? [{transform: move(0, .96)}, {transform: move(.94, 1.05), offset: .74}, {transform: move(1)}]
        : [{transform: move(0)}, {transform: move(.84, .95), offset: .45}, {transform: move(0)}];
      return animate(tile, frames, {duration: valid ? 116 : 150, easing: 'cubic-bezier(.22,.75,.3,1)'});
    });
    await Promise.all(animations.map(animation => animation?.finished.catch(() => {})));
  }
  function clear(){bannerEpoch++;for(const a of animations)a.cancel();animations.clear();for(const t of timers)clearTimeout(t);timers.clear();particles=0;layer.replaceChildren(banner);collection.replaceChildren();banner.textContent='';banner.className='puzzle-burst';stage.classList.remove('is-winning');}
  function particle(x,y,color,k,level=1){if(particles>=72)return;particles++;const dot=document.createElement('i');dot.className='puzzle-particle';dot.style.left=x+'px';dot.style.top=y+'px';dot.style.background=color;layer.append(dot);const angle=k*Math.PI/3,radius=30+Math.min(level,5)*7;animate(dot,[{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*radius-4}px,${Math.sin(angle)*radius+18}px) scale(.2)`,opacity:0}],{duration:430,easing:'ease-out',fill:'forwards'});later(()=>{dot.remove();particles--;},450);}
  async function anticipate(frame){if(reduced()||!visible()||!frame.fired||frame.combo>1)return;const active=[];for(const effect of (frame.effects||[]).slice(0,8)){const tile=board.children[effect.at];if(tile){const a=animate(tile,[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.13)',filter:'brightness(1.2)',offset:.65},{transform:'scale(1.13)',filter:'brightness(1.2)'}],{duration:mainBoard?72:90,easing:'ease-in-out'});if(a)active.push(a.finished.catch(()=>{}));}}await Promise.all(active);}
  function frame(frame,previous){if(!visible())return;const epoch=++bannerEpoch,effects=frame.effects||[],primary=effects[0]?.type||'';tone(frame.combo,false,primary,frame.clear.length);
    for(const animation of animations)if(animation.effect?.target===banner)animation.cancel();
    const points = frame.score - (previous?.score || 0);
    const comboText = frame.combo > 1 ? `${frame.combo}연쇄!` : '';
    const bannerText = mainBoard
      ? frame.combination || (frame.combo >= 3 ? comboText : '')
      : frame.bonus ? `BONUS! +${points}` : frame.combination ||
        (comboText ? `${comboText} +${points}` : frame.fired ? 'SPECIAL!' : frame.created ? 'SPECIAL READY!' : `+${points}`);
    banner.textContent = bannerText;
    banner.className = bannerText ? 'puzzle-burst show' : 'puzzle-burst';
    banner.dataset.chain = String(Math.min(5, frame.combo));
    if (bannerText) animate(banner, [
      {transform: 'translate(-50%,-2px) scale(.86)', opacity: 0},
      {transform: 'translate(-50%,0) scale(1.05)', opacity: 1, offset: .20},
      {transform: 'translate(-50%,-4px) scale(1)', opacity: 1, offset: .72},
      {transform: 'translate(-50%,-8px) scale(.97)', opacity: 0}
    ], {duration: 480, fill: 'forwards'});
    const score=get('puzzle-score');animate(score,[{transform:'scale(1)'},{transform:'scale(1.15)',color:'#ffe3a6'},{transform:'scale(1)'}],{duration:300});
    for(const birth of frame.births||[]){const tile=board.children[birth.at];if(!tile)continue;tile.dataset.special=birth.special;tile.querySelector('.special-mark')?.remove();const mark=document.createElement('span');mark.className='special-mark';mark.textContent=specialMarks[birth.special];mark.setAttribute('aria-hidden','true');tile.append(mark);animate(tile,[{transform:'scale(.85)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:350});}
    if(reduced()){later(()=>{if(epoch===bannerEpoch)banner.classList.remove('show');},650);return;}
    const bounds=stage.getBoundingClientRect(),colors=['#ffb36e','#d4eaa8','#d4c7f7','#a8d9e2','#ffe59b'];
    const center=i=>{const r=board.children[i].getBoundingClientRect();return {x:r.x-bounds.x+r.width/2,y:r.y-bounds.y+r.height/2,w:r.width,h:r.height};};
    if (mainBoard) {
      for (const birth of (frame.births || []).slice(0, 4)) {
        const point = center(birth.at);
        const ring = document.createElement('i');
        ring.className = 'puzzle-birth-ring';
        ring.style.left = point.x + 'px';
        ring.style.top = point.y + 'px';
        ring.style.width = point.w + 'px';
        ring.style.height = point.h + 'px';
        layer.append(ring);
        animate(ring, [
          {transform: 'translate(-50%,-50%) scale(1.65)', opacity: .25},
          {transform: 'translate(-50%,-50%) scale(.54)', opacity: 1, offset: .60},
          {transform: 'translate(-50%,-50%) scale(.95)', opacity: 0}
        ], {duration: 230, easing: 'ease-out', fill: 'forwards'});
        later(() => ring.remove(), 245);
      }
    }
    const collectTime = mainBoard ? 235 : 520;
    const destination=get('puzzle-collected')?.getBoundingClientRect();if((frame.collect||frame.clear).length)later(()=>animate(get('puzzle-collected'),[{transform:'scale(1)'},{transform:'scale(1.12)',color:'#ffe1a5'},{transform:'scale(1)'}],{duration:155}),collectTime);
    if(destination){for(const i of (frame.collect||frame.clear.slice(0,3)).slice(0,4)){const p=center(i),dot=document.createElement('i');dot.className='puzzle-collection-spark';dot.style.background=colors[frame.board[i].color];collection.append(dot);const dx=destination.x-bounds.x+destination.width/2,dy=destination.y-bounds.y+destination.height/2;animate(dot,[{transform:`translate(${p.x}px,${p.y}px) scale(1)`,opacity:1},{transform:`translate(${(p.x+dx)/2+25}px,${Math.min(p.y,dy)-25}px) scale(.8)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(.2)`,opacity:0}],{duration:collectTime,easing:'ease-in-out',fill:'forwards'});later(()=>dot.remove(),collectTime+20);}}
    const particleCount = mainBoard
      ? Math.min(frame.combo >= 3 || frame.fired ? 5 : frame.combo + 1, Math.floor(48 / Math.max(1, frame.clear.length)))
      : Math.min(6, 3 + frame.combo);
    for (const i of frame.clear) {
      const p = center(i);
      for (let k = 0; k < particleCount; k++) particle(p.x, p.y, colors[frame.board[i].color], k, frame.combo);
    }
    let beams=0;
    for(const effect of effects.slice(0,16)){const p=center(effect.at),flash=document.createElement('i');flash.className='puzzle-energy '+effect.type;flash.dataset.effect=effect.type;flash.style.left=p.x+'px';flash.style.top=p.y+'px';layer.append(flash);const size=effect.type==='nova'?bounds.width*2:effect.type==='mega'?p.w*5:effect.type==='bomb'?p.w*3: p.w*1.8;flash.style.width=size+'px';flash.style.height=size+'px';animate(flash,[{opacity:.8,transform:'translate(-50%,-50%) scale(.1)'},{opacity:0,transform:'translate(-50%,-50%) scale(1)'}],{duration:480,easing:'ease-out',fill:'forwards'});later(()=>flash.remove(),500);
      if(['rocket','link','portal'].includes(effect.type)){for(const target of (effect.targets||[]).slice(0,effect.type==='link'?1:3)){const q=center(effect.type==='link'?(effect.targets||[]).at(-1):target),object=document.createElement('i');object.className='puzzle-traveler '+effect.type;object.textContent=effect.type==='rocket'?'➤':effect.type==='portal'?'◎':'⌁';layer.append(object);animate(object,[{transform:`translate(${p.x}px,${p.y}px) rotate(-30deg) scale(.8)`,opacity:1},{transform:`translate(${(p.x+q.x)/2+20}px,${Math.min(p.y,q.y)-35}px) rotate(20deg) scale(1.3)`,opacity:1,offset:.5},{transform:`translate(${q.x}px,${q.y}px) rotate(75deg) scale(.3)`,opacity:0}],{duration:520,easing:'ease-in-out',fill:'forwards'});later(()=>object.remove(),540);}}
      if(effect.type==='belt'){const points=effect.targets||[];for(let n=0;n<points.length;n++){const at=points[n],next=points[n+1],source=center(at),target=next===undefined?{x:source.x+15,y:source.y}:center(next);animate(board.children[at],[{transform:'translate(0,0)',opacity:1},{transform:`translate(${target.x-source.x}px,${target.y-source.y}px)`,opacity:next===undefined?0:1}],{duration:270,fill:'forwards'});}}
      if(effect.type==='vortex'){const points=effect.targets||[];for(let n=0;n<points.length;n++){const at=points[n];if(frame.clear.includes(at))continue;const source=center(at),target=center(points[(n+1)%points.length]);animate(board.children[at],[{transform:'translate(0,0)'},{transform:`translate(${target.x-source.x}px,${target.y-source.y}px)`}],{duration:300,easing:'ease-in-out',fill:'forwards'});}flash.classList.add('spiral');animate(flash,[{transform:'translate(-50%,-50%) rotate(0) scale(.2)',opacity:.8},{transform:'translate(-50%,-50%) rotate(270deg) scale(1.7)',opacity:0}],{duration:500,fill:'forwards'});}
      const targets=effect.targets||[];
      if(['row','col','cross','wide-cross'].includes(effect.type)){const vertical=effect.type==='col';const axes=effect.type==='row'||effect.type==='col'?[vertical]:[false,true];for(const v of axes){const beam=document.createElement('i');beam.className='puzzle-laser '+(v?'vertical':'horizontal')+(effect.type==='wide-cross'?' wide':'');beam.dataset.effect=effect.type;beam.style.left=(v?p.x:0)+'px';beam.style.top=(v?0:p.y)+'px';layer.append(beam);animate(beam,[{opacity:0,filter:'blur(4px)'},{opacity:.95,filter:'blur(0)',offset:.25},{opacity:0,filter:'blur(2px)'}],{duration:440,fill:'forwards'});later(()=>beam.remove(),470);}}
      if(['color','nova','link'].includes(effect.type)){for(const target of (effect.type==='link'?targets.slice(-1):targets)){if(beams++>=40)break;const q=center(target),from=mainBoard&&effect.type==='color'?q:p,to=from===q?p:q,dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx),beam=document.createElement('i');beam.className='puzzle-color-beam';beam.style.left=from.x+'px';beam.style.top=from.y+'px';beam.style.width=Math.hypot(dx,dy)+'px';layer.append(beam);animate(beam,[{transform:`rotate(${angle}rad) scaleX(0)`,opacity:.9},{transform:`rotate(${angle}rad) scaleX(1)`,opacity:.8,offset:.45},{transform:`rotate(${angle}rad) scaleX(1)`,opacity:0}],{duration:480,fill:'forwards'});later(()=>beam.remove(),500);}}
    }
    if(frame.combination||frame.combo>=(mainBoard?3:2)||frame.clear.length>=6){const kick=Math.min(3,1+frame.combo*.4);animate(board,[{transform:'translate(0,0)'},{transform:`translate(${-kick}px,1px)`,offset:.2},{transform:`translate(${kick}px,-1px)`,offset:.5},{transform:'translate(0,0)'}],{duration:130});}
    if(frame.clear.length&&(frame.clear.length>=6||frame.combo>=(mainBoard?3:2))){const pts=frame.clear.map(center),ring=document.createElement('i');ring.className='puzzle-hit-ring';ring.style.left=(pts.reduce((n,p)=>n+p.x,0)/pts.length)+'px';ring.style.top=(pts.reduce((n,p)=>n+p.y,0)/pts.length)+'px';const diameter=Math.min(260,90+frame.clear.length*4);ring.style.width=diameter+'px';ring.style.height=diameter+'px';layer.append(ring);animate(ring,[{transform:'translate(-50%,-50%) scale(.15)',opacity:.65},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:260,easing:'ease-out',fill:'forwards'});later(()=>ring.remove(),280);}
    if (mainBoard && (frame.combo >= 3 || frame.combination)) {
      animate(stage, [
        {boxShadow: '0 0 0 0 #ffcf7144'},
        {boxShadow: '0 0 0 3px #ffda91cc, 0 0 24px #ffb75f70', offset: .23},
        {boxShadow: '0 0 0 0 #ffcf7100'}
      ], {duration: 300});
    }
    if(frame.cleared>(previous?.cleared||0)){const box=get('puzzle-ice');animate(box,[{color:'#fff',transform:'scale(1.2)'},{color:'#a8d9e2',transform:'scale(1)'}],{duration:350});}
    later(()=>{if(epoch===bannerEpoch)banner.classList.remove('show');},650);
  }
  async function drop(previous){if(!previous||reduced()||!visible())return;const step=board.children[6]?.getBoundingClientRect().y-board.children[0]?.getBoundingClientRect().y;if(!step)return;const cleared=new Set(previous.clear),active=[];
    const fall=rows=>{const survivors=rows.filter(r=>!cleared.has(r.i));for(let n=rows.length-1;n>=0;n--){const entry=rows[n],from=survivors.pop(),distance=from?entry.r-from.r:n+1;if(!distance)continue;const a=animate(board.children[entry.i],[{transform:`translateY(${-distance*step}px)`,opacity:from?1:.4},{transform:'translateY(0)',opacity:1}],{duration:mainBoard?Math.max(76,133-Math.min(6,(previous.combo||1)-1)*9):180,easing:'cubic-bezier(.24,.74,.38,1)'});if(a)active.push(a.finished.catch(()=>{}));}};
    for(let c=0;c<6;c++){let rows=[];for(let r=0;r<6;r++){const i=r*6+c;if(previous.boxes?.[i]||previous.chains?.[i]){fall(rows);rows=[];}else rows.push({r,i});}fall(rows);}await Promise.all(active);
  }
  function win(label='STAGE CLEAR!'){if(!visible())return;if(mainBoard)animate(get('puzzle-collected'),[{transform:'scale(1)'},{transform:'scale(1.16)',color:'#ffdb8c'},{transform:'scale(1)'}],{duration:290});for(const a of animations)if(a.effect?.target===banner)a.cancel();const epoch=++bannerEpoch;tone(1,true);stage.classList.add('is-winning');banner.textContent=label;banner.className='puzzle-burst show';if(!reduced()){const rect=stage.getBoundingClientRect();for(let i=0;i<24;i++)particle(rect.width*(.15+Math.random()*.7),rect.height*.35,['#ffb36e','#d4eaa8','#d4c7f7'][i%3],i);}later(()=>{if(epoch===bannerEpoch){banner.classList.remove('show');stage.classList.remove('is-winning');}},1400);}
  window.addEventListener('hashchange',()=>{clear();if(!visible()&&context)void context.suspend().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();if(context)void context.suspend().catch(()=>{});}});
  return {frame,drop,win,clear,anticipate,swap};
}
