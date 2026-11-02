// Public connectivity probe only. Never handles questionnaires or sends messages.
// Paste into a NEW Supabase Edge Function named dental-connectivity.
Deno.serve((request) => {
  const origin = request.headers.get('Origin');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  };
  if (origin === 'https://wdddddd67.github.io') {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
  } else if (origin) {
    return new Response(JSON.stringify({ reachable: true, error: 'origin_not_allowed' }), { status: 403, headers });
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET', 'HEAD'].includes(request.method)) {
    headers['Allow'] = 'GET, HEAD, OPTIONS';
    return new Response(JSON.stringify({ reachable: true, error: 'read_only_probe' }), { status: 405, headers });
  }
  const result = {
    service: 'dental-guide-connectivity-probe',
    reachable: true,
    notificationsEnabled: false,
    checkedAt: new Date().toISOString(),
    message: '仅验证手机网络连通性，不接收问卷，不发送微信。'
  };
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(result), { status: 200, headers });
});
