# Decap CMS GitHub OAuth proxy

Minimal Cloudflare Worker implementing the two endpoints Decap CMS needs to
authenticate against GitHub: `/auth` (kicks off the GitHub OAuth flow) and
`/callback` (exchanges the code for a token and hands it back to the Decap
popup via the `postMessage` handshake Decap expects).

## Deploy

From this directory:

```sh
npx wrangler login          # one-time, opens a browser to authorize wrangler against your Cloudflare account
npx wrangler deploy         # publishes the Worker, prints its *.workers.dev URL
```

Note the printed URL — you'll need `<that-url>/callback` for the GitHub
OAuth App's redirect URI, and `<that-url>` for `admin/config.yml`'s
`base_url`.

## Configure secrets

The Worker needs the OAuth App's client ID and secret. Set them *after*
registering the OAuth App (see below), since the callback URL you register
depends on this Worker's URL, and the secrets depend on the OAuth App:

```sh
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## Order of operations (breaks the chicken-and-egg loop)

1. `npx wrangler deploy` here first, with a placeholder/no OAuth App yet —
   this gives you the real `*.workers.dev` URL.
2. Register the GitHub OAuth App using that URL + `/callback` as the
   redirect URI.
3. Run `wrangler secret put` (above) with the OAuth App's client ID/secret.
4. Update `admin/config.yml`'s `base_url` to this Worker's URL and push.
