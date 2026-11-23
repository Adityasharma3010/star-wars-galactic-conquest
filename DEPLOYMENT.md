# Hosting and deployment

Updated 20 November 2026. **Public game: https://monopoly.adityasharma.site** (the original Vercel alias remains active).

## Last documented production verification

The previously verified game code was published from commit `1d61061` to deployment `dpl_8a1SrSKoWqdqCZXp6LRivDRX99Y4` on 20 November. Vercel reported Ready and assigned both https://monopoly.adityasharma.site and the original alias. That release added a cinematic menu with actual Star Wars Databank imagery, React Router map/match pages, automatic intro completion, the requested hidden theme-player panel, aligned setup controls, and the complete Force/Galactic event guide. At that time, Default was a coming-soon category; the current source includes the playable India map and rebuilt 3D boards.

Five hosted browser scenarios passed on the custom domain: hidden original Main Title playback, personalized crawl/skip/resume, real menu image loading, map/category URLs and reloads, mobile field alignment, browser Back and saved-game recovery, automatic entry when the final story line leaves the screen, and private-song persistence/deletion/intro separation. Two independent Supabase guests also passed room joining, callsign edits, readiness, start, dice, chat and refresh recovery. The automatic intro scenario entered gameplay in about 55 seconds and confirmed that the theme iframe was removed and match music began.

The preceding `76f82fb` radio release passed quiet native music playback, transitions near a song boundary, keyboard selection, pause/resume, personal-song privacy and mobile menus. No backend deployment or database migration was required for the new menu/routes update.

Hosted welcome and custom-setting persistence checks passed against `68275eb`.

## Previous production verification (19 November)

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

VITE_PUBLIC_GAME_URL=https://monopoly.adityasharma.site is configured locally so invitation buttons can share a public link while playing on localhost/LAN. Hosted invites already use the hosted origin. Service-role keys, database passwords and deployment tokens are never Vite variables or committed files.

## Deployed Supabase configuration

Project iheauyxopwcpouogfkvi, Mumbai, organization Aditya Org. Six approved migrations and the synchronized JavaScript galactic-api Edge Function are deployed. See SUPABASE_SETUP_REPORT.md.

ALLOWED_ORIGINS includes the exact public Vercel origin and localhost development addresses. ALLOW_LAN_ORIGINS=true permits private IPv4 addresses only on development ports 5173/5174. Auth site_url uses the custom domain and redirect URLs include both production aliases; the configuration push succeeded.

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
