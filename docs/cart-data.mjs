import {exampleMeals} from './meal-data.mjs';
export const cartIngredients=[
 ['rice','쌀 (조리 전)','g',2000,15000],['tofu','두부','g',300,1800],['egg','달걀','개',10,3500],['onion','대파','g',200,2000],['oil','식용유','ml',900,7000],['soy','간장','ml',900,5000],['sugar','설탕','g',1000,2000],['tomato','토마토','g',500,3000],['salt','소금','g',500,2000],['tuna','참치캔','g',100,2000],['cabbage','양배추','g',1000,3000],['mayo','마요네즈','g',300,4500],['seaweed','조미김','봉',10,3000],['kimchi','김치','g',1000,10000],['gochujang','고추장','g',500,4000],['sesame','참깨','g',200,4000]
].map(([id,name,unit,size,price])=>({id,name,unit,size,price,whole:['개','봉'].includes(unit)}));
const byName=new Map(cartIngredients.map(i=>[i.name,i.id]));
const extra=(id,title,minutes,ingredients,steps)=>({id,title,minutes,ingredients,steps});
export const cartRecipes=[...exampleMeals.map(m=>({id:m.id,title:m.title,minutes:m.minutes,ingredients:Object.fromEntries(m.ingredients.map(i=>[byName.get(i.name),i.used])),steps:m.steps})),
 extra('cart-egg','대파 달걀볶음밥',10,{rice:90,egg:2,onion:10,oil:8,salt:1},['쌀 사용량에 맞게 밥을 미리 준비해요.','대파를 썰어 기름에 볶고 달걀을 넣어 충분히 익혀요.','밥을 넣어 골고루 볶고 소금으로 간해요.']),
 extra('cart-cabbage-egg','양배추 달걀덮밥',12,{rice:90,cabbage:150,egg:2,oil:8,soy:8},['미리 지은 밥과 얇게 썬 양배추를 준비해요.','양배추를 기름에 볶다가 간장을 넣어요.','달걀을 넣어 충분히 익힌 뒤 밥 위에 올려요.']),
 extra('cart-cabbage-tofu','두부양배추 한 그릇',15,{rice:90,cabbage:150,tofu:150,oil:8,soy:10,onion:10},['미리 지은 밥을 준비하고 두부·양배추·대파를 썰어요.','기름을 두르고 두부와 채소를 충분히 익혀요.','간장으로 간하고 밥과 함께 담아요.']),
 extra('cart-tuna-tomato','토마토참치 볶음밥',12,{rice:90,tuna:50,tomato:150,onion:10,oil:5,soy:5},['미리 지은 밥을 준비하고 채소를 썰어요.','기름에 대파와 토마토를 볶고 참치를 넣어요.','밥을 넣어 골고루 볶고 간장으로 간해요.']),
 extra('cart-kimchi-tofu','두부김치 덮밥',15,{rice:90,kimchi:100,tofu:150,onion:10,oil:8,soy:5},['미리 지은 밥을 준비하고 두부·김치·대파를 썰어요.','기름에 두부를 굽고 김치와 대파를 넣어 충분히 볶아요.','간장은 제품의 간을 보며 조절하고 밥 위에 올려요.']),
 extra('cart-tomato-tofu','토마토두부 한 그릇',12,{rice:90,tomato:150,tofu:150,oil:8,salt:1},['미리 지은 밥과 썬 토마토·두부를 준비해요.','기름에 두부를 굽고 토마토를 넣어 충분히 익혀요.','소금으로 간하고 밥과 함께 담아요.'])
];
