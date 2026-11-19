# Open items

Three lists: what is not yet verified, the assumptions made during the build that need a
decision, and the questions that were already open in the design hand-off.

## 1. Not yet verified or not yet done

| Item | State |
|---|---|
| Supabase connection (`src/data/supabaseApi.ts`) | The project is reachable with the publishable key and a refused sign-in is handled correctly. Reading and writing data is untested until the database scripts are applied and the `pisga` schema is exposed. Expect small fixes at that point |
| Public sign-up on the Supabase project | **Still enabled** when checked on 19.11.2026. It must be disabled before any account is created (mandatory rule for the shared project) |
| Database scripts on Supabase | Verified on local PostgreSQL 16 with stand-ins for Supabase's `auth` and `storage` schemas. Not yet applied to a Supabase project |
| Provisioning script | Only `--dry-run` has been run |
| Advisor Edge Function | Placeholder. Not implemented, not deployed, not tested |
| Cloudflare Pages deployment | Configuration written and checked with Cloudflare's local Pages emulator; no deployment has been made |
| Brand typeface | No licensed Ploni files yet. A copy marked "free for personal use" from a download site must not be used for this site; a web licence from the foundry is required. The interface is set in Heebo until then |
| Accessibility | Built to the hand-off's rules (44px targets, focus ring, real controls, text alternatives for charts). No screen-reader or formal audit has been done |
| Automated browser tests, continuous integration | Not set up. Screens were checked by scripted browser runs during the build, in demo mode |
| Editing a session's speakers | The list is replaced in two database calls, not one transaction. A failure between them would leave the session without speakers until saved again |
| Account management in the app | None, by design. Accounts and roles are managed only by the provisioning script |

## 2. Assumptions made during the build

Each of these was needed to complete a screen or a rule that the hand-off does not define.
They are stated here so that they can be confirmed or changed.

### Hosting and repository

1. **Cloudflare Pages.** The hand-off records Cloudflare as decided and proposes Workers
   with Static Assets over Pages. The site is prepared for Pages, as instructed. Nothing in
   the code depends on that choice: the output in `dist/` is plain static files.
2. **The GitHub repository is public.** Brand files and programme details in it are visible
   to anyone. A decision on visibility is needed before further material is added.

### Roles and navigation

3. Tabs follow the role table: participants see all five tabs; the two staff roles see home,
   sessions, project and `ניהול תוכן`; mentors see home, sessions and project. Journal,
   questionnaire and advisor are closed to non-participants, in the interface and in the
   database.
4. A sign-out link was added at the foot of the home screen. The design has none.
5. On screens wider than a phone the app is shown as a centred phone-width column. The
   content-management area uses a wider column.

### Sessions

6. A session counts as completed when staff mark it completed, or automatically from the
   day after its date.
7. The "next session" is the lowest-numbered session not yet completed, even if its date is
   undetermined; the home card then says the date is not yet set. On the day itself the card
   reads `היום`, the day before `מחר`.
8. Missing details are worded `נושא המפגש: טרם נקבע`, `תאריך: טרם נקבע`,
   `מיקום ומרצים אורחים: טרם נקבע`.
9. Session 02 was seeded as `Leaving Gravity · ODT`, gate 01, as it appears in the screens.

### Mapping questionnaire

10. Staff publish the questionnaire with a switch; it can be published only when all fourteen
    statements and the open question exist. Until then participants see `בהכנה`.
11. Answers save one by one. When the participant finishes, the round is locked and cannot
    be edited ("filled once").
12. The opening round does not close on the date of session 1; it stays available until it
    is completed. The closing round opens on the date of session 12 and is titled
    `מיפוי סיום המסע`.
13. `להיגד הקודם` and `להיגד הבא` links were added so that an answer can be reviewed before
    finishing.
14. On the leadership map the main button reads `חזרה ליומן המסע` rather than
    `שמירה וחזרה ליומן`, because nothing remains to be saved at that point.
15. With both rounds completed, the map shows the opening round as a dashed outline and the
    closing round as the filled shape, with a worded legend and both averages in the list.

### Journal

16. A station opens at 00:00 Israel time on its session's date. Reflection questions are
    hidden from participants by the database until then.
17. The north-star sentence is collected by a question of type `כוכב הצפון`, which staff
    place in any session. One version is kept per session; the journal shows the latest.
18. The reflection questions shown in design screen 10 were treated as illustrative and were
    **not** loaded, because the hand-off states that the questions are not included.
19. Station tags: `ייפתח ב־…` before the date, `פתוח לכתיבה` from the date, `נכתב` once
    anything has been written.
20. **Export** opens a print-ready summary (north star and its history, mapping averages and
    open answers, reflection answers) and uses the browser's print dialog to save a PDF.
    It is produced on the participant's device; nothing is sent to a server.
21. A reflection question that participants have already answered cannot be removed, only
    reworded.

### Advisor

22. The advisor is switched off by default and shows a "being prepared" state. The
    conversation screen is built and is visible in demo mode.
23. Conversations are held in memory for the current visit only and are not stored,
    pending the decisions on retention.

### Accounts

24. Minimum password length is 10 characters (to be mirrored in Supabase).
25. First-time password set-up uses the password-reset link. The screens for requesting a
    link and setting a password were added; the design has none.
26. A user of another NGG app who signs in without a Pisga membership sees a "no access"
    notice and no data.

## 3. Wording awaiting approval

All interface copy is in `src/content/strings.ts`.

- The Hebrew labels the hand-off marks as proposed (`יומן מסע`, `מיפוי נקודת היציאה`,
  `היועץ האישי`, `כוכב הצפון שלי`, `מפת המנהיגות שלי`).
- Wording added during the build: password screens, error and save messages, the
  closing-round labels, missing-detail labels, journal station tags, the export document,
  the "being prepared" states, and the whole content-management area.
- Session titles in English (`Leaving Gravity`) remain as supplied; the conflict with the
  rule against English names on participant-facing surfaces is still open.

## 4. Questions open since the hand-off

| # | Question | Effect on the build |
|---|---|---|
| 1 | Advisor: voice, written chat, or both | Decides the advisor screen, the data model for conversations and the Edge Function. The current screen assumes written chat |
| 2 | Approval of Hebrew labels; English session titles | Text changes in `strings.ts` and in the session data |
| 3 | Maccabi's approval of the branding; data location; sending programme content to an AI provider | Branding changes are confined to `src/theme/brand.ts`. Data-location requirements bear on the Supabase region and on the advisor provider; Cloudflare serves only the static files |
| 4 | Retention of advisor conversations at the provider | Must be settled before the advisor is switched on |
| 5 | Is the journal required on 30.12.2026 | The journal is built; reflection questions for session 1 must be entered before that date |
| 6 | E-mail service for password set-up and reset | Required before accounts are announced to participants |
| 7 | The domain | Needed for Cloudflare Pages, for Supabase redirect URLs and for the advisor function's allowed origin |
| 8 | The device participants mostly use | Desktop currently shows the phone layout in a centred column |
