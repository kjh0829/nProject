// Keep the waist registration while fitting trouser hems to the fixed legs.
export function legArtwork(a,p,texture){
 const[sx,sy,sw,sh]=a.source,[x,y,w,h]=a.target,{start,end,shifts}=a.legFit,sourceY=v=>sy+(v-y)*sh/h;
 let art='';
 art+=texture(a.atlas,[sx,sy,sw,sourceY(start+3)-sy],[x,y,w,start+3-y]);
 const top=start-3;
 for(const [i,left,right]of [[0,x,480],[1,480,x+w]]){
  const k=shifts[i]/(end-start),source=[sx+(left-x)*sw/w,sourceY(top),(right-left)*sw/w,sourceY(y+h)-sourceY(top)];
  art+=`<g transform="matrix(1 0 ${k} 1 ${-k*start} 0)">${texture(a.atlas,source,[left,top,right-left,y+h-top])}</g>`;
 }
 return art;
}

// Skin starts below the original stocking hems; the source PNG is unchanged.
export const ankleSkinBoundary='M290 1385 292 1380 294 1364 296 1359 298 1354 300 1347 302 1342 304 1343 306 1345 308 1346 310 1347 312 1348 314 1349 316 1350 318 1350 320 1351 322 1352 324 1352 326 1352 328 1353 330 1353 332 1353 334 1353 336 1353 338 1353 340 1353 342 1353 344 1352 346 1352 348 1352 350 1390 352 1390 354 1390 356 1390 358 1390 360 1390 L360 1395H290Z M550 1390 552 1390 554 1390 556 1390 558 1390 560 1390 562 1385 564 1377 566 1368 568 1352 570 1349 572 1350 574 1350 576 1351 578 1352 580 1352 582 1352 584 1353 586 1353 588 1353 590 1354 592 1354 594 1354 596 1354 598 1354 600 1354 602 1354 604 1354 606 1353 608 1353 610 1353 612 1352 614 1352 616 1351 618 1351 620 1359 622 1370 624 1378 626 1383 628 1388 630 1390 L630 1395H550Z';
