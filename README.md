# Block Battle Arena

Global multiplayer block-puzzle platform: 1v1 duels, 8-player battle royale, team battles, custom rooms, replays and ranked seasons.

- Web: https://blockbattle.gg
- Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui
- Backend: Supabase (Auth, Postgres + RLS, Edge Functions)
- Hosting: Vercel (static build)

## Local development

```bash
npm install
cp .env.example .env   # fill Supabase URL + anon key
npm run dev            # http://localhost:8080
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (legacy errors still being cleaned) |
| `npm test` | Vitest |

## Environment variables

See `.env.example`. Only `VITE_*` variables are exposed to the browser. Never put a Supabase service-role key or a payment secret in a `VITE_*` variable.

Payment secrets and webhooks live in Supabase Edge Function secrets. The client only receives public tokens (Paddle client token, Stripe price IDs).

## Deployment

- Vercel project: `block-battle` (framework: Vite, output: `dist`)
- `vercel.json` provides SPA fallback and security headers
- Production domain: `blockbattle.gg`

## Realtime architecture (in progress)

Current: Supabase Edge Function WebSocket relay. Target: region-aware rooms on Cloudflare Durable Objects, with JWT-authenticated joins and server-issued piece seeds.

## Compliance notes

- Do not use the Tetris trademark in product name, metadata or marketing.
- Only ship audio you have licensed. The previous placeholder track was removed.
- Age gate is 13+. Add COPPA/GDPR-K handling before targeting younger users.

## License

Proprietary. All rights reserved.
