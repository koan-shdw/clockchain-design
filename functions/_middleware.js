// Shared-password gate for every page and file on the Cloudflare Pages site.
// The password is the Pages variable SITE_PASSWORD, set in Cloudflare and never in this repo.
// No variable set = nobody gets in. Any username works; only the password is checked.
export async function onRequest({ request, env, next }) {
  const want = env.SITE_PASSWORD;
  const auth = request.headers.get('Authorization') || '';
  if (want && auth.startsWith('Basic ')) {
    let raw = null;
    try { raw = Uint8Array.from(atob(auth.slice(6)), c => c.charCodeAt(0)); } catch {}
    if (raw) {
      const got = raw.slice(raw.indexOf(58) + 1); // bytes after "username:"
      const exp = new TextEncoder().encode(want);
      if (got.byteLength === exp.byteLength && crypto.subtle.timingSafeEqual(got, exp)) return next();
    }
  }
  return new Response('Password required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Clockchain review", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}
