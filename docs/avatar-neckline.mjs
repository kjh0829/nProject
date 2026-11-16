// Registration is expressed in the common 1024 × 1536 body coordinates.
export function avatarNeckOpening(n){const[l,c,r]=n.opening;return `M435 200H565V230L${r[0]} ${r[1]}Q${c[0]} ${c[1]} ${l[0]} ${l[1]}L435 230Z`;}
export const avatarNeckSkin='M0 0H1024V225H540Q529 247 532 270L531 298H465L465 270Q466 245 466 225H0Z';

// Each triangle shares its vertices with its neighbours: no separated sleeve
// strips, holes at the elbow, or changes to the registered waist columns.
function triangle(src,dst,id,sourceId){
 const[p,q,r]=src,[P,Q,R]=dst,den=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
 const axis=k=>{const a=((Q[k]-P[k])*(r[1]-p[1])-(R[k]-P[k])*(q[1]-p[1]))/den,c=((q[0]-p[0])*(R[k]-P[k])-(r[0]-p[0])*(Q[k]-P[k]))/den;return[a,c,P[k]-a*p[0]-c*p[1]];};
 const[a,c,e]=axis(0),[b,d,f]=axis(1),center=[dst.reduce((v,p)=>v+p[0],0)/3,dst.reduce((v,p)=>v+p[1],0)/3];
 const points=dst.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],len=Math.hypot(dx,dy);return[p[0]+dx/len*.4,p[1]+dy/len*.4].join(',');}).join(' ');
 return {defs:`<clipPath id="${id}"><polygon points="${points}"/></clipPath>`,art:`<g clip-path="url(#${id})"><use href="#${sourceId}" transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})"/></g>`};
}
export function fittedAvatarTop(layer,uid,texture){
 const[x,y,w,h]=layer.target,n=layer.neckline,sourceId=uid+'-top-source';let defs=`<g id="${sourceId}">${texture(layer.atlas,layer.source,layer.target)}</g>`,art='';
 const mesh=(xs,ys,move,name)=>{for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
  const a=[xs[i],ys[j]],b=[xs[i+1],ys[j]],c=[xs[i+1],ys[j+1]],d=[xs[i],ys[j+1]],A=move(a,i,j),B=move(b,i+1,j),C=move(c,i+1,j+1),D=move(d,i,j+1);
  for(const[k,src,dst]of [[0,[a,b,c],[A,B,C]],[1,[a,c,d],[A,C,D]]]){const t=triangle(src,dst,`${uid}-${name}-${j}-${i}-${k}`,sourceId);defs+=t.defs;art+=t.art;}
 }};
 mesh([x,420,460,600,690,x+w],[y,310,400],([x,y],i,j)=>{const center=i===2||i===3;return[x+(center&&j<2?n.shift+(x-530)*(n.scale-1):0),y+(center&&j<2?n.lift:0)];},'collar');
 if(layer.cuffs){
  const ys=[399.6,580,...(y+h>800?[780]:[]),y+h],c=layer.cuffs;
  mesh([x,350,430,690,730,x+w],ys,([px,py],i,j)=>{const active=py>580&&!(j===ys.length-1&&y+h>800),outer=i<2||i>3;return[px+(active&&i>3?c.rightShift*(py-580)/(Math.min(y+h,780)-580):0),py+(active&&outer?(py-580)*(c.scale-1):0)];},'sleeve');
 }else{const id=uid+'-top-bottom';defs+=`<clipPath id="${id}"><rect x="${x}" y="399.6" width="${w}" height="${y+h-399.6}"/></clipPath>`;art+=`<use href="#${sourceId}" clip-path="url(#${id})"/>`;}
 return {defs,art};
}
