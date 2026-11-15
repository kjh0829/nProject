// Style B v1: shared adult stylized proportions. All art uses this coordinate space.
export const avatarRig={version:'cel-b-v1',viewBox:'0 0 300 540',anchors:{head:[150,92],upper:[150,230],leftShoulder:[111,148],leftElbow:[99,210],rightShoulder:[190,148],rightElbow:[202,211],hairTail:[183,64]},poses:['idle','wave','victory']};
export const avatarLayerOrder=['rear-cloth','legs','lower-garment','shoes','hair-back','left-arm','right-arm','torso','top','overalls','neck','head','accessory'];
export function avatarFraming(slot,itemStyle){return ({hair:'88 14 130 144',hat:'85 0 140 150',top:'65 124 173 174',bottom:'104 218 93 182',shoes:'107 421 96 100',accessory:itemStyle==='glasses'?'101 58 103 66':itemStyle==='bird'?'46 98 110 110':'98 153 143 175',portrait:'60 0 210 290'})[slot]||avatarRig.viewBox;}
// A long coat owns the outer torso; an overall bib must not float on top of it.
export const avatarCoverage=topStyle=>({showOverallBib:topStyle!=='coat',longCoat:topStyle==='coat'});

export const avatarHeadLayerOrder=['face','hair-front','hat','glasses'];
