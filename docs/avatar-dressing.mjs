// Regions of the original bib that face the viewer. The dark return runs
// behind the shoulders. Keep the buckles, buttons and pocket in the front.
export const bibEdges = {
 left: 'M456 311H505L531 356.5H476Q468 325 456 311Z',
 right: 'M567 311H612L632 356.5H591Q580 323 567 311Z',
 body: 'M475 355.5H529V390L496 406Q493 393 486 381Z M590 355.5H640V397H599Q597 384 591 376Z M492 388Q565 386 641 387L700 445V1536H200V506H466Q499 487 493 434Z'
};

// Below the lapels the coat encloses the hips until its hem begins to flare.
export const coatOpening = 'M450 280H540L588 300 650 410 647 500 647 740H518L500 620 515 500 520 400 450 280Z';
export const bibInsideCoat = coatOpening + ' M0 690H1024V1536H0Z';

// Map a rectangle on the unfitted body back to the original atlas.
function patch(layer, left, top, right, bottom, matrix, edge) {
 const [sx,sy,sw,sh] = layer.source, [x,y,w,h] = layer.target;
 return {
  source: [sx+(left-x)*sw/w, sy+(top-y)*sh/h, (right-left)*sw/w, (bottom-top)*sh/h],
  target: [left, top, right-left, bottom-top], matrix, edge
 };
}

// Stretch only the short run above the hardware. Its lower edge meets the
// unwarped buckle pixel for pixel; the garment silhouette trims the far end.
function strapFrame(top, join, shoulderY, shoulderShift) {
 const scale = (join-shoulderY)/(join-top), shear = shoulderShift/(top-join);
 return [1, 0, shear, scale, -shear*join, (1-scale)*join];
}

export function garmentPieces(id, layer) {
 const [x,y,w,h] = layer.target, right=x+w, bottom=y+h;
 if (layer.profile === 'bag') {
  // Bag art is mirrored on the wearer. Use the straight leather below the
  // folded-back end, and leave the pouch, clasp and hanging charms untouched.
  const top=y+h*.085, join=y+h*.19;
  return [
   patch(layer,x,top,right,join+.25,strapFrame(top,join,y-h*.08,w*.12)),
   patch(layer,x,join-.25,right,bottom)
  ];
 }
 const {start,end,shifts}=layer.legFit;
 const pieces = id === 'bottom-overall' ? [
  patch(layer,440,311,532,356.5,strapFrame(311,356,222,-40),'left'),
  patch(layer,540,311,641,356.5,strapFrame(311,356,231,-27),'right'),
  patch(layer,x,355.5,right,start+3,null,'body')
 ] : [patch(layer,x,y,right,start+3)];
 for (const [i,left,edge] of [[0,x,480],[1,480,right]]) {
  const shear = shifts[i]/(end-start);
  pieces.push(patch(layer,left,start-3,edge,bottom,[1,0,shear,1,-shear*start,0]));
 }
 return pieces;
}

// Kept for cached clients using the earlier leg renderer.
export function legArtwork(layer, profile, texture) {
 return garmentPieces(null,layer).map(({source,target,matrix}) => {
  const art = texture(layer.atlas,source,target);
  return matrix ? `<g transform="matrix(${matrix.join(' ')})">${art}</g>` : art;
 }).join('');
}

// Skin starts below the original stocking hems; the source PNG is unchanged.
export const ankleSkinBoundary='M290 1385 292 1380 294 1364 296 1359 298 1354 300 1347 302 1342 304 1343 306 1345 308 1346 310 1347 312 1348 314 1349 316 1350 318 1350 320 1351 322 1352 324 1352 326 1352 328 1353 330 1353 332 1353 334 1353 336 1353 338 1353 340 1353 342 1353 344 1352 346 1352 348 1352 350 1390 352 1390 354 1390 356 1390 358 1390 360 1390 L360 1395H290Z M550 1390 552 1390 554 1390 556 1390 558 1390 560 1390 562 1385 564 1377 566 1368 568 1352 570 1349 572 1350 574 1350 576 1351 578 1352 580 1352 582 1352 584 1353 586 1353 588 1353 590 1354 592 1354 594 1354 596 1354 598 1354 600 1354 602 1354 604 1354 606 1353 608 1353 610 1353 612 1352 614 1352 616 1351 618 1351 620 1359 622 1370 624 1378 626 1383 628 1388 630 1390 L630 1395H550Z';
