export const avatarSlots=[{id:'hair',name:'머리'},{id:'hat',name:'모자'},{id:'top',name:'상의'},{id:'bottom',name:'하의'},{id:'shoes',name:'신발'},{id:'accessory',name:'소품'}];
export const skins=[{id:'peach',name:'복숭아빛',color:'#f4c8a2'},{id:'honey',name:'꿀빛',color:'#c99262'},{id:'cocoa',name:'코코아빛',color:'#8e5e49'},{id:'rose',name:'장밋빛',color:'#f4d6c4'}];
export const faces=[{id:'smile',name:'방긋'},{id:'sparkle',name:'반짝'},{id:'calm',name:'느긋'}];
export const avatarItems=[
{id:'hair-cocoa',slot:'hair',name:'코코아 숏컷',price:0,style:'short',color:'#664b45'},
{id:'hair-peach',slot:'hair',name:'복숭아 단발',price:70,style:'bob',color:'#d88e8b'},
{id:'hair-lilac',slot:'hair',name:'라일락 웨이브',price:100,style:'wave',color:'#a491c6'},
{id:'hair-silver',slot:'hair',name:'달빛 묶음머리',price:120,style:'ponytail',color:'#c6ccd8'},
{id:'hat-beret',slot:'hat',name:'크림 베레모',price:60,style:'beret',color:'#eee0b9'},
{id:'hat-sprout',slot:'hat',name:'새싹 보닛',price:90,style:'sprout',color:'#90af88'},
{id:'hat-wizard',slot:'hat',name:'별빛 마법 모자',price:150,style:'wizard',color:'#8370aa'},
{id:'top-stripe',slot:'top',name:'크림 줄무늬',price:0,style:'stripe',color:'#f2e8ca'},
{id:'top-mint',slot:'top',name:'민트 후디',price:60,style:'hoodie',color:'#9ac3b4'},
{id:'top-coral',slot:'top',name:'코랄 니트',price:80,style:'knit',color:'#df9a90'},
{id:'top-night',slot:'top',name:'밤하늘 코트',price:140,style:'coat',color:'#75628c'},
{id:'bottom-denim',slot:'bottom',name:'산책 데님',price:0,style:'pants',color:'#7c94ad'},
{id:'bottom-lilac',slot:'bottom',name:'라일락 반바지',price:50,style:'shorts',color:'#b3a1c8'},
{id:'bottom-check',slot:'bottom',name:'체크 스커트',price:80,style:'skirt',color:'#bb8b92'},
{id:'bottom-overall',slot:'bottom',name:'우유빛 멜빵',price:100,style:'overall',color:'#e5d8b9'},
{id:'shoes-canvas',slot:'shoes',name:'기본 캔버스',price:0,style:'canvas',color:'#ded9ce'},
{id:'shoes-red',slot:'shoes',name:'체리 부츠',price:50,style:'boots',color:'#b9646b'},
{id:'shoes-lilac',slot:'shoes',name:'구름 운동화',price:70,style:'sneakers',color:'#ae9ec7'},
{id:'shoes-star',slot:'shoes',name:'별가루 부츠',price:100,style:'star',color:'#d6b86f'},
{id:'acc-bag',slot:'accessory',name:'별 편지 가방',price:80,style:'bag',color:'#b98260'},
{id:'acc-glasses',slot:'accessory',name:'동그란 안경',price:60,style:'glasses',color:'#68516e'},
{id:'acc-bird',slot:'accessory',name:'두리 친구',price:160,style:'bird',color:'#e4bf72'}
];
export const itemById=id=>avatarItems.find(i=>i.id===id);
export const starterOutfit={hair:'hair-cocoa',hat:null,top:'top-stripe',bottom:'bottom-denim',shoes:'shoes-canvas',accessory:null};
