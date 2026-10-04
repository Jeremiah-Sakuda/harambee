// Optional sandbox feasibility adapter. The main demo engine always uses its explicit simulator.
const base='https://api-m.sandbox.paypal.com';
export class PayPalSandbox {
 constructor({clientId=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET}={}) {if(!clientId||!secret)throw new Error('PayPal sandbox credentials are required.');this.clientId=clientId;this.secret=secret;}
 async request(path,{method='POST',body,key}={}) {
  if(!this.token||this.tokenUntil<Date.now()) {const r=await fetch(`${base}/v1/oauth2/token`,{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Basic ${Buffer.from(`${this.clientId}:${this.secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});if(!r.ok)throw new Error(`PayPal sandbox authentication failed (${r.status})`);const token=await r.json();this.token=token.access_token;this.tokenUntil=Date.now()+(token.expires_in-60)*1000;}
  const r=await fetch(`${base}${path}`,{method,signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json',...(key?{'PayPal-Request-Id':key}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=r.status===204?{}:await r.json();if(!r.ok)throw Object.assign(new Error(`PayPal sandbox request failed (${r.status})`),{status:r.status,details:data});return data;
 }
 createOrder(cents,key){if(!Number.isSafeInteger(cents)||cents<1)throw new Error('Whole positive cents required');return this.request('/v2/checkout/orders',{key,body:{intent:'AUTHORIZE',purchase_units:[{amount:{currency_code:'USD',value:(cents/100).toFixed(2)}}]}});}
 authorize(orderId,key){return this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`,{key,body:{}});}
 capture(authorizationId,key){return this.request(`/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`,{key,body:{final_capture:true}});}
 void(authorizationId,key){return this.request(`/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`,{key});}
 refund(captureId,key){return this.request(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,{key,body:{}});}
 getOrder(id){return this.request(`/v2/checkout/orders/${encodeURIComponent(id)}`,{method:'GET'});}
 getAuthorization(id){return this.request(`/v2/payments/authorizations/${encodeURIComponent(id)}`,{method:'GET'});}
 getCapture(id){return this.request(`/v2/payments/captures/${encodeURIComponent(id)}`,{method:'GET'});}
}
