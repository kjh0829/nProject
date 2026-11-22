// Shared, seam-overlapped triangles for the fixed illustration rig.
export function avatarMeshGeometry(src,dst){
 const[p,q,r]=src,[P,Q,R]=dst,den=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
 const axis=k=>{const a=((Q[k]-P[k])*(r[1]-p[1])-(R[k]-P[k])*(q[1]-p[1]))/den,c=((q[0]-p[0])*(R[k]-P[k])-(r[0]-p[0])*(Q[k]-P[k]))/den;return[a,c,P[k]-a*p[0]-c*p[1]];};
 const[a,c,e]=axis(0),[b,d,f]=axis(1);
 // Expand each edge by 0.8 body pixels. Bevel the corners: a miter on
 // a nearly folded sleeve triangle can paint a thread far beyond the cuff.
 const winding = Math.sign((Q[0]-P[0])*(R[1]-P[1]) - (Q[1]-P[1])*(R[0]-P[0]));
 const points = [];
 for (let i = 0; i < dst.length; i++) {
  const from = dst[i], to = dst[(i+1) % dst.length];
  const dx = to[0]-from[0], dy = to[1]-from[1];
  const length = Math.hypot(dx, dy);
  if (!length || !winding) continue;
  const offset = 0.8 * winding / length;
  points.push([from[0]+dy*offset, from[1]-dx*offset], [to[0]+dy*offset, to[1]-dx*offset]);
 }
 return{points,matrix:[a,b,c,d,e,f]};
}
export function avatarMeshTriangle(src,dst,id,sourceId){
 const {points,matrix}=avatarMeshGeometry(src,dst);
 return {defs:`<clipPath id="${id}"><polygon points="${points.map(p=>p.join(',')).join(' ')}"/></clipPath>`,art:`<g clip-path="url(#${id})"><use href="#${sourceId}" transform="matrix(${matrix.join(' ')})"/></g>`};
}
