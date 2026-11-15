# Sentinel review: P6 account-only `send-results` (head bf0607f) — 2026-11-10

Role: Sentinel. Read-only: no deploy, no migration, no write to Supabase, no email sent, no repo change, no account created, nobody logged in. Numbering continues from `claude/Sentinel_SendResults_PreFlight_2026-11-04.md` (F1 to F16) and `claude/Sentinel_SendResults_P3P4_Review_2026-11-05.md` (F17 to F24): new findings start at **F25**.

Labels: **Verified** = I ran it. **Read** = I read the real source or doc. **Inferred** = reasoned. Every Inferred item below is either a numbered condition or listed in section 8; none of the CLEAR verdicts rests on an unlabelled assumption.

Connectors checked: git/GitHub (fresh clone of clear-testing, `git ls-remote`), local Node 22.23.4, Deno 2.9.6, Playwright Chromium, npm registry (pinned `@supabase/supabase-js`, `auth-js`, `functions-js` 2.118.0), Supabase read-only (`list_edge_functions`, `get_edge_function` trello, `list_migrations`, `list_tables`, `get_advisors`, `query_logs`, `search_docs`), Resend read-only (`get-usage`, `list-emails`), Project docs. **Not reachable from my sandbox:** testing.chemcalc.co and `*.supabase.co` (proxy answers 403; I did not work around it). Brevo is not connected.

---

## 0. Answers first

1. **Verdicts.** 25c2b1a **CLEAR**. 906979e **CLEAR WITH CONDITIONS** (C1 to C4 below). bf0607f **CLEAR** (two Low cosmetic findings, F31 and F33, optional). **Plan (section 4): CLEAR WITH CONDITIONS.** No BLOCK, no High finding.
2. **Can anyone make the function email a third party?** Not through the code: I found no way in about 110 attack cases (section 3.2). **One external dependency decides it: Supabase "Confirm email" must be ON.** With it OFF, anyone can sign up with a victim's address, get an instantly "confirmed" account, and have our verified sender mail the victim up to 3 times a day with text they wrote (F25). Leo's screenshot of that setting is from 2026-10-01; it must be re-checked the day of the deploy (C1).
3. **Atlas's residual wording (section 3 of the Atlas doc) is not accurate as written.** Four corrections: it holds only with Confirm email ON; the 3-per-account cap does not bound one inbox (Gmail aliases are separate accounts); "10 per network address" is unproven until the live IP test; "until the next day" is a rolling 24 hours, and the same shared pool can also be drained through `send-feedback` with no account at all. Corrected text for Leo: section 5.
4. **Service-role key as `apikey` (Atlas observation 5):** I expect the live gateway to accept it (strong Read evidence, not yet run live). **Do not switch to the anon key before launch.** The first signed-in live check (6.2) is built as the gate; if it fails, the anon-key fallback in section 6 goes to Forge (the live trello function already uses that pattern and works).
5. **Suites, run by me:** send-results 83/83 (Node and Deno), trello 31/31, `rehearse_grants.mjs` 20/20, `deno check` clean on handler.ts and index.ts. The new tests fail **11** of 83 against the c956a6b handler (Forge said 11).
6. **supabase-js 2.118.0 does send the signed-in user's access token** to the function (Verified from the package source), and the anon JWT only when signed out. The front end's 401 test (`err.context.status`) matches what `functions.invoke` returns.
7. **Live state unchanged:** send-results still v3 (ezbr `b0943f0d…6ad3`, verify_jwt false), no `email_send_log` table, origin/main still `071e40b3…`, Resend 0 emails sent ever in its window (0/100 today, 0/3000 month).

### Conditions

| # | Condition | Owner | Closes at |
|---|---|---|---|
| C1 | Confirm email is **ON**, re-checked in the dashboard on the day of the deploy (dated screenshot saved to the project). Authentication, Sign In / Providers, Email. | Leo | Step 0 |
| C2 | Gate check 6.2 passes (a signed-in, validation-refused call returns **400 Invalid request**, not 401 or 503) before any real send. If it fails: stop and use the anon-key fallback (section 6). | Sentinel | Step 6.2 |
| C3 | IP-source live test (inherited C1 of 2026-11-04): `ip_hash` on the test rows differs from sha256('unknown'). If it equals it, the per-IP cap is off and I record it; if it is a client-writable value the per-IP cap is advisory. Site does not lock either way; recipient and global caps hold. | Sentinel | Step 6.8 |
| C4 | Deployed bytes equal the git blobs (two files, two shas), version 4, verify_jwt false, entrypoint index.ts. | Sentinel | Step 5 |
| C5 | Leo accepts the corrected residual wording (section 5) in chat. Replaces the old C4 (free-text phishing) for this design. | Leo | Step 0 |
| C6 | Release order: function deployed **before** the Hostinger upload. | Leo, Forge | Step 7 |

---

## 1. Findings

