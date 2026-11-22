import {avatarMeshTriangle} from './avatar-mesh.mjs?detail=3';

// Registered on the posed body, not the horizontal bounds of an atlas crop.
// Left side, front centre, right side. Knees/feet, neck and hands stay fixed.
export const avatarWaistRig={version:'waist-v1',points:[[425,620],[568,648],[668,632]],top:{start:480,end:850,bounds:[400,710]},bottom:{start:500,end:900},overall:{start:440,end:950}};
const smooth=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
const region=(layer,slot)=>avatarWaistRig[slot==='top'?'top':(layer.waist?.rise??0)<0?'overall':'bottom'];
const lerp=(a,b,t)=>a+(b-a)*t;
function segment(points,x){let i=0;while(i<points.length-2&&x>points[i+1][0])i++;return {i,t:Math.max(0,Math.min(1,(x-points[i][0])/(points[i+1][0]-points[i][0])))};}
export function fitAvatarWaist(point,layer,slot){
 if(!layer.waist)return point;
 const {points,rise}=layer.waist,r=region(layer,slot),[left,right]=r.bounds||[layer.target[0],layer.target[0]+layer.target[2]],[x,y]=point;
 if(x<=left||x>=right||y<=r.start||y>=r.end)return point;
 const source=[[left,points[0][1]],...points,[right,points[2][1]]],target=[[left,points[0][1]],...avatarWaistRig.points.map(([x,y])=>[x,y+rise]),[right,points[2][1]]];
 const {i,t}=segment(source,x),baseline=lerp(source[i][1],source[i+1][1],t),dx=lerp(target[i][0]-source[i][0],target[i+1][0]-source[i+1][0],t),dy=lerp(target[i][1]-source[i][1],target[i+1][1]-source[i+1][1],t);
 const weight=smooth(y<=baseline?(y-r.start)/(baseline-r.start):(r.end-y)/(r.end-baseline));
 return[x+dx*weight,y+dy*weight];
}
export function avatarWaistMeshAxes(layer,bounds,slot='top'){
 if(!layer.waist)return{xs:[],ys:[]};
 const r=region(layer,slot),[x,y,w,h]=bounds,edges=r.bounds||[x,x+w];
 return{xs:[edges[0],...layer.waist.points.map(p=>p[0]),edges[1]].filter(v=>v>=x&&v<=x+w),ys:[r.start,...layer.waist.points.map(p=>p[1]),720,780,r.end].filter(v=>v>=y&&v<=y+h)};
}
export function fittedAvatarBottom(layer,uid,source){
 if(!layer.waist)return{defs:'',art:source};
 const sourceId=uid+'-waist-source',r=region(layer,'bottom'),[x,y,w,h]=layer.target;
 let defs=`<g id="${sourceId}">${source}</g>`,art='';
 for(const {src,dst,j,i,k}of avatarBottomTriangles(layer)){const t=avatarMeshTriangle(src,dst,`${uid}-waist-${j}-${i}-${k}`,sourceId);defs+=t.defs;art+=t.art;}
 const clip=uid+'-waist-fixed';defs+=`<clipPath id="${clip}"><rect width="1024" height="${r.start+.2}"/><rect y="${r.end-.2}" width="1024" height="1536"/></clipPath>`;
 art+=`<use href="#${sourceId}" clip-path="url(#${clip})"/>`;
 return{defs,art,sourceId};
}
export function avatarBottomTriangles(layer){
 if(!layer.waist)return[];
 const r=region(layer,'bottom'),[x,y,w,h]=layer.target,result=[];
 const axes=avatarWaistMeshAxes(layer,[x,Math.min(y,r.start),w,y+h-Math.min(y,r.start)],'bottom');
 const xs=[...new Set([x,...axes.xs,x+w])].sort((a,b)=>a-b),ys=[...new Set([r.start,...axes.ys,r.end])].sort((a,b)=>a-b);
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
  const a=[xs[i],ys[j]],b=[xs[i+1],ys[j]],c=[xs[i+1],ys[j+1]],d=[xs[i],ys[j+1]];
  for(const[k,src]of [[0,[a,b,c]],[1,[a,c,d]]])result.push({src,dst:src.map(p=>fitAvatarWaist(p,layer,'bottom')),j,i,k});
 }
 return result;
}
