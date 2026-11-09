# Beta Test Plan — Multiplayer, Rooms, Chat

Goal: validate the three core loops with 5–10 invited testers before any public launch.

## 0. Preconditions

- [ ] Apply `supabase/migrations/20261108090000_fix_handle_new_user_unique_username.sql` in the Supabase SQL editor.
- [ ] Confirm a new email signup returns a session (no `Database error saving new user`).
- [ ] Confirm email confirmation setting: if ON, testers must click the email link before login.
- [ ] Vercel env vars set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY`, `VITE_SENTRY_DSN`.
- [ ] `X-Robots-Tag: noindex` and `robots.txt` disallow are active during beta.

## 1. Access without a domain

Option A (now, 1–3 testers): run `npm run dev` locally and expose it with a tunnel (`npx localtunnel --port 8080`). Backend is Supabase, so multiplayer still works.

Option B (5–10 testers): temporarily disable Vercel SSO for the project, share the `*.vercel.app` URL, keep noindex on. Re-enable before launch.

Option C (later): buy `blockbattle.gg`, attach it; custom domains bypass SSO automatically.

## 2. Test matrix

| # | Case | Steps | Expected | Pass |
|---|---|---|---|---|
| 1 | Signup | New email, strong password | Session created; profile row exists | |
| 2 | Login/logout | Login, logout, refresh | State consistent; no ghost session | |
| 3 | Create room | Lobby → create versus room | Room appears in list; code shown | |
| 4 | Join room | Second account joins by code | Both see 2/2 players | |
| 5 | Room chat | Send 3 messages both ways | Realtime delivery < 1s; persists on refresh | |
| 6 | Start battle | Host starts 1v1 | Both boards start with same countdown/seed | |
| 7 | Garbage/attack | Clear 2+ lines | Opponent receives garbage | |
| 8 | Finish | One player tops out | Winner/loser recorded; room returns to lobby | |
| 9 | Reconnect | Drop network 10s, restore | Client reconnects or fails gracefully | |
| 10 | 8-player | Battle royale with 4–8 accounts | All see each other; elimination order correct | |
| 11 | Mobile | iOS/Android browser | Touch controls usable; no layout overflow | |
| 12 | Guest | Try guest entry | Either works end-to-end or is clearly disabled | |

## 3. Metrics to record

- Match start success rate (rooms created → battle started)
- Realtime message latency (chat and state)
- Disconnects per 10 matches
- Average time from opening the site to first move
- Any console errors (Sentry event IDs)

## 4. Known risks

- Rooms are kept in Edge Function memory; two players may land on different instances and never see each other.
- WebSocket join trusts `userId` from the URL (spoofable); acceptable for closed beta, not for ranked.
- Guest accounts cannot use the WebSocket path (`useBattleWebSocket` returns for `isGuest`).
- Two chat implementations exist (`RoomChat` and `BattleRoomLobby`); test both entry points.

## 5. Bug report template

```
Case #:
Account(s):
Region/network:
Steps:
Expected:
Actual:
Console/Sentry ID:
Screenshot/video:
```
