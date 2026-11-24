/* Preview site: review material stays in the repo but is not served.
   Blocks the mockups folder and every Markdown file (briefs, plans, spec notes, handoff notes). */
export async function onRequest({ request, next }) {
  let p = new URL(request.url).pathname;
  try { p = decodeURIComponent(p); } catch (e) { }
  p = p.toLowerCase().replace(/\/+/g, '/');
  if (p === '/mockups' || p.startsWith('/mockups/') || p.endsWith('.md')) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }
  return next();
}
