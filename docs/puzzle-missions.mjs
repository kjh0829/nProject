export const missionKinds=['lightning','bomb','rainbow','activate','combine'];
export function missionGain(mission,frame) {
 if(mission.kind==='activate')return frame.fired;
 if(mission.kind==='combine')return frame.combination?1:0;
 const matches=mission.kind==='lightning'?['row','col']:[mission.kind];
 return frame.births.filter(birth=>matches.includes(birth.special)).length;
}
export const missionComplete=(state,config)=>!config.mission||state.missionCount>=config.mission.target;
