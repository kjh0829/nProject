import {avatarMeshTriangle as triangle} from './avatar-mesh.mjs';
import {fitAvatarWaist,avatarWaistMeshAxes} from './avatar-waist.mjs';
// Wrist sections measured on the unchanged body atlas (rows 660–680).
export const avatarWristRig=[{center:[275,672],angle:23},{center:[744,674],angle:-27}];

// Registration is expressed in the common 1024 × 1536 body coordinates.
export function avatarNeckOpening(n){const[l,c,r]=n.opening;return `M435 200H565V230L${r[0]} ${r[1]}Q${c[0]} ${c[1]} ${l[0]} ${l[1]}L435 230Z`;}
export const avatarNeckSkin='M0 0H1024V225H540Q529 247 532 270L531 298H465L465 270Q466 245 466 225H0Z';

// Each triangle shares its vertices with its neighbours: no separated sleeve
// strips or elbow holes. Waist registration leaves the cuff axes unchanged.
export function fitAvatarCuff(point,frame){
 const [x,y]=point.map((v,i)=>v-frame.pivot[i]),a=frame.angle*Math.PI/180,t=(frame.angle+frame.turn)*Math.PI/180,u=(x*Math.cos(a)+y*Math.sin(a))*frame.width,v=-x*Math.sin(a)+y*Math.cos(a);
 return[frame.pivot[0]+frame.shift[0]+u*Math.cos(t)-v*Math.sin(t),frame.pivot[1]+frame.shift[1]+u*Math.sin(t)+v*Math.cos(t)];
}
export function fittedAvatarTop(layer,uid,texture){
 const[x,y,w,h]=layer.target,n=layer.neckline,sourceId=uid+'-top-source';let defs=`<g id="${sourceId}">${texture(layer.atlas,layer.source,layer.target)}</g>`,art='';
 const mesh=(xs,ys,move,name)=>{if(name==='sleeve'){const axes=avatarWaistMeshAxes(layer,[x,y,w,h]);xs=[...new Set([...xs,...axes.xs])].sort((a,b)=>a-b);ys=[...new Set([...ys,...axes.ys].filter(v=>v>=399.6&&v<=y+h))].sort((a,b)=>a-b);const original=move;move=(point,i,j)=>fitAvatarWaist(original(point,i,j),layer,'top');}for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
  const a=[xs[i],ys[j]],b=[xs[i+1],ys[j]],c=[xs[i+1],ys[j+1]],d=[xs[i],ys[j+1]],A=move(a,i,j),B=move(b,i+1,j),C=move(c,i+1,j+1),D=move(d,i,j+1);
  for(const[k,src,dst]of [[0,[a,b,c],[A,B,C]],[1,[a,c,d],[A,C,D]]]){const t=triangle(src,dst,`${uid}-${name}-${j}-${i}-${k}`,sourceId);defs+=t.defs;art+=t.art;}
 }};
 mesh([x,420,460,600,690,x+w],[y,310,400],([x,y],i,j)=>{const center=i===2||i===3;return[x+(center&&j<2?n.shift+(x-530)*(n.scale-1):0),y+(center&&j<2?n.lift+Math.tan(n.tilt*Math.PI/180)*(x-530)*n.scale:0)];},'collar');
 if(layer.cuffs){
  const ys=[399.6,580,690,...(y+h>800?[780]:[]),y+h],c=layer.cuffs;
  mesh([x,350,430,690,730,x+w],ys,([px,py],i,j)=>{const active=py>580&&!(py===y+h&&y+h>800),outer=px<=350||px>=730;const p=[px+(active&&px>=730?c.rightShift*(py-580)/(Math.min(y+h,780)-580):0),py+(active&&outer?(py-580)*(c.scale-1):0)];if(active&&outer){const q=fitAvatarCuff(p,c.frames[px<=350?0:1]),weight=Math.min(1,Math.max(0,(p[1]-580)/70));return p.map((v,k)=>v+(q[k]-v)*weight);}return p;},'sleeve');
 }else mesh([x,400,710,x+w],[399.6,y+h],point=>point,'sleeve');
 return {defs,art};
}
