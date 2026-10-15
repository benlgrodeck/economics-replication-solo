# Economics Replication Solo

A self-paced, single-player version of the economics replication classroom game. Play all 18 findings in fixed order, report a binary prediction and 50–100% confidence, and receive quadratic points and a binary correct count after each answer.

## Play

https://benlgrodeck.github.io/economics-replication-solo/

No account, oTree server, or room code is needed. Progress stays in the browser’s local storage. Restart at any time or download the final results as CSV. No monetary prize is implemented.

The expandable study statistics and labeled abstract summaries match the classroom version. Full original abstracts are linked rather than reproduced. Replication source attribution is kept out of the play interface.

## Instructor source

The outcomes are based on Camerer et al. (2016), Evaluating replicability of laboratory experiments in economics, Science 351, 1433–1436, DOI 10.1126/science.aaf0918. Replication means the selected test found a statistically significant effect in the original direction, rather than validating the entire paper.

Points = 100 × [1 − (p − y)²]. The confidence maps to p directly for a replication guess and to 1 − confidence for a non-replication guess. At 50%, either binary choice gets 75 points, but binary accuracy uses the chosen side.

## Hosting

GitHub Pages serves the static files in this repository. Unlike the synchronized classroom edition, this game needs no server or database. Outcomes are present in the downloaded dataset, so this is a learning activity rather than a secure assessment. No student data is submitted to a game server.

For local testing, serve this folder with a static HTTP server.

## Shared leaderboard

One public leaderboard is active for everyone. Players may voluntarily submit an alias after all 18 questions. Points are recomputed by the database, and only the first submitted score per anonymous browser identity is retained. See [activation instructions](backend/README.md). The connected Supabase Free project validates and stores public scores. The public project URL and publishable key are in `leaderboard-config.js`; no privileged keys are stored in this repository.
