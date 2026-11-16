// High-resolution static paper-doll fitting contract. Poses intentionally paused.
export const avatarRig={version:'raster-b-v1',viewBox:'160 -100 700 1640',poses:['idle']};
export const avatarLayerOrder=['base','face','bottom','shoes','top','hair','hat','accessory'];
export const avatarHeadLayerOrder=['face','hair','hat','accessory'];
export function avatarFraming(slot,itemStyle){return ({hair:'350 -5 340 410',hat:'330 -110 390 440',top:'220 220 610 560',bottom:'260 585 480 830',shoes:'240 1250 510 300',accessory:itemStyle==='glasses'?'421 80 210 170':itemStyle==='bird'?'260 160 210 210':'270 240 460 630',portrait:'330 -100 390 650'})[slot]||avatarRig.viewBox;}
export const avatarCoverage=topStyle=>({showOverallBib:topStyle!=='coat',longCoat:topStyle==='coat'});
