import {pieceArt,uiIcon} from './soft-graphics.mjs';
for(const el of document.querySelectorAll('[data-soft-icon]'))el.innerHTML=uiIcon(el.dataset.softIcon);
for(const board of document.querySelectorAll('.soft-preview')){for(let i=0;i<24;i++){const tile=document.createElement('span');tile.className='soft-piece';tile.dataset.color=(i*7+Math.floor(i/6))%5;tile.innerHTML=pieceArt(Number(tile.dataset.color));board.append(tile);}}

for(const [i,el] of [...document.querySelectorAll('.mini-piece')].entries())el.innerHTML=pieceArt(i%5);
for(const a of document.querySelectorAll('.record-hub>a')){const slot=a.querySelector(':scope>span');if(slot)slot.innerHTML=uiIcon(a.hash==='#arcade'?'game':a.hash==='#fire'?'leaf':a.hash==='#fire-life'?'wallet':a.hash==='#cart'?'bowl':'bookmark');}
