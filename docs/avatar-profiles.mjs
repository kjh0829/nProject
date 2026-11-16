// The fixed body/pose is the fitting contract, shared by rendering and validation.
// A new silhouette needs an explicit profile and manual review; unknown profiles fail CI.
export const avatarProfiles={
 hair:{slot:'hair',kind:'plain',probes:[[520,55]],faceClear:true},
 hat:{slot:'hat',kind:'plain',probes:[[520,55]]},
 'short-sleeve':{slot:'top',kind:'plain',bareArms:true,probes:[[550,400]]},
 'long-sleeve':{slot:'top',kind:'plain',probes:[[550,400]]},
 coat:{framing:'coat',slot:'top',kind:'plain',lining:true,outer:true,probes:[[520,400]]},
 pants:{framing:'pants',slot:'bottom',kind:'waist',longLegs:true,waistJoin:800,waistLift:42,probes:[[550,700]]},
 shorts:{framing:'shorts',slot:'bottom',kind:'waist',legStart:800,waistJoin:760,waistLift:42,probes:[[550,700]]},
 skirt:{framing:'skirt',slot:'bottom',kind:'waist',legStart:875,waistJoin:760,waistLift:42,probes:[[550,700]]},
 overall:{framing:'overall',slot:'bottom',kind:'plain',longLegs:true,overTop:true,probes:[[550,700]]},
 'low-shoe':{slot:'shoes',kind:'segments',segmentCount:2,probes:[[330,1440],[630,1440]]},
 boot:{slot:'shoes',kind:'segments',segmentCount:2,boot:true,probes:[[330,1440],[630,1440]]},
 glasses:{framing:'glasses',slot:'accessory',kind:'segments',segmentCount:3,behindHair:true,faceClip:true,eyeFit:true,probes:[]},
 bag:{framing:'bag',slot:'accessory',kind:'plain',mirror:true,behindHair:true,shoulderClip:true,probes:[[400,750]]},
 bird:{framing:'bird',slot:'accessory',kind:'plain',perch:true,probes:[[410,270]]}
};
