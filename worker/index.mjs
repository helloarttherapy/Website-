const THANK_YOU = 'Thank you for message, I will be in touch shortly.';
const FAILURE = 'Unable to submit form. Please try again later.';
const INVALID = 'Invalid form data.';
const RECIPIENT = 'anna@helloarttherapy.com';
const SENDER = 'website@annaworthingtonarttherapy.com';
const MAX_BODY_BYTES = 24000;

async function readBody(request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, raw = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return raw + decoder.decode();
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      raw += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

function reply(request, status, ok, message) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('Accept')?.includes('application/json')) {
    return Response.json({ ok, message }, { status, headers });
  }
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact — Hello Art Therapy</title><main><h1>${message}</h1><a href="/contact">Contact</a></main></html>`, {
    status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" }
  });
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') return reply(request, 405, false, FAILURE);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return reply(request, 403, false, FAILURE);
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) return reply(request, 413, false, INVALID);
  let raw;
  try { raw = await readBody(request); } catch { return reply(request, 400, false, INVALID); }
  if (raw === null) return reply(request, 413, false, INVALID);
  let data;
  try { data = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('Content-Type') || '' }, body: raw }).formData(); }
  catch { return reply(request, 400, false, INVALID); }
  const value = key => typeof data.get(key) === 'string' ? data.get(key).trim() : '';
  if (value('website')) return reply(request, 400, false, INVALID);
  const firstName = value('firstName'), lastName = value('lastName'), email = value('email'), subject = value('subject'), message = value('message');
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || subject.length > 200 || !message || message.length > 5000 || /[\r\n\u0000]/.test(firstName + lastName + email + subject)) {
    return reply(request, 400, false, INVALID);
  }
  if (env.CONTACT_RATE_LIMITER) {
    const result = await env.CONTACT_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!result.success) return reply(request, 429, false, FAILURE);
  }
  if (!env.EMAIL) return reply(request, 503, false, FAILURE);
  try {
    await env.EMAIL.send({
      from: { email: SENDER, name: 'Hello Art Therapy' }, to: RECIPIENT, replyTo: email,
      subject: `Website enquiry: ${subject}`,
      text: `Name: ${firstName} ${lastName}\nEmail Address: ${email}\nSubject: ${subject}\n\n${message}`
    });
  } catch {
    // Do not log contact data or provider errors containing submitted text.
    return reply(request, 503, false, FAILURE);
  }
  return reply(request, 200, true, THANK_YOU);
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/contact') return handleContact(request, env);
    return env.ASSETS.fetch(request);
  }
};
