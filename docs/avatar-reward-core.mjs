import {validSnapshot} from './puzzle-core.mjs';
import {validLab} from './puzzle-lab.mjs';
export function avatarGameReceipt({kind,state:s,date}={}){
 if(s?.status!=='won')return null;
 if(kind==='lab')return validLab(s)&&s.moves===0&&s.bonusDone?{id:'lab:'+s.seed,kind,amount:50}:null;
 if(!validSnapshot(s))return null;
 if(kind==='score'&&s.mode==='score'&&s.moves===0)return {id:'score:'+s.seed,kind,amount:40+Math.min(40,Math.floor(s.score/1000)*5)};
 if(kind==='journey'&&s.mode==='journey')return {id:'journey:'+s.level,kind,amount:80};
 if(s.mode!==undefined)return null;
 if(kind==='stage'&&s.seed==='teum-stage-'+s.stage)return {id:'stage:'+s.stage,kind,amount:50};
 if(kind==='daily'&&/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date&&s.stage===3&&(s.seed.startsWith('teum-daily-'+date+'-')||s.seed==='teum-stage-3'))return {id:'daily:'+date,kind,amount:50};
 return null;
}
