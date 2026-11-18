# Blueprint

A focused, quietly designed workspace for FRC robotics teams **1810** and **9316**.

**Website:** https://link9060.github.io/Blueprint/  
**Dedicated Supabase:** `Resonant. Blueprint` (`weaytuxrcanwdbpcmlce`)

## Live foundation

- Private team selection and role-aware member access
- Google sign-in integration (requires Google OAuth provider setup) and email magic-link option (requires redirect allowlisting)
- New memberships start **pending** until a trusted team administrator approves them
- Protected **Owner** role above Admin, provisioned only through verified trusted administration
- Visual-only **role inspector** for Owner and demo, switching among Admin, Captain, Mentor, Lead, and Member
- Team dashboards with tasks, owners, priorities, statuses, due dates and progress
- Build logs and subsystem project creation/editing, including updates by Leads, Mentors, Captains, Admins and Owners
- Calendar event editing by the same leadership roles, with edit attribution
- Personal profile editor: display name, team subgroup, short headline/bio, and selectable avatar colors
- Team announcements, meeting and event scheduling
- Team-scoped channels, with RLS-protected Supabase Realtime updates
- Approved member directory and administrator approval/role editor
- Fictional sample workspace available without signing in
- Responsive dark sidebar + light workspace with understated drafting animations, and reduced-motion support

**Important:** Connecting the database does not mean onboarding is complete. See **docs/SETUP.md** for the remaining authentication configuration and authorized first-admin setup. User-facing flows must be tested with separate test accounts before handling real student data.

## Architecture

| Layer | Location |
|---|---|
| Static frontend | `site/index.html`, `site/app.js`, `site/styles.css` |
| Supabase adapter | `site/supabase.js` |
| Browser-safe project configuration | `site/config.js` |
| Fictional preview fixtures | `site/data.js` |
| Base team/RLS schema | `database/schema.sql` |
| Announcements and realtime extension | `database/upgrade_v2.sql` |
| GitHub Pages deployment | `.github/workflows/pages.yml` |
| Automated CI | `.github/workflows/ci.yml`, `tests/` |

The site uses a pinned browser version of supabase-js. Its publishable key is public by design; no service-role key or Google OAuth secret belongs in the repository. All real team data is protected by database row-level security and role restrictions.

## Tested

CI runs JavaScript syntax and interface smoke tests, fixture separation checks, and a temporary PostgreSQL database with simulated Supabase Auth. It applies both schema files and checks permissions for pending members, approved members, team leads, administrators and users on opposite teams.

These tests do **not** replace real-browser tests, real Google/email provider verification, or school mentor approval.

## Profile privacy and access

Approved teammates can see a member's chosen name, headline, bio, avatar color, and subgroup. Email addresses remain private in Supabase Auth. Members can edit their own profile and approved-team subgroup, not roles or permissions. Managers can edit log/event contents but original authorship is retained, with edits attributed to the editor. Role previews remain visual and read-only.

## Non-AI engineering and safety release (v5)

- **Message safety:** Approved teammates can privately report a channel message; reports are visible only to the reporter and their team administrators. Admins can mark reports reviewed/dismissed and hide or restore messages without destroying the originals.
- **Team audit history:** Moderator actions, CAD link changes, and fabrication status changes are recorded with actor and timestamp. Only team administrators can read the append-only history.
- **Engineering references:** Team Leads and above can attach or remove HTTPS CAD/drawing/document/code references on subsystem project cards. Links open externally; no uploaded files or third-party integration credentials are stored.
- **Manufacturing requests:** Any approved teammate may submit a part request. Leads/Mentors/Captains/Admins/Owners can update status from requested to completed or on hold.
- **Security:** New rows are team-scoped, with Postgres RLS and automated cross-team permission tests. Report details are never pushed to the team-wide realtime feed.

See [the non-AI roadmap](docs/NON_AI_ROADMAP.md) for remaining work and launch gates. Real-account integration, school/mentor moderation practices and usability testing are still required before opening to an entire student team.

## Next milestones

1. Run real-account checks for Google/email sign-in, membership approval and cross-team security using independent student/mentor test accounts.
2. Add moderation policies, report notifications for authorized mentors, admin recovery, and a clear retention policy.
3. Add true unread message counts, optional team notifications and reversible message corrections.
4. Add project dependencies, milestones, BOM/inventory and competition-prep checklists.
5. Add permission-controlled storage or CAD-provider integrations after privacy and access reviews.
6. Finish mobile/browser usability, accessibility, test coverage and monitored pilot rollout.
7. AI is excluded from the current development scope.