| ID | Sev | Finding | Evidence | Fix / decision |
|---|---|---|---|---|
| F25 | **Medium (condition C1)** | The guarantee "mail goes only to an address its owner proved" rests on Supabase's Confirm email setting. `authenticate()` trusts `email_confirmed_at`; with Confirm email OFF a sign-up with a victim's address is confirmed at once, so the function mails the victim (3 per victim per day, 25 overall) with attacker-written text (up to 3,000 characters; R8 refuses text containing links, URLs or `@`, so lures like "call 555-0100" still go through) under the fixed heading, from the verified sender. | Read: handler.ts 146-161 (only `email`, `email_confirmed_at`, `is_anonymous` are checked). Inferred: OFF means instant confirmation (the setting's documented meaning; Auth config is not visible to my connectors). Verified: with a confirmed user whose address is the victim's, the function sends to the victim (harness, case "plain confirmed user"). Read (in the Atlas dispatch, not the checklist file itself): A2 of the pre-launch checklist says ON, from a screenshot dated 2026-10-01. | C1. Optional later belt-and-braces (not recommended pre-launch, needs a live sign-up to calibrate): also require `email_confirmed_at` to be later than `created_at` by a few seconds, or a Google identity. |
| F26 | **Medium (inherited, C3)** | The caps that bound account abuse are weaker than the wording says. (a) 3-per-account is not a bound on one inbox: `me+0..me+3@` are four accounts and four buckets (Verified, harness). (b) 10-per-IP needs `cf-connecting-ip`; otherwise the first `x-forwarded-for` entry is used (client-writable) or the check is skipped. (c) **The only hard bound is global 25 per rolling 24 h** (Verified: 30 throwaway accounts with rotating x-forwarded-for gave exactly 25 sends, each to its own account). | Read: handler.ts 497-512. Verified: attack harness section G. | Live test C3. Keep the Turnstile recommendation, now aimed at Supabase sign-up (below, F27). |
| F27 | Low (accepted) | Nuisance lock-out: about 9 alias accounts a day (3 each) saturate the global 25, and every real visitor sees "Failed to send. Please try again." until those rows age out. The window is rolling, not midnight. The front end shows the same text for 429 and 503. | Read: handler.ts 512; email-results.js 127. Verified: front-end test T7c (non-401 error shows the generic text). | Accepted for launch. The right lever is CAPTCHA on Supabase sign-up (Authentication, attack protection; Inferred location). Later: raise LIMITS once real use exists. |
| F28 | **Medium (outside P6, still open)** | `send-feedback` (v1, ezbr `d229d530…e496`, verify_jwt false, CORS `*`, no limits) still shares the Resend key and the 100/day pool, so the pool can be drained with no account at all. Unchanged from F3 of 2026-11-04. | Verified: `list_edge_functions` today (still v1). Read: earlier `get_edge_function`. | Separate dispatch (Atlas). Do it before real traffic. |
| F29 | Low (becomes live gate C2) | `authenticate()` sends the **service-role** key as `apikey` with the user's token as Bearer. Not run against the live gateway. The live trello function uses the **anon** key there and works. | Read: handler.ts 151. Read: auth-js 2.118.0 `getUser(jwt)` sends `GET {url}/user` with the client's own key in `apikey` and `Authorization: Bearer <jwt>`, so an admin client makes this exact call. Read: Supabase docs ("Authorization headers"): a user JWT goes in `Authorization`, a project key in `apikey`. Read: trello handler (live) `apikey: SUPABASE_ANON_KEY`. Verified: in the fake world the code does send `apikey = SERVICE_KEY` (tests assert it); the fake cannot tell whether the real gateway agrees. | Keep. Gate with check 6.2. Fallback patch in section 6. |
| F30 | Low (doc) | REPORT.md says verify_jwt must stay off "because the visitor's token is a user token, and so that preflight requests work". Neither is the reason: a user access token is a valid JWT, and the live trello function runs with verify_jwt **true** and is called from testing.chemcalc.co in the browser (so the preflight gets through). **I also correct my own 2026-11-04 plan step 4**, which said a true flag would break the preflight; that is not supported. The decision stays: keep false (it is the live config, and the anon JWT that signed-out visitors send passes the gateway check anyway, so true would only filter requests with no or garbage Authorization). | Verified: `list_edge_functions` (trello verify_jwt true). Read: `claude/Sentinel_TrelloServerSide_PreFlight_QA.md` (browser calls to trello worked live). Inferred: the gateway lets OPTIONS through under true; settle with one preflight observed in the browser pane if Atlas wants true later. | Fix the REPORT.md sentence in the next small commit. Optional later hardening: verify_jwt true as a cheap front filter, after a live OPTIONS check. |
| F31 | Low | `EMAIL_RE` rejects valid confirmed addresses (apostrophe, unicode, IDN). That user is signed in, gets 401, and the page says "Please log in to email your results." and opens the login modal. | Verified: harness (apostrophe, unicode, IDN, single-label all give 401). Read: email-results.js 122-125. | Front end: show the login prompt on 401 only when `getAuthState().user` is empty; otherwise "Failed to send". Do not loosen the regex (it is what keeps header and list injection out). |
| F32 | Low | (a) A 200 whose body cannot be read, or a body read aborted mid-stream, becomes **401**, not 503 (Verified: harness NOTE). (b) Every request with any 20 to 4,096 character token costs one Auth round trip, with nothing before it; an Auth 429 turns into 503 for real users (fail closed). | Read: handler.ts 153-155. Verified: harness section C. | Optional: treat a failed `res.json()` as 503; add a JWT-shape pre-filter (three dot-separated segments; the anon JWT still passes) so garbage never reaches Auth. |
| F33 | Low (cosmetic; Atlas observation 1) | The box is redrawn on every `chemcalc:authchange`. (a) Signed-in visitors see the login button until `getSession` and the profile query finish. (b) An auth event after "Results sent!" wipes the message and the marketing checkbox. (c) An auth event **during** a send replaces the button and message nodes: the success text goes to detached nodes, the visitor sees no confirmation and an enabled Email Me, and a second click sends again (the 3-per-account cap is the only guard). A tab going hidden then visible makes supabase-js notify SIGNED_IN again, so (b) and (c) are realistic: click Email Me, look at the inbox, come back. | Verified in headless Chromium against the real file: T5, T5b, T6. Verified from the pinned auth-js 2.118.0 source: `_onVisibilityChanged` calls `_recoverAndRefresh`, which calls `_notifyAllSubscribers('SIGNED_IN', …)`. Read: global-account-modal.js 185-200 (every auth event re-broadcasts `chemcalc:authchange`). | Optional: in `sendResultsEmail`, re-resolve `btnEmailResults` and `emailResultsMsg` after the await; in `render()` skip while a send is in flight. |
| F34 | Info | The old open-relay source `index.ts` (7,142 bytes, sha256 `ceffb71e…`, CORS `*`, reads `email` from the body) is tracked at the **repo root and in testing/**, identical, no key material. Commit cffff22 deleted it; the promotion commit 4357beb brought it back. If the FTP sync uploads it, it is a public copy of the old relay; it is also easy to deploy by mistake. | Verified: `git ls-files`, sha256, grep for key patterns (none). Inferred: whether Hostinger serves it. | Cleanup dispatch: delete both (not part of P6). |
| F35 | Info | Between the function deploy and the Hostinger upload, production still runs the old box. Anonymous visitors get a generic failure. **Signed-in visitors get "Results sent!" but the mail goes to their account address, not the one they typed** (the body address is ignored). | Read: old root email-results.js (unchanged, empty diff vs main). Read: handler.ts 481, 517. | Keep the window short (C6). No code change. |
| F36 | Info | `#captureEmailInput` rule in style.css is unused; `autofillEmailFields` looks for id `emailInput`, so nothing else touched the removed input. | Read: style.css 3736-3748; global-auth.js 128-136. | No action (agree with Atlas). |
| F37 | Low (accepted) | Pre-hijack with Confirm email ON: an attacker signs up with a victim's address and a password of their own; Supabase's own mailer sends the victim a confirmation message (outside this function). If the victim clicks it, the account becomes confirmed for the victim's address while the attacker holds the password, and the attacker can then trigger 3 text-only mails a day to that victim. Needs the victim's click. | Inferred (standard sign-up flow). | Accepted; stated in the residual wording. |

Not findings (checked, clean): ordering (nothing logged, written or sent before `authenticate()` succeeds; the body is not even read), logs (no token, no address, no HTML), CORS on every refusal path, OPTIONS without auth, header injection through email or name, body `email` and every alias key, pending `email_change`, OAuth user, `is_anonymous`.

---

## 2. Task 1: the revert (25c2b1a)

- **Verified:** `git diff c956a6b 25c2b1a -- supabase tools` is empty (0 bytes). The function and tools tree equals the c956a6b tree I already CLEARed.
- **Verified:** commit contents: handler.ts, vocab.ts (deleted), REPORT.md, send_results_handler.test.mjs, send_results_vocab_check.mjs (deleted). No vocab file exists anywhere in the tree at bf0607f.
- **Verified (fresh clone, `git show <sha>:<path>`):** at bf0607f handler.ts 26,224 bytes sha256 `baa81daf705ac8118fc603561c1d8cf48052b1c5923d034a727805af898f7b2a`; index.ts 904 bytes `aceeded1bb8418f0d63cdbdbb049dea6c807df66f75ecb6233dd21048d2c1dbf`; testing/email-results.js 9,658 bytes `d0b20e34adf17dba74a9bc5ac3998b122d91d4b603805d6b65bcb1335e25112b`; all LF-only (0 CR bytes). Migration file `20261029120000_email_send_log.sql` 2,077 bytes sha256 `3c2d8a47f14f380c97c36205e4f2179a4a9c855b0dc434faddc0f089e6d974cd`, 0 CR, unchanged since c956a6b.
- **Verified:** `git diff 071e40b bf0607f` touches no repo-root page: production is untouched (the only front-end file in the diff is testing/email-results.js).
- **Verdict 25c2b1a: CLEAR.**

## 3. Tasks 2 to 6

### 3.1 The 906979e diff, line by line (Read)

- `authenticate()` is the brief's code verbatim. Regex `^Bearer ([A-Za-z0-9._~+\/=-]{20,4096})$` on the trimmed header: case-sensitive scheme, exactly one space, no commas, spaces or quotes in the token, so nothing but base64url-style characters is ever forwarded to Auth. Underscore is in the class, so an `sb_publishable_` key passes the regex and is refused by Auth (4xx), not by the regex.
- Auth call: `GET {SUPABASE_URL}/auth/v1/user`, 8 s timeout. 429, 5xx and any thrown error (timeout included) give **503** and log only the error name or status. Any other non-2xx gives **401**. A 2xx must carry a string `email` (at most 254, matching `EMAIL_RE`), a non-empty string `email_confirmed_at`, and `is_anonymous` not `true`.
- Placement in `handle()`: OPTIONS and non-POST first, then the configuration check, then `authenticate()`, **before** the body is read and before any log row. The recipient is `accountEmail` in the recipient hash, the Resend `to` and the Brevo double opt-in. `validate()` no longer reads `email`.
- `EMAIL_RE` ends in `$` without the multiline flag, so a trailing newline fails (Verified).

### 3.2 Attack results (Verified; my harness `attack.mjs` on the real handler.ts and the shipped fake world)

**110 checks pass.** The one FAIL was my own test (an "email of 255 characters" that was really 247); I re-ran the boundary correctly: **254 characters give 200, 255, 256 and 300 give 401**.

| Group | Tried | Result |
|---|---|---|
| A. Authorization shapes | missing, empty, "Bearer " only, lowercase `bearer`, `BEARER`, Basic, double Bearer, two spaces, tab, token with space, comma, semicolon, percent, quote, two Authorization headers (joined with ", "), length 19 and 4,097 | All **401**, no Auth round trip, 0 log rows, 0 other calls. Length 20 and 4,096 reach Auth and the forwarded Bearer is byte-identical; surrounding whitespace is trimmed; the alphabet `. _ ~ + / = -` is accepted. |
| B. User states from Auth | unconfirmed (null, missing, empty, number, true); no email, empty, non-string; 255 characters; CRLF; trailing newline; leading space; "Name <addr>"; two addresses (comma, semicolon); quoted; apostrophe; unicode; IDN; single-label domain; `is_anonymous` true; phone-only user; pending `email_change`; Google OAuth user | Every unconfirmed or malformed state **401** with nothing logged or sent. Confirmed users (plain, OAuth, pending email change, `is_anonymous` missing) **200** and Resend `to` is exactly `[their own current address]`; the pending `new_email` appears nowhere. |
| C. Auth failures | 400, 401, 403, 404, 408, 422 | **401** |
| | 429, 500, 502, 503, 504, network error, timeout, non-Error rejection | **503** |
| | 200 empty, `null`, `[]`, string, number, non-JSON; 204; 301 | **401** (see F32) |
| D. Hostile body | `email` = victim; array of victims; CRLF + Bcc; `to`, `cc`, `bcc`, `replyTo`, `recipient`, `Email`, `from`, `subject` keys; name with CRLF or angle bracket; text with an address, an entity-encoded `@`, a URL, `www.`; an `<a>` tag | `to` is always `[account address]`; the victim string appears in no Resend payload, log row, Brevo call or console line; the Resend body has only `from, to, subject, html`; name shape errors and address or URL text are **400** with no row left; the anchor tag is stripped. |
| E. Ordering | unauthenticated with a well-formed token; missing config; GET, PUT, DELETE; OPTIONS | Body never read, 0 REST calls, 0 Resend, 0 Brevo, 0 rows. Missing config is 503 before any Auth call. Non-POST is 405 without an Auth call. OPTIONS is **204** with no Authorization and the allow-headers list includes `authorization`, `apikey`, `x-client-info` and `content-type`. |
| F. CORS | 401, 401, 503, 503, 400, 429 | Each carries `Access-Control-Allow-Origin` for an allowed origin and `Cache-Control: no-store`; a disallowed origin gets no ACAO. |
| G. Caps | same address in two cases; four plus-aliases; 30 throwaway accounts with rotating x-forwarded-for | Case-insensitive recipient cap (3 pass, 4th 429). Aliases are separate buckets (F26a). **Exactly 25 of 30 succeed** with the per-IP cap bypassed, each mail to the account that asked. |
| H. Logs | whole run | No token, no full address, no HTML. Distinct lines: `sign-in check status 429/500/502/503/504`, `sign-in check failed: TypeError/TimeoutError/undefined`, `missing configuration`, `recipient limit <8 hex>`, `global limit`. |

### 3.3 Abuse model after the change

1. **Third-party mail: none, given Confirm email ON.** The recipient comes only from Supabase Auth's answer for the caller's own token; the body cannot name one (Verified, group D). A stolen token is a valid sign-in for its owner and cannot be told apart here (it still only mails the owner's own address). An expired or revoked token is Auth's business: any 4xx from Auth becomes 401 (Verified in the fake world; Auth's exact status for an expired token is Inferred).
2. **What a throwaway-account attacker can still do:** mail themselves, text only, no links, from the verified sender; 3 per account (aliases multiply accounts), 25 overall per rolling 24 h. That uses up to a quarter of the 100/day Resend pool and locks real visitors out of Email Me (F27). Cost to the attacker: one confirmed sign-up per three mails, about nine a day, trivially scripted with aliases of one inbox. Spam to others: none. Reputation: small bounce risk if they later abandon a confirmed address.
3. **Sign-up with a victim's address, Confirm email ON:** the account stays unconfirmed, so the function answers 401 and mails nothing. The victim does receive Supabase's own confirmation message (outside this function, unchanged). Only if the victim clicks does F37 apply.
4. **Same, Confirm email OFF:** the account is confirmed at once and the function mails the victim, 3 per victim and 25 overall (F25). This is the only way I found to reach a third party, and it is a setting, not code. The function cannot tell autoconfirm from a real confirmation.
5. **Other open channels (unchanged by P6):** Supabase's own mailer (confirmation, password-reset and sign-in-link mail to any typed address, limited by Supabase), and `send-feedback` draining the shared Resend pool (F28). Resend has sent 0 emails ever (Verified), so Supabase Auth mail is not going through this Resend account; its real sender and limits are not visible to me.

### 3.4 Suites and runtimes (Verified, by me, fresh clone at bf0607f)

| Run | Result |
|---|---|
| `node tools/verify/send_results_handler.test.mjs` | 83 pass, 0 fail |
| `deno test -A --no-check tools/verify/send_results_handler.test.mjs` (Deno 2.9.6) | 83 pass, 0 fail |
| `node tools/verify/trello_handler.test.mjs` | 31 pass, 0 fail |
| `rehearse_grants.mjs` (PGlite 0.5.8 from the lockfile) | 20 ok, "ALL OK" |
| `deno check handler.ts index.ts` (exit code checked) | exit 0, no diagnostics (Forge could not run this) |
| The new test file against the **c956a6b** handler | **72 pass, 11 fail** (the validation test for ignoring `email`, the status-code list test, and nine of the ten new auth tests; the "no console line holds a token or address" test passes trivially). Matches Forge's 11. |

### 3.5 The bf0607f front end

- **Verified (headless Chromium, the real `testing/email-results.js`, stubbed `getAuthState`, `openModal`, `_sb`):** signed out shows the login button and no email input, no marketing box and no Email Me; the button calls `openModal('loginModal')`; a hostile address (`<img … onerror>"'&`) is shown as literal text with no element created and no script run; signed in shows "We'll email these results to <address>.", Email Me, the marketing checkbox and the message div; two re-renders leave exactly one box; one click makes exactly one `invoke('send-results')` whose body keys are `calculatorName, resultsHtml, sourceUrl, calculatorId, marketingOptIn` (**no `email`**) with `marketingOptIn` carried; a stubbed 401 shows "Please log in to email your results." and opens the login modal, a 503 shows "Failed to send. Please try again." with no modal; a stale Email Me click while signed out opens the modal and sends nothing; a session user with no email is treated as signed out; no visible results shows "No results to send yet" and sends nothing. No page errors other than the code's own `console.error`. F33 behaviours: see the finding.
- **Verified from the pinned package (supabase-js, functions-js, auth-js 2.118.0, from npm):** `supabase.functions` is built with `customFetch: functionsFetch`; that wrapper sets `apikey` to the client key and, when no Authorization header exists, `Authorization: Bearer <session access token>` from `getSession()` (which refreshes an expired token); only with no session does it fall back to the key itself (the anon key here is a legacy JWT, so the fallback applies). The client's own headers are only `X-Client-Info`, so nothing overrides the user's token. A non-2xx comes back as `{ error: FunctionsHttpError }` whose `context` is the Response, so `err.context.status === 401` is correct. `Content-Type: application/json` makes every call preflighted; that works because OPTIONS needs no auth here (Verified, group E).
- **Verified:** only the five calculator pages (`mekpcalc`, `awlgrip`, `alexseal`, `clothcalc`, `epifanespoly`) plus `email-results.js` call the box (grep of the whole tree, root and testing/; the root copies are the old production files). All five pages load `/global-account-modal.js`, which defines `getAuthState`, `openModal` and injects `#loginModal`; none carries its own modal markup (Read).
- **Not done:** the five pages on https://testing.chemcalc.co signed out. My sandbox cannot load the site (403 from the proxy). It is step 6.0 of the plan, in the browser pane, with a sha256 of the served `email-results.js` against `d0b20e34…`.
- **Verdict bf0607f: CLEAR.**

### 3.6 Atlas observation 5 (service-role key as `apikey`)

- **Expect the live gateway to accept it: yes.** Read evidence: (1) auth-js `getUser(jwt)` on an admin client sends exactly `apikey: <service key>` with `Authorization: Bearer <user jwt>` to `/user`; (2) Supabase's Authorization-headers page describes a user JWT in `Authorization` plus a project key in `apikey`; (3) the shape also fits the new `sb_secret_` keys, which belong in `apikey` only (`authenticate()` already does that). Not proven: this exact call has not been made against this project's gateway; the live trello function proves the anon-key variant (and that real ES256 user tokens are accepted).
- **Recommendation: only if the live check fails.** A failure is clean (every signed-in request would be 401; nothing is sent or logged, no cap is used) and shows on the first signed-in call (6.2), before any email. Switching now changes index.ts (the one file stable since v3) and the fake world, and means another review round. Least privilege is a fair argument for the anon key (the service key never leaves our own project host, so there is no exposure today); take it as a cleanup the next time index.ts is touched.

---

## 4. Amended deployment plan (production change, so this is the pre-flight)

**Verdict: CLEAR WITH CONDITIONS (C1 to C6).** Order is safe: go/no-go, migration, migration checks, deploy, deploy check, live checks, upload. The migration before the deploy is required (a signed-in call with no table is a 503). v3 never touches the table.

### 4.1 Who does what

| Who | Does |
|---|---|
| **Leo** | Go/no-go (a production change: the function is shared by testing, chemcalc.co and www). Confirm email check (C1). Pastes the migration in the dashboard SQL editor (or authorizes Atlas to). Signs the QA account into my browser pane, then his own account for three sends (I never type a credential and am never given one). Submits the site feedback form once. Hostinger upload after my sign-off. |
| **Forge** | Deploys exactly two files from the git blobs. Nothing else (no commit, no push). |
| **Sentinel (me)** | Verifies the migration output and the deploy, runs the live checks through the page's real session, reads logs and Resend, writes the results doc, calls rollback if needed. |
| **Atlas** | Dispatch Q to Forge, record keeping, scorecard, promotion dispatch after my sign-off. |

### 4.2 Steps

| Step | Owner | Action | Pass rule | If it fails |
|---|---|---|---|---|
| 0 | Leo | Go/no-go with the corrected wording (section 5). Dated screenshot: Confirm email ON (C1). Resend key still Sending access, one domain (C2 of 2026-11-04, closed; confirm unchanged). | C1 and C5 answered in chat | Do not start |
| 1 | Leo (or Atlas) | Apply `supabase/migrations/proposed/email_send_log/20261029120000_email_send_log.sql` (git blob at bf0607f, 2,077 bytes, sha256 `3c2d8a47…74cd`) in the dashboard SQL editor. If pasted into a tool that already wraps a transaction, drop its `begin;`/`commit;` (F13 of 2026-11-04). | No error | Stop; rollback below |
| 2 | Leo or Atlas pastes the output; I compare | Appendix A, **V1 to V9** | Every value equals its "Expect" comment | Stop, roll back, no deploy |
| 3 | Sentinel (browser pane) | The **two anon-key REST checks** (Appendix A), run as `fetch()` in the testing.chemcalc.co page using the public anon key already in `supabase-client.js`. Then `get_advisors` (security): one INFO `rls_enabled_no_policy` for the new table is expected. | Both refused (401/403 with 42501, or 404 PGRST205); no ERROR naming the table | Roll back |
| 4 | Forge | `deploy_edge_function` name `send-results`, entrypoint `index.ts`, **`verify_jwt: false` passed explicitly** (the tool default is true), exactly two files taken with `git show bf0607f:<path>` (never from a Windows working tree): `supabase/functions/send-results/index.ts` (904 B) and `.../handler.ts` (26,224 B). | Tool returns version 4 | Report the error text; do not retry blindly |
| 5 | Sentinel | `list_edge_functions`: send-results **version 4**, ACTIVE, verify_jwt false, entrypoint index.ts. `get_edge_function`: **exactly two files**, sha256 of `index.ts` = `aceeded1…1dbf` and of `handler.ts` = `baa81daf…f7b2` (a trailing-newline difference is the only tolerated byte difference). (C4) | All equal | Redeploy from the blob; no live check before this passes |
| 6.0 | Sentinel (pane, signed out) | Five calculator pages on testing.chemcalc.co: login button visible, no email input. Fetch `/email-results.js` in the page and compare sha256 to `d0b20e34…`. Cost 0. | All five pass; sha equal | Report; the testing deploy did not carry bf0607f |
| 6.1 | Sentinel (pane, signed out) | From the page (real origin, real preflight): POST with no Authorization -> **401** `{"error":"Sign in required"}`; Bearer = the page's anon key -> **401**; Bearer = 30 random characters -> **401**; OPTIONS observed (a JSON POST triggers it) -> allowed, response readable. Then `select count(*) from public.email_send_log` -> **0**. Cost 0 emails, 0 rows. | As stated | Any 200, or a row, is a BLOCK |
| 6.2 | Sentinel, **after Leo signs the QA account in** | **The gate (C2).** `_sb.functions.invoke('send-results', { body: { calculatorName: 'x<', resultsHtml: '<p>x</p>' } })` through the real session. The name shape check fails after `authenticate()` passes, before anything is logged. | **400 Invalid request** (proves the gateway accepts the service key as `apikey` with a user Bearer, and the token is verified). Rows still 0, no email. | 401 or 503: stop; Forge applies the anon-key fallback (section 6), I re-review that delta, then redeploy as version 5 |
| 6.3 | Sentinel, QA signed in | **Two real Email Me clicks**: mekpcalc, then awlgrip (real calculation each). Marketing box unticked (Brevo DOI stays off). | "Results sent!"; two mails in Leo's inbox addressed to `lpedreros+qa@gmail.com`; Resend shows `to` = that address only | Report with the exact on-screen text and console |
| 6.4 | Sentinel, QA signed in | **Hostile signed-in call (send 3):** `invoke('send-results', { body: { email: 'lpedreros+qa3@gmail.com', to: 'lpedreros+qa3@gmail.com', bcc: 'lpedreros+qa3@gmail.com', calculatorName: 'MEKP Catalyst', calculatorId: 'mekp', resultsHtml: '<p>Hostile test</p>', sourceUrl: 'https://testing.chemcalc.co/mekpcalc.html' } })`. | 200; the mail is addressed to `lpedreros+qa@gmail.com`; Resend `get-email` shows `to` = only that address, no cc, no bcc; **nothing for +qa3** (Resend list and a Gmail search `to:lpedreros+qa3` both empty) | Any mail to +qa3 is a BLOCK and the kill switch goes on |
| 6.5 | Sentinel, QA signed in | **Fourth attempt inside 24 h:** a real Email Me click on clothcalc. | On-screen "Failed to send. Please try again."; console error context status 429; **no email**; QA still has 3 rows (the refused request removed its own row) | A fourth mail is a FAIL |
| 6.6 | Leo signs his own account (`lpedreros@gmail.com`) into the pane; Sentinel clicks | **Three real clicks** on the calculators not yet covered: alexseal, clothcalc, epifanespoly. | Three "Results sent!"; three mails to Leo's address | Report |
| 6.7 | Leo | Submits the site feedback form once (shared Resend key; it has never sent anything, F14 of 2026-11-04, so this is the first proof that the key works end to end). | Mail arrives at info@thinkandengage.com | Report |
| 6.8 | Sentinel | **After the sends:** (a) rows: `select created_at, left(recipient_hash,8) r, left(ip_hash,8) i from public.email_send_log order by created_at;` -> **6 rows**: three with recipient hash `61da9223…` (sha256 of `lpedreros+qa@gmail.com`), three with `58755958…` (sha256 of `lpedreros@gmail.com`); **no** `51d3be24…` (sha256 of `lpedreros+qa3@gmail.com`); `ip_hash` equal across all six and **different from** `b23a6a84…` (sha256 of `unknown`) (C3). (b) Function logs (`query_logs`, last hour): only `recipient limit <8 hex>` lines (from 6.5) and any `client IP unavailable`; no `@`, no `eyJ`, no `Bearer`, no HTML. (c) Resend: `list-emails` shows exactly 7 sends (6 results, 1 feedback), all delivered, subjects of the form "Your <fixed name> Results from ChemCalc", 0 bounced, 0 complained; `get-usage` sent = 7. | As stated | Any difference is reported with the raw rows; an `ip_hash` equal to the `unknown` hash is recorded as C3 (per-IP cap off, site not locked) |

**Cap arithmetic.** One account completes at most 3 successful sends in a rolling 24 h, and a refused request frees its own slot. QA: 2 real + 1 hostile = 3 successes, then 1 refusal. Leo: 3 successes. All five Email Me buttons are exercised successfully once (mekpcalc and awlgrip by QA, alexseal, clothcalc and epifanespoly by Leo); the refused click on clothcalc adds the 429 path. **Budget: 7 emails** (3 QA, 3 Leo, 1 feedback), at most about 10 allowed; **6 rows from one IP** (of 10 per IP) and 6 of the 25 global. Three spare sends remain for a retry. If Leo prefers not to sign in himself, the three Leo sends move to the same QA account **24 hours after its first send** (the window is rolling), on a second day.

**Not tested live on purpose:** the per-IP 10 and global 25 caps (would need 10 and 25 real emails); they are covered by the sequential and burst tests and by harness group G.

### 4.3 Release and rollback

1. **Release order (C6):** function deployed and checked (step 5 and 6.x) **before** the Hostinger upload. The new site against v3 would post no address and fail; an old site against the new function gets 401 for anonymous visitors, and signed-in visitors get the mail at their account address (F35). Keep the gap short. Nothing merges to main until Leo approves.
2. **Kill switch (instant, reversible, no data loss):** `alter table public.email_send_log rename to email_send_log_off;` -> every signed-in send gets 503 and mails nothing (anonymous requests are already 401 before the table is touched). Back on: rename it back.
3. **Fallback for the gate (C2):** the anon-key patch, section 6.
4. **Function rollback to v3 reopens the open relay.** Source is saved in `claude/Atlas_SendResults_v3_Source_Backup_2026-11-04.md`. Only with Leo's explicit OK, and prefer fixing forward.
5. **Migration rollback:** `begin; drop table if exists public.email_send_log; commit;` (hash rows only). If a tool recorded a migration, remove only its registry row: `select version, name from supabase_migrations.schema_migrations order by version desc limit 3;`.
6. **Irreversible:** emails already sent; a bounce or complaint on the sender domain (Resend has no history, so the first 25 sends set the reputation; the plan sends 7, all to Leo's own inboxes).

### 4.4 Monitoring after launch (extends the 2026-11-04 plan)

Keep W1 and W2 from `claude/Sentinel_SendResults_PreFlight_2026-11-04.md` (daily volume with the `unknown`-bucket flag, current-window counts). Add: gateway status counts for `/functions/v1/send-results` from `query_logs` on `edge_logs` (field names to be adapted by Atlas): a **401 spike** means a flood or the old site; **503** means an Auth outage or the table missing; **429** means caps. Triggers to act: any day at 20 or more sends; `used_unknown_bucket = true`; any 502; any Resend pause notice; `send-feedback` volume (F28); first bounce in the first 50 sends.

---

## 5. Residual wording for Leo (corrected)

```
After this change our verified sender emails only the address of a signed-in ChemCalc account, and only that account's own address. Nobody can pick the recipient: the address in the request is ignored. This holds as long as Supabase's "Confirm email" setting stays ON, because that is what proves the address belongs to the person who signed up. If it is ever turned OFF, someone could register with another person's address and have the sender email it, so we check that setting on the day we deploy and any time it is touched.

What is still possible: someone can create extra accounts (one inbox can make many with Gmail-style aliases) and email themselves. The hard limit is 25 messages in any rolling 24 hours in total; the limits of 3 per account and 10 per network address help but do not bound one person, and the network-address limit is only confirmed after the live test. The nuisance case is using up the 25, so real visitors see "Failed to send" until those messages age out (up to 24 hours, not midnight). Two things sit outside this function and are unchanged: Supabase's own emails (sign-up confirmation, password reset, sign-in links) can still be requested for any address someone types, and the site feedback form has no limit and shares the same daily sending allowance (100 a day). One residual case remains: if someone registers with your address and you click the confirmation link in Supabase's email, that account can then send you up to three text-only messages a day.
```

What changed against the Atlas draft, in order: added the Confirm-email condition and dropped the absolute "nobody can send anything to another person"; added that aliases defeat the per-account cap and that the IP cap is unproven; replaced "until the next day" with a rolling 24 hours; added the two outside channels (Supabase mail, `send-feedback`) and the victim-clicks case (F37).

---

## 6. Hand-off for Atlas

1. **Needed from Leo before any step:** the go (production change), C1 (dated Confirm-email screenshot), C5 (acceptance of section 5). Also which of Leo's two options for the three remaining calculators: his own account today (primary in the plan) or QA tomorrow.
2. **Dispatch Q for Forge (when Leo says go), self-contained facts:** repo `lpedreros/Chemcalc`, branch clear-testing, head `bf0607f29c1f5e17bbee603b225e4439326abdeb`; deploy tool `deploy_edge_function`, name `send-results`, entrypoint `index.ts`, `verify_jwt: false` explicit; files and expected values: `index.ts` 904 B `aceeded1bb8418f0d63cdbdbb049dea6c807df66f75ecb6233dd21048d2c1dbf`, `handler.ts` 26,224 B `baa81daf705ac8118fc603561c1d8cf48052b1c5923d034a727805af898f7b2a`, from `git show bf0607f:<path>`; expected result version 4. Forge touches nothing else. Dispatch only after steps 1 to 3 pass.
3. **Only if gate 6.2 fails, anon-key fallback (one commit, then I re-review the delta):** `index.ts` adds `SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ?? ''` to `env`; `handler.ts` adds `SUPABASE_ANON_KEY: string` to `Env`, adds it to the configuration check, and uses `apikey: d.env.SUPABASE_ANON_KEY` in `authenticate()`; `send_results_fakes.mjs` gets an `ANON_KEY` in `ENV` and the fake auth endpoint compares `apikey` to it; tests updated; the index.ts sha and the version (5) in section 4 change. Suggested commit message: "send-results: check the sign-in with the anon key (the pattern trello uses)", then the attribution lines from the project rules.
4. **Optional small follow-up (P7), not a launch blocker:** (a) `sendResultsEmail` re-resolves the button and message nodes after the await, and `render()` skips while a send is in flight (F33); (b) show the login prompt on 401 only when there is no signed-in user (F31); (c) handler: a failed `res.json()` in `authenticate()` is a 503, optional JWT-shape pre-filter (F32); (d) correct the verify_jwt sentence in REPORT.md (F30). Suggested commit message: "Email Me and send-results: small follow-ups from the P6 review (no lost confirmation on auth events, clearer 401, 503 on unreadable sign-in answers)", then the attribution lines.
5. **Separate dispatches:** harden `send-feedback` (F28); Supabase sign-up CAPTCHA (F26/F27); delete the stale `index.ts` at the repo root and in testing/ (F34); a dated record of the Confirm-email setting in `claude/Atlas_PreLaunch_Checklist.md` A2.
6. **Records:** the corrected wording replaces section 3 of the Atlas P6 doc; the scorecard gets the new triggers (section 4.4); the 2026-11-05 plan (6.1 to 6.8) is superseded by section 4.2 here; the old "closed vocabulary" items (P5 fixes) stay dropped.
7. **Editor review:** the three UI lines in bf0607f are Atlas's wording; Leo's OK or Editor review is still open (not mine).

---

## 7. Evidence log (Verified unless marked)

- Fresh clone `…/scratchpad/p6/repo`, clear-testing at `bf0607f29c1f5e17bbee603b225e4439326abdeb`; `git ls-remote` main `071e40b3…` (unchanged).
- Own scripts (scratchpad `p6/`): `attack.mjs` (110 pass, 1 mis-sized test of mine), `edge255.mjs` (254 ok, 255+ refused), `fe_check.js` (Chromium, 14 checks pass plus the three behaviour notes), npm packs of `@supabase/{supabase-js,functions-js,auth-js}@2.118.0`.
- Supabase read-only: `list_edge_functions` (send-results v3 ezbr `b0943f0d…6ad3`, verify_jwt false; trello v2 verify_jwt true; send-feedback v1), `get_edge_function trello`, `list_migrations` (13, latest 20261020210400, no email_send_log), `list_tables` (no email_send_log), `get_advisors` security (no finding about the new table, which does not exist yet; unrelated pre-existing lints: `handle_new_user` and `mark_email_captured` executable by anon, leaked-password protection off), `query_logs` (no function logs in 24 h: v3 saw no traffic), `search_docs`.
- Resend read-only: `get-usage` 0/100 today, 0/3000 month, 10 requests/s; `list-emails` none.
- A cleanup command of mine (`rm -rf` of a scratch directory) was blocked by the sandbox safety check; I did not work around it and used a fresh directory. Scratch directories are left in place.

## 8. What I could not verify, and why

1. **Confirm email is ON today** (and which providers are enabled; only Google should be): Auth configuration is not visible to my connectors. Condition C1.
2. **The service-key `apikey` call on the live gateway:** not made; gate C2.
3. **`cf-connecting-ip` on the edge-function path:** needs the live test (C3).
4. **The five pages on testing.chemcalc.co, and whether testing currently serves bf0607f's `email-results.js`:** my sandbox gets 403 from the proxy. Forge reported a green Deploy run; step 6.0 checks it.
5. **OPTIONS under verify_jwt true** (F30): inferred from trello working in the browser; one observed preflight would settle it.
6. **Supabase's own mail configuration** (sender, limits): not visible; Resend has sent nothing ever, so it is not routed through this account.
7. **Real mail-client rendering** and deliverability of the first sends: Leo looks at the inbox copies.
8. **Brevo** (not connected): unchanged by P6; the double opt-in stays off.
9. **Hosted Deno version:** tested on 2.9.6; unchanged limit from 2026-11-04.

---

## Appendix A: migration verification, unchanged from `claude/Sentinel_SendResults_PreFlight_2026-11-04.md` (copied so this doc stands alone)

Run in the dashboard SQL editor right after the apply, before any deploy. Any difference means STOP and roll back.

```
-- V1 table, owner, RLS flags.   Expect: email_send_log | postgres | r | true | false
select c.relname, pg_get_userbyid(c.relowner) as owner, c.relkind::text as kind, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c where c.oid = to_regclass('public.email_send_log');

-- V2 exact ACL.   Expect: {postgres=arwdDxtm/postgres,service_role=ard/postgres}
select c.relacl::text as relacl from pg_class c where c.oid = to_regclass('public.email_send_log');

-- V3 every grantee (grantee 0 = PUBLIC).   Expect exactly 2 rows: postgres (all) and service_role = DELETE,INSERT,SELECT. No anon, authenticated or PUBLIC row.
select case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as grantee,
       string_agg(a.privilege_type, ',' order by a.privilege_type) as privileges
from pg_class c, aclexplode(c.relacl) a where c.oid = to_regclass('public.email_send_log') group by 1 order by 1;

-- V4 privilege matrix as Postgres evaluates it.   Expect: anon NULL, authenticated NULL, service_role DELETE,INSERT,SELECT
select r.rolname, string_agg(p.priv, ',' order by p.priv) filter (where has_table_privilege(r.rolname, 'public.email_send_log', p.priv)) as has_privs
from (values ('anon'),('authenticated'),('service_role')) r(rolname)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(priv)
group by r.rolname order by r.rolname;

-- V5 policies.   Expect: 0 rows (RLS on, no policy, deny by default)
select policyname, cmd, roles::text from pg_policies where schemaname = 'public' and tablename = 'email_send_log';

-- V6 indexes.   Expect 4: email_send_log_created_at_idx, _ip_idx, _pkey, _recipient_idx
select indexname from pg_indexes where schemaname = 'public' and tablename = 'email_send_log' order by indexname;

-- V7 columns.   Expect 5: id uuid (gen_random_uuid()), created_at timestamptz (now()), recipient_hash text, ip_hash text, kind text ('results'); all NOT NULL
select column_name, data_type, is_nullable, column_default from information_schema.columns
where table_schema = 'public' and table_name = 'email_send_log' order by ordinal_position;

-- V8 column-level grants to API roles.   Expect: 0 rows
select grantee, column_name, privilege_type from information_schema.column_privileges
where table_schema = 'public' and table_name = 'email_send_log' and grantee in ('anon', 'authenticated', 'PUBLIC');

-- V9 empty after apply.   Expect: 0
select count(*) as rows_now from public.email_send_log;
```

Anon-key REST proof (same two requests, run as `fetch()` from the testing page with the page's own public anon key, or with curl from Leo's machine). Expect both refused: HTTP 401 or 403 with `"code":"42501"` (or 404 `PGRST205` if the schema cache hides the table). 200, 201 or 204 is a FAIL and the rollback runs.

```
GET  https://rnrzjlfpwxzomupnxikt.supabase.co/rest/v1/email_send_log?select=id            (headers: apikey and Authorization: Bearer, both the anon key)
POST https://rnrzjlfpwxzomupnxikt.supabase.co/rest/v1/email_send_log   body {"recipient_hash":"x","ip_hash":"x"}   (same headers, Content-Type: application/json)
```

---

Scope: delta review of P6 (25c2b1a, 906979e, bf0607f) with my own attack harness, suites, front-end replay and pinned-source check, plus the amended live-check plan; about 1.5 hours, read-only, nothing deployed or sent. Connectors used: git/GitHub, local Node and Deno, Playwright Chromium, npm registry, Supabase (read-only: list_edge_functions, get_edge_function, list_migrations, list_tables, get_advisors, query_logs, search_docs), Resend (read-only: get-usage, list-emails), Project docs. Brevo not connected; testing.chemcalc.co and supabase.co unreachable from my sandbox.
