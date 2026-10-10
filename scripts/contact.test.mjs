import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleContact } from '../worker/index.mjs';
const url='https://hello-art-therapy.hello-art-therapy.workers.dev/api/contact';
const valid={firstName:'Test',lastName:'Visitor',email:'test@example.com',subject:'Test enquiry',message:'Automated test fixture, never sent.'};
function request(fields=valid,origin=new URL(url).origin){return new Request(url,{method:'POST',headers:{Origin:origin,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});}
function environment(send=async()=>({messageId:'test-id'})){return {EMAIL:{send},CONTACT_RATE_LIMITER:{limit:async()=>({success:true})}};}

test('successful contact delivery uses the fixed recipient and visitor reply address',async()=>{
  let sent;
  const response=await handleContact(request(),environment(async email=>{sent=email;return {messageId:'test-id'};}));
  assert.equal(response.status,200);assert.equal((await response.json()).message,'Thank you, Anna will contact you shortly.');
  assert.equal(sent.to,'anna@helloarttherapy.com');assert.equal(sent.from.email,'website@helloarttherapy.com');assert.equal(sent.replyTo,valid.email);
  assert.ok(sent.text.includes(valid.message));assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('delivery failure or missing email configuration never returns a thank-you',async()=>{
  for(const env of [{},environment(async()=>{throw new Error('provider failure');})]){
    const response=await handleContact(request(),env);assert.equal(response.status,503);assert.equal((await response.json()).ok,false);
  }
});
test('cross-origin, invalid fields, honeypot and oversized submissions do not send mail',async()=>{
  let sends=0;const env=environment(async()=>{sends++;});
  const cases=[request(valid,'https://other.example'),request({...valid,email:'invalid'}),request({...valid,lastName:''}),request({...valid,subject:'Subject\r\nBcc: victim@example.com'}),request({...valid,website:'spam.example'}),request({...valid,message:'x'.repeat(25000)})];
  for(const req of cases){const response=await handleContact(req,env);assert.ok(response.status>=400);}
  assert.equal(sends,0);
});
test('rate limits stop repeat submissions without email delivery',async()=>{
  let sent=false;const env=environment(async()=>{sent=true;});env.CONTACT_RATE_LIMITER.limit=async()=>({success:false});
  assert.equal((await handleContact(request(),env)).status,429);assert.equal(sent,false);
});
test('chunked requests are cancelled as soon as the body exceeds the byte limit',async()=>{
  let cancelled=false,sent=false;
  const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(12001));},cancel(){cancelled=true;}});
  const req=new Request(url,{method:'POST',duplex:'half',headers:{Origin:new URL(url).origin,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body});
  assert.equal((await handleContact(req,environment(async()=>{sent=true;}))).status,413);
  assert.equal(cancelled,true);assert.equal(sent,false);
});
test('normal pages pass through to static assets and non-JavaScript forms receive HTML',async()=>{
  const response=await worker.fetch(new Request('https://example.com/blog'),{ASSETS:{fetch:async()=>new Response('asset')}});assert.equal(await response.text(),'asset');
  const req=request();req.headers.delete('Accept');const html=await handleContact(req,environment());assert.equal(html.status,200);assert.ok((await html.text()).includes('Thank you, Anna will contact you shortly.'));
});
