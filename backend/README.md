# Activate the shared public leaderboard

The game continues to run on GitHub Pages. A dedicated Supabase project stores public scores and calculates them from the submitted answers.

1. Sign in at https://supabase.com/dashboard and create a project on the Free plan. Keep your database password private.
2. Open its SQL Editor, paste `setup.sql`, and run it. It creates a private answer key and scores table, plus two narrowly scoped public API functions. Do not expose the `quiz_private` schema through the Data API.
3. In Authentication settings, enable anonymous sign-ins. No email address or password is requested from players.
4. Copy your Project URL and **publishable** API key from the project's Connect/API settings into `leaderboard-config.js`. A legacy anon key also works. Never use a secret or service_role key.
5. Commit and push the configuration. GitHub Pages will redeploy automatically.
6. Complete a game, submit an alias, and open the game from another browser to confirm the score appears. Submit again from the same browser and confirm the first score is retained.

## Rules and data

Only completed 18-question games can be submitted. The database validates every study ID, boolean choice, and integer confidence between 50 and 100. It computes the score itself; the client cannot submit a points total. A unique anonymous user ID allows one first submitted score per browser identity. Refresh/retry does not create another entry. Ties in points and correct count share a rank. The public board shows the top 100 plus total entry count.

Submission is voluntary. Public output contains aliases, points, correct counts, and completion dates; it never exposes anonymous account IDs or question-by-question answers. The leaderboard does not store individual answers. Anonymous Auth keeps browser identity records.

This is a casual learning leaderboard. Players can register another identity with another browser and already know the outcomes after a replay. It does not enforce a real person's first attempt and is unsuitable for selecting a prize winner or grading. Player aliases are rendered as text and escaped. Only the authorized submission function can insert scores; public clients cannot update or delete them.

To moderate entries, use the Supabase SQL editor or table editor as project owner. Consider Supabase's anonymous sign-in rate limits and CAPTCHA guidance before promoting the game widely. Enabling CAPTCHA requires a corresponding client widget before anonymous sign-in will work.

Official references: https://supabase.com/docs/guides/auth/auth-anonymous and https://supabase.com/docs/guides/getting-started/api-keys

## Verification

Run `node --test test/leaderboard.test.mjs` for API client tests. For a disposable PostgreSQL-compatible database test, install `@electric-sql/pglite` in a temporary directory and run `test/backend.mjs` with `PGLITE_MODULE` pointing to its `dist/index.js`. The test creates an isolated database with mock Auth identities and verifies authoritative scoring, first-score retention, malformed submissions, public ranking, and permissions. It does not contact or alter a hosted project.
