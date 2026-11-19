export default {
 id:'prism-workshop',name:'프리즘 공방',icon:'◇',color:'#cbdde9',
 intro:'공방에서 번개와 폭탄, 무지개를 만드는 새 편지가 기다립니다.',
 ending:'프리즘 공방의 불빛이 켜졌어요. 특별한 한 수를 만드는 배달부가 되었어요.',
 levels:[
  {id:16,name:'번개 작업대',subtitle:'4개를 나란히 맞춰 번개를 만들어보세요.',color:0,target:12,moves:16,ice:[],mission:{kind:'lightning',target:1,label:'번개 만들기'}},
  {id:17,name:'폭탄 설계도',subtitle:'T자와 L자 매치로 주변 폭탄을 만들어보세요.',color:1,target:14,moves:20,ice:[],mission:{kind:'bomb',target:1,label:'폭탄 만들기'}},
  {id:18,name:'무지개 실험실',subtitle:'같은 색 5개를 한 줄로 이으면 무지개가 생겨요.',color:2,target:16,moves:24,ice:[],mission:{kind:'rainbow',target:1,label:'무지개 만들기'}},
  {id:19,name:'얼음 세공실',subtitle:'특수 조각을 터뜨리면서 얼음도 깨보세요.',color:3,target:22,moves:20,ice:[7,8,9,10,25,26,27,28],mission:{kind:'activate',target:3,label:'특수 조각 발동'}},
  {id:20,name:'공방의 합주',subtitle:'특수 조각 두 개를 서로 바꿔 조합을 완성하세요.',color:0,target:24,moves:28,ice:[8,9,14,15,20,21,26,27],mission:{kind:'combine',target:1,label:'특수 조각 조합'}}
 ]
};
