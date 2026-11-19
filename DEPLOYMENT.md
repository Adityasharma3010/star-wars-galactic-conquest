# Hosting and deployment

Verified 19 November 2026. **Public game: https://star-wars-galactic-conquest.vercel.app**.

## Actual production verification

The public alias returned HTTP 200 without authentication. Four browser runs against that alias passed: fresh-guest room invitation/readiness/start/roll, two independent guests with authoritative turns/chat/refresh recovery, all 26 property/transport images with ownership and development markers at desktop/mobile sizes, and decoding/preview of the three built-in saber/blaster/droid recordings.

These checks contacted the deployed Supabase backend. They are distinct from merely compiling the frontend or displaying a local mockup.

## GitHub and Vercel

Repository: https://github.com/Adityasharma3010/star-wars-galactic-conquest.

Dedicated Vercel project: star-wars-galactic-conquest, team aditya-sharmas-projects-d1620c46. Project ID: prj_q0LtZ4RcNELdQ2WqKMQON4tllfzQ.

The Vercel GitHub connection succeeded through the CLI for this repository. Source is published on main; later pushes use the project integration to deploy.

The initial production deployment completed successfully and received the public alias. Inspector: https://vercel.com/aditya-sharmas-projects-d1620c46/star-wars-galactic-conquest/3wkK2LrX9tFp9uQjazPwU4H7NhTM.

Use the Vite preset, npm ci, build npm run build, output dist. vercel.json supplies SPA invite rewrites and response headers. .vercelignore excludes local secrets, dependencies, npm cache, build output, research and browser traces from CLI uploads.

Production has only these client-visible Supabase environment values:

- VITE_SUPABASE_URL: the linked project's public HTTPS URL.
- VITE_SUPABASE_PUBLISHABLE_KEY: its public publishable key.

VITE_PUBLIC_GAME_URL=https://star-wars-galactic-conquest.vercel.app is configured locally so invitation buttons can share a public link while playing on localhost/LAN. Hosted invites already use the hosted origin. Service-role keys, database passwords and deployment tokens are never Vite variables or committed files.

## Deployed Supabase configuration

Project iheauyxopwcpouogfkvi, Mumbai, organization Aditya Org. Five approved migrations and the synchronized JavaScript galactic-api Edge Function are deployed. See SUPABASE_SETUP_REPORT.md.

ALLOWED_ORIGINS includes the exact public Vercel origin and localhost development addresses. ALLOW_LAN_ORIGINS=true permits private IPv4 addresses only on development ports 5173/5174. Auth site_url and redirect URLs include the actual HTTPS public alias; the configuration push succeeded.

Deploy later changes with the linked, authenticated CLIs:

```sh
npm test
npm run build
npx --yes vercel --prod --yes
```

If backend source changes:

```sh
npm run backend:sync
npx supabase functions deploy galactic-api --use-api
npx supabase config push --project-ref iheauyxopwcpouogfkvi
```

After deployment, repeat the hosted browser checks using PLAYWRIGHT_BASE_URL and set GAME_LAN_URL to the same address to exercise fresh invite visitors. Additional remote migrations require the owner's approval after a dry run; never reset the linked database.

## Operational limits

Anonymous guests lose recovery if they clear browser credentials. Client polling drives AI and expired decisions; a saved match waits for a client to return when everyone is offline. Report/block controls are implemented, while a staffed moderator console is not included. Email confirmation is enabled; a real inbox confirmation cycle and custom mail delivery are not verified. Official Databank images remain copyrighted reference imagery; included sounds are creator-licensed Star Wars effect recreations. See ASSET_CREDITS.md.
