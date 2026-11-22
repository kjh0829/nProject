// Heel cups are registered in each original atlas, not at a crop's upper edge.
// Shared by the bounded Canvas painter, the SVG reference, and catalog checks.
export const avatarFootRig=[{center:[328,1372],turn:-8},{center:[590,1382],turn:0}];
export const avatarShoeFits={
 'shoes-canvas':[
  {anchor:[132,190],opening:[[93,230],[134,80],[174,230],[135,195]]},
  {anchor:[320,212],opening:[[284,235],[282,143],[369,242],[330,260]]}
 ],
 'shoes-lilac':[
  {anchor:[137,807],opening:[[92,840],[132,689],[181,840],[135,740]]},
  {anchor:[320,815],opening:[[285,844],[281,738],[376,860],[330,852]]}
 ],
 'shoes-blossom':[
  {anchor:[112,132],opening:[[62,166],[109,22],[163,166],[110,126]]},
  {anchor:[278,159],opening:[[243,178],[244,96],[323,195],[281,207]]}
 ],
 'shoes-coast':[
  {anchor:[622,132],opening:[[573,171],[621,20],[671,169],[621,128]]},
  {anchor:[784,170],opening:[[747,187],[747,107],[833,208],[789,216]]}
 ],
 'shoes-starlit':[
  {anchor:[119,633],opening:[[65,670],[118,523],[171,670],[120,604]]},
  {anchor:[279,663],opening:[[246,689],[242,597],[326,708],[286,716]]}
 ],
 'shoes-forest':[
  {anchor:[621,642],opening:[[570,661],[623,530],[674,661],[621,624]]},
  {anchor:[788,664],opening:[[750,686],[747,588],[841,706],[795,721]]}
 ],
 'shoes-cafe':[
  {anchor:[112,1137],opening:[[60,1183],[112,1020],[164,1183],[112,1120]]},
  {anchor:[284,1163],opening:[[241,1171],[255,1100],[332,1201],[284,1220]]}
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
export const shoeOpenings=(layer,fit=layer.footFit)=>fit.map((_,i)=>shoeOpening(layer,i,fit)).join('');
export function shoeOpeningBounds(layer,index,fit=layer.footFit){
 const [l,b,r,f]=fit[index].opening.map(p=>fittedShoePoint(layer,index,p,fit)),points=[];
 for(const[a,c,z]of [[l,b,r],[r,f,l]])for(let i=0;i<=24;i++){const t=i/24;points.push([0,1].map(k=>(1-t)**2*a[k]+2*(1-t)*t*c[k]+t*t*z[k]));}
 return {points,minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};
}
export const shoeShadowAt=(bounds,y)=>{const t=Math.max(0,Math.min(1,(y-bounds.minY)/(bounds.maxY-bounds.minY)));return t<=.55?.2+(.04-.2)*t/.55:.04*(1-t)/.45;};

// Diagnostic SVG only. Production uses the same paths with bounded Canvas 2D.
export function shoeDepthSvg(layer,fit,uid,wearer,ankleBoundary){
 const mouth=shoeOpenings(layer,fit),paths=fit.map((_,i)=>shoeOpening(layer,i,fit));
 const shadows=paths.map((path,i)=>{const b=shoeOpeningBounds(layer,i,fit);return`<clipPath id="${uid}-shoe-mouth-${i}"><path d="${path}"/></clipPath><linearGradient id="${uid}-shoe-shadow-${i}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${b.minY}" y2="${b.maxY}"><stop stop-color="rgb(34,23,29)" stop-opacity=".2"/><stop offset=".55" stop-color="rgb(34,23,29)" stop-opacity=".04"/><stop offset="1" stop-color="rgb(34,23,29)" stop-opacity="0"/></linearGradient>`;}).join('');
 // One nonzero outline keeps the ankle/foot union intact when a filtered wearer
 // is cloned through SVG <use>. Overlapping clip children lost the foot tint in
 // Chromium's rasterized reference; arms never intersect these heel openings.
 const defs=`<clipPath id="${uid}-shoe-skin"><path d="${ankleBoundary} M0 1355H1024V1536H0Z"/></clipPath><g id="${uid}-shoe-wearer">${wearer}</g><clipPath id="${uid}-shoe-mouth"><path d="${mouth}"/></clipPath><filter id="${uid}-shoe-black" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter><mask id="${uid}-shoe-depth" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><g clip-path="url(#${uid}-shoe-mouth)" filter="url(#${uid}-shoe-black)"><use href="#${uid}-shoe-wearer"/></g></mask><mask id="${uid}-shoe-alpha" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><use href="#${uid}-shoe-wearer"/></mask>${shadows}`;
 const underlay=`<g data-layer="shoe-wearer" clip-path="url(#${uid}-shoe-mouth)"><use href="#${uid}-shoe-wearer"/><g mask="url(#${uid}-shoe-alpha)">${paths.map((_,i)=>`<g clip-path="url(#${uid}-shoe-mouth-${i})"><rect x="160" y="1250" width="700" height="286" fill="url(#${uid}-shoe-shadow-${i})"/></g>`).join('')}</g></g>`;
 return{defs,underlay,attribute:`mask="url(#${uid}-shoe-depth)"`};
}
