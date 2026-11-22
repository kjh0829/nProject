// Heel cups are registered in each original atlas, not at a crop's upper edge.
// Shared by the bounded Canvas painter, the SVG reference, and catalog checks.
export const avatarFootRig=[{center:[328,1372],turn:-8},{center:[590,1382],turn:0}];
export const avatarShoeFits={
 'shoes-canvas':[
  {anchor:[132,190],opening:[[87,225],[134,80],[176,225],[134,186]]},
  {anchor:[320,212],opening:[[287,189],[282,153],[372,231],[300,292]]}
 ],
 'shoes-lilac':[
  {anchor:[137,807],opening:[[84,867],[132,689],[189,867],[137,812]]},
  {anchor:[320,815],opening:[[291,814],[281,738],[365,847],[301,928]]}
 ],
 'shoes-blossom':[
  {anchor:[112,132],opening:[[65,167],[109,22],[157,167],[111,139]]},
  {anchor:[278,159],opening:[[246,133],[244,96],[330,182],[253,237]]}
 ],
 'shoes-coast':[
  {anchor:[622,132],opening:[[574,175],[621,20],[666,175],[621,133]]},
  {anchor:[784,170],opening:[[749,142],[747,107],[832,190],[763,245]]}
 ],
 'shoes-starlit':[
  {anchor:[119,633],opening:[[69,677],[118,523],[166,677],[117,631]]},
  {anchor:[279,663],opening:[[244,635],[242,611],[334,687],[256,751]]}
 ],
 'shoes-forest':[
  {anchor:[621,642],opening:[[572,681],[623,530],[673,681],[622,632]]},
  {anchor:[788,664],opening:[[760,646],[747,588],[827,685],[760,739]]}
 ],
 'shoes-cafe':[
  {anchor:[112,1137],opening:[[62,1194],[112,1020],[162,1194],[112,1134]]},
  {anchor:[284,1163],opening:[[255,1162],[255,1100],[322,1195],[272,1217]]}
 ]
};
// Old cached atlas registrations did not include footFit. Use the same published
// registration for compatibility; new catalog entries must still register it.
export const shoeFitFor=(id,layer)=>layer.footFit||avatarShoeFits[id]||null;
export function shoePoint(layer,index,point){const s=layer.segments[index],[sx,sy,sw,sh]=s.source,[x,y,w,h]=s.target;return[x+(point[0]-sx)*w/sw,y+(point[1]-sy)*h/sh];}
export function shoeFrame(layer,index,fit=layer.footFit){
 if(!fit)return[1,0,0,1,0,0];
 const [x,y]=shoePoint(layer,index,fit[index].anchor),{center,turn}=avatarFootRig[index],a=turn*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return[c,s,-s,c,center[0]-c*x+s*y,center[1]-s*x-c*y];
}
export function fittedShoePoint(layer,index,point,fit=layer.footFit){const[x,y]=shoePoint(layer,index,point),[a,b,c,d,e,f]=shoeFrame(layer,index,fit);return[a*x+c*y+e,b*x+d*y+f];}
export function shoeOpening(layer,index,fit=layer.footFit){
 const [l,b,r,f]=fit[index].opening.map(p=>fittedShoePoint(layer,index,p,fit));return`M${l}Q${b} ${r}Q${f} ${l}Z`;
}
// Let the lower leg occlude the back wall all the way to the top of the
// collar. A closed oval leaves a painted loop running across the ankle.
export function shoeInsertion(layer, i, fit = layer.footFit) {
  const frame = fit[i];
  const [left, , right, tongue] = frame.opening.map(p => fittedShoePoint(layer, i, p, fit));
  const top = Math.min(left[1], right[1]) - 46;
  // The ankle leans toward the back of the side-facing right shoe.
  const lean = i === 1 ? -10 : 0;
  return `M${left} L${left[0] + lean - 4} ${top} H${right[0] + lean + 4} L${right} Q${tongue} ${left}Z`;
}
export const shoeOpenings = (layer, fit) => fit.map((_, i) => shoeInsertion(layer, i, fit)).join('');
export function shoeOpeningBounds(layer,index,fit=layer.footFit){
 const [l,b,r,f]=fit[index].opening.map(p=>fittedShoePoint(layer,index,p,fit)),points=[];
 for(const[a,c,z]of [[l,b,r],[r,f,l]])for(let i=0;i<=24;i++){const t=i/24;points.push([0,1].map(k=>(1-t)**2*a[k]+2*(1-t)*t*c[k]+t*t*z[k]));}
 return {points,minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};
}
export const shoeShadowAt=(bounds,y)=>{const t=Math.max(0,Math.min(1,(y-bounds.minY)/(bounds.maxY-bounds.minY)));return t<=.55?.04*t/.55:.04+.13*(t-.55)/.45;};

