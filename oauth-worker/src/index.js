const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const SCOPE = 'repo,user';
const STATE_COOKIE = 'decap_oauth_state';

function htmlResponse(body) {
  return new Response(body, { headers: { 'Content-Type': 'text/html' } });
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/callback`;

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', SCOPE);
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}

function renderCallbackPage({ status, provider, payload }) {
  const message = `authorization:${provider}:${status}:${JSON.stringify(payload)}`;
  return `<!DOCTYPE html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      ${JSON.stringify(message)},
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:${provider}', '*');
})();
</script>
</body></html>`;
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, STATE_COOKIE);

  if (!code || !state || state !== cookieState) {
    return htmlResponse(renderCallbackPage({
      status: 'error',
      provider: 'github',
      payload: { message: 'OAuth state mismatch or missing code' },
    }));
  }

  const redirectUri = `${url.origin}/callback`;
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
    return htmlResponse(renderCallbackPage({
      status: 'error',
      provider: 'github',
      payload: { message: tokenData.error_description || 'Token exchange failed' },
    }));
  }

  return htmlResponse(renderCallbackPage({
    status: 'success',
    provider: 'github',
    payload: { token: tokenData.access_token, provider: 'github' },
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth') return handleAuth(request, env);
    if (url.pathname === '/callback') return handleCallback(request, env);
    return new Response('Decap CMS OAuth proxy', { status: 200 });
  },
};
