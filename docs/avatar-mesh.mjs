// Shared, seam-overlapped triangles for the fixed illustration rig.
export function avatarMeshTriangle(src,dst,id,sourceId){
 const[p,q,r]=src,[P,Q,R]=dst,den=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
 const axis=k=>{const a=((Q[k]-P[k])*(r[1]-p[1])-(R[k]-P[k])*(q[1]-p[1]))/den,c=((q[0]-p[0])*(R[k]-P[k])-(r[0]-p[0])*(Q[k]-P[k]))/den;return[a,c,P[k]-a*p[0]-c*p[1]];};
 const[a,c,e]=axis(0),[b,d,f]=axis(1);
 // Offset every edge by a fixed distance. Moving corners radially leaves gaps
 // along acute triangles, which appear as pale lines on dark fabrics.
 const lengths=dst.map((_,i)=>Math.hypot(dst[(i+1)%3][0]-dst[(i+2)%3][0],dst[(i+1)%3][1]-dst[(i+2)%3][1])),perimeter=lengths.reduce((a,b)=>a+b,0);
 const center=[0,1].map(k=>dst.reduce((sum,p,i)=>sum+p[k]*lengths[i],0)/perimeter),area=Math.abs((Q[0]-P[0])*(R[1]-P[1])-(R[0]-P[0])*(Q[1]-P[1]))/2,radius=2*area/perimeter;
 const points=dst.map(p=>p.map((v,k)=>center[k]+(v-center[k])*(1+3/radius)).join(',')).join(' ');
 return {defs:`<clipPath id="${id}"><polygon points="${points}"/></clipPath>`,art:`<g clip-path="url(#${id})"><use href="#${sourceId}" transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})"/></g>`};
}
