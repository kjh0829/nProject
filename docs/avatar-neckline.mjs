// Fit the upper garment to the shared neck, preserving original texture pixels.
// Only the collar region is deformed; sleeves/waist below y=380 keep registration.
export function avatarNeckOpening(n){const [l,c,r]=n.opening;return `M450 200H550V218L${r[0]} ${r[1]}Q${c[0]} ${c[1]} ${l[0]} ${l[1]}L450 218Z`;}
export const avatarNeckSkin='M0 0H1024V225H540Q529 247 539 270L532 283H465L460 270Q465 245 466 225H0Z';
export function fittedAvatarTop(layer,uid,texture){
 const [x,y,w,h]=layer.target,n=layer.neckline,sourceId=uid+'-top-source';
 const xs=[x,430,480,580,650,x+w],ys=[y,290,380],amount=[0,0,n.shift,n.shift,0,0];let defs=`<g id="${sourceId}">${texture(layer.atlas,layer.source,layer.target)}</g>`,art='';
 const tx=(i,j)=>xs[i]+amount[i]*(j===2?0:1);
 for(let j=0;j<2;j++)for(let i=0;i<xs.length-1;i++){
  const a=[xs[i],ys[j]],b=[xs[i+1],ys[j]],c=[xs[i+1],ys[j+1]],d=[xs[i],ys[j+1]],A=[tx(i,j),ys[j]],B=[tx(i+1,j),ys[j]],C=[tx(i+1,j+1),ys[j+1]],D=[tx(i,j+1),ys[j+1]];
  for(const [k,src,dst]of [[0,[a,b,c],[A,B,C]],[1,[a,c,d],[A,C,D]]]){
   const [p,q,r]=src,[P,Q,R]=dst,den=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
   const m=((Q[0]-P[0])*(r[1]-p[1])-(R[0]-P[0])*(q[1]-p[1]))/den,s=((q[0]-p[0])*(R[0]-P[0])-(r[0]-p[0])*(Q[0]-P[0]))/den,t=P[0]-m*p[0]-s*p[1],id=`${uid}-collar-${j}-${i}-${k}`;
   const center=[dst.reduce((v,p)=>v+p[0],0)/3,dst.reduce((v,p)=>v+p[1],0)/3],expanded=dst.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],len=Math.hypot(dx,dy);return[p[0]+dx/len*.45,p[1]+dy/len*.45];});
   defs+=`<clipPath id="${id}"><polygon points="${expanded.map(p=>p.join(',')).join(' ')}"/></clipPath>`;
   art+=`<g clip-path="url(#${id})"><use href="#${sourceId}" transform="matrix(${m} 0 ${s} 1 ${t} 0)"/></g>`;
  }
 }
 const bottomId=uid+'-top-bottom';defs+=`<clipPath id="${bottomId}"><rect x="${x}" y="379.6" width="${w}" height="${y+h-379.6}"/></clipPath>`;art+=`<use href="#${sourceId}" clip-path="url(#${bottomId})"/>`;
 return {defs,art};
}
