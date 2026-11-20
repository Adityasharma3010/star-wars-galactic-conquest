# Custom domain setup

Domain: **monopoly.adityasharma.site**. Added to the existing Vercel project, star-wars-galactic-conquest, on 20 November 2026. Vercel verified ownership in the current team. GoDaddy remains the DNS provider.

## GoDaddy record

In the DNS settings for **adityasharma.site**, add:

| Type  | Name     | Value                               | TTL     |
| ----- | -------- | ----------------------------------- | ------- |
| CNAME | monopoly | b85d16e2b1d658a6.vercel-dns-017.com | Default |

If a record already exists at the exact host monopoly, replace that host's record with this CNAME. The apex/root domain does not need to change. Vercel reported no TXT ownership challenge.

The CNAME was resolved and the custom hostname returned HTTP 200 over HTTPS on 20 November 2026. The existing game remains accessible at https://star-wars-galactic-conquest.vercel.app.

## Application and Supabase

Supabase's site URL is configured for https://monopoly.adityasharma.site. Redirect URLs and Edge Function CORS allow both the custom domain and the existing Vercel alias, plus the intended local development URLs. Email signup explicitly redirects back to the address used to sign up, so the existing alias remains usable while DNS is pending.

Hosted invitation links use the current browser origin. Local development now uses the working custom address through VITE_PUBLIC_GAME_URL. No privileged key is exposed by the domain change.

Check DNS after saving the record:

```sh
npx --yes vercel domains verify monopoly.adityasharma.site --scope aditya-sharmas-projects-d1620c46
```

Then verify https://monopoly.adityasharma.site and a shared room invitation in independent browser sessions.
