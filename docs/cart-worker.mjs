import {solveCart} from './cart-core.mjs';
self.onmessage=event=>{try{self.postMessage({ok:true,result:solveCart(event.data)});}catch(error){self.postMessage({ok:false,message:error.message});}};