// Diagnostic SVG only. Production uses the same paths with bounded Canvas 2D.
export function shoeDepthSvg(layer,fit,uid,wearer,ankleBoundary){
 const mouth=shoeOpenings(layer,fit),paths=fit.map((_,i)=>shoeInsertion(layer,i,fit));
 const shadows=paths.map((path,i)=>{const b=shoeOpeningBounds(layer,i,fit);return`<clipPath id="${uid}-shoe-mouth-${i}"><path d="${path}"/></clipPath><linearGradient id="${uid}-shoe-shadow-${i}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${b.minY}" y2="${b.maxY}"><stop stop-color="rgb(34,23,29)" stop-opacity="0"/><stop offset=".55" stop-color="rgb(34,23,29)" stop-opacity=".04"/><stop offset="1" stop-color="rgb(34,23,29)" stop-opacity=".17"/></linearGradient>`;}).join('');
 // One nonzero outline keeps the ankle/foot union intact when a filtered wearer
 // is cloned through SVG <use>. Overlapping clip children lost the foot tint in
 // Chromium's rasterized reference; arms never intersect these heel openings.
 const defs=`<clipPath id="${uid}-shoe-skin"><path d="${ankleBoundary} M0 1355H1024V1536H0Z"/></clipPath><g id="${uid}-shoe-wearer">${wearer}</g><clipPath id="${uid}-shoe-mouth"><path d="${mouth}"/></clipPath><filter id="${uid}-shoe-black" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter><mask id="${uid}-shoe-depth" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><g clip-path="url(#${uid}-shoe-mouth)" filter="url(#${uid}-shoe-black)"><use href="#${uid}-shoe-wearer"/></g></mask><mask id="${uid}-shoe-alpha" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><use href="#${uid}-shoe-wearer"/></mask>${shadows}`;
 const underlay=`<g data-layer="shoe-wearer" clip-path="url(#${uid}-shoe-mouth)"><use href="#${uid}-shoe-wearer"/><g mask="url(#${uid}-shoe-alpha)">${paths.map((_,i)=>`<g clip-path="url(#${uid}-shoe-mouth-${i})"><rect x="160" y="1250" width="700" height="286" fill="url(#${uid}-shoe-shadow-${i})"/></g>`).join('')}</g></g>`;
 return{defs,underlay,attribute:`mask="url(#${uid}-shoe-depth)"`};
}

// Trace the upper edge of the facing leather. The pointed gold tongue and
// the red binding stay in front of the leg; the high back of the boot does not.
const bootFronts = {
 'shoes-red': 'M290 1250H357V1303Q351 1315 330 1321Q309 1319 292 1306Z M562 1250H630V1318Q617 1326 588 1317L564 1309Z',
 'shoes-star': 'M287 1250H375V1313Q355 1325 346 1338L338 1324L326 1336Q309 1317 288 1308Z M554 1250H639V1323Q630 1326 622 1341Q603 1328 591 1330Q579 1317 555 1309Z'
};
export function bootInsertion(id, openings) {
 if (bootFronts[id]) return bootFronts[id];
 return openings.map(([x,y,rx,ry,turn]) => {
  const a=turn*Math.PI/180, dx=rx*Math.cos(a), dy=rx*Math.sin(a);
  return `M${x-dx} ${y-dy}a${rx} ${ry} ${turn} 1 0 ${2*dx} ${2*dy}a${rx} ${ry} ${turn} 1 0 ${-2*dx} ${-2*dy}Z`;
 }).join('');
}

// In the two closely packed atlas cells the neighbour touches one side of the
// crop halfway down. Notch only those rows: the toe uses the full crop width.
export function shoeSegmentOutline(id, layer, index) {
 if(index !== 0) return null;
 const notch = id === 'shoes-forest' ? [170,173,219] : id === 'shoes-coast' ? [165,158,187] : null;
 if(!notch) return null;
 const [sx,sy] = layer.segments[index].source;
 const [x,y,w,h] = layer.segments[index].target;
 const [cut,top] = shoePoint(layer,index,[sx+notch[0],sy+notch[1]]);
 const [,end] = shoePoint(layer,index,[sx+notch[0],sy+notch[2]]);
 return `M${x} ${y}h${w}V${top}H${cut}V${end}H${x+w}V${y+h}H${x}Z`;
}
