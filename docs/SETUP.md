# Blueprint | Production setup

**Supabase project:** [Resonant. Blueprint](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce)  
**Repository:** https://github.com/Link9060/Blueprint  
**Site:** https://link9060.github.io/Blueprint/

## Already completed

- The new dedicated Supabase project is created and marked `ACTIVE_HEALTHY`.
- `site/config.js` points to that project using its browser-safe publishable key.
- Applied two application database migrations to the dedicated project:
  - `blueprint_core_teams_membership_and_workspace_v1`: teams, profiles, memberships, tasks, projects, logs, messages, events, authorization routines and RLS.
  - `blueprint_announcements_project_events_realtime_v2`: announcements, manager editing policies, Realtime publication.
- Created teams 1810 and 9316. No real users, student details, tasks or messages were seeded by the migration.
- Verified anonymous table reads are revoked and RLS is on for all team tables.
- Restricted the Supabase-provisioned `public.rls_auto_enable()` event-trigger function from `anon` and `authenticated` role execution; Supabase Security Advisors then reported no findings.
- Automated CI tests include browserless interface checks and simulated PostgreSQL RLS checks.

## Step 1: Allow Blueprint authentication redirects

Open the project's [Authentication URL configuration](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/url-configuration).

Set **Site URL** to exactly:
```
https://link9060.github.io/Blueprint/
```
Add this **Redirect URL** to the allowlist as well:
```
https://link9060.github.io/Blueprint/
```
Both Google OAuth and emailed sign-in links need an allowed application return URL. These settings have **not** been changed by the GitHub/database tools. Do not add arbitrary wildcard redirects.

## Step 2: Configure sign-in

Email magic-link support is implemented. Confirm the email provider is enabled in [Authentication Providers](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/providers) and that the verification template is appropriate for the project. Test with an account you control.

For **Continue with Google**, an authorized school/organization owner must set up a Google OAuth Web client and enter its client ID and client secret in the **Supabase Google provider settings**. See `docs/GOOGLE-OAUTH.md`. Never add the Google secret to this repository.

## Step 3: Verify and bootstrap an Owner

Blueprint's Owner tier is above Admin. Owners have the top role only within teams that explicitly grant Owner membership. No public user can promote someone to Owner or demote an Owner.

**The Blueprint project currently has no registered accounts. Never automatically promote the first visitor.**

1. Sign into Blueprint with Google or verified email, select the correct team (1810 or 9316), and request team membership.
2. Have an authorized mentor verify the account identity outside Blueprint. In [Supabase Authentication → Users](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/users), find its verified user UUID.
3. In the trusted [Supabase SQL Editor](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/sql/new), replace the UUID placeholder and choose the correct team ID:

```sql
update public.team_memberships
set role='owner', status='approved'
where team_id='1810'
  and user_id='REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid
  and status='pending'
returning team_id, user_id, role, status;
```

4. Confirm exactly one returned row has role `owner` and status `approved`. In Blueprint, click **Check again**.
5. For team 9316, request membership separately and obtain its authorized team approval. Owning one team never bypasses the other team's private data boundary.

**Owner role inspector:** In the left sidebar or Settings, choose Admin, Captain, Mentor, Lead, or Member. The Owner view is your actual role. Previews are **visual and read-only**, not real permission changes. Use separate test accounts to verify backend RLS.

### Team hierarchy

- **Owner:** Highest access in an authorized team; protected from in-app promotion and demotion
- **Admin:** Can review and approve memberships and assign regular roles
- **Captain, Mentor, Lead:** Manage tasks, projects, announcements, logs and team schedule
- **Member:** Read approved-team information, send team messages, update assigned task status
- **Pending:** No access to private team records until approved

## Step 4: Verify before real team rollout


Use multiple separate test accounts. Confirm:

- Signed-out visitors and pending members cannot view private team records.
- Team 1810 cannot view Team 9316's messages, tasks or directory.
- A normal member can only update assigned task status, and cannot create projects, edit other assignments or approve users.
- An administrator can review pending members and change ordinary roles only in their own team. Neither admins nor owners can change Owner assignments from the browser.
- Google/email sign-in returns to the correct Blueprint URL.
- Team updates synchronize across two signed-in browsers without exposing data to the wrong account.
- Keyboard/mobile layouts and reduced-motion animation remain usable.

School/mentor authorization and youth-protection review, including moderation/reporting, are necessary before broad student use. No direct messaging between adults and minors, external email broadcasts, AI reports or automatic notifications are enabled in this release.

## Troubleshooting

**Sign-in link goes to localhost:** Set both the Supabase Site URL and allowed Redirect URL in Step 1.

**Google button fails:** Google provider credentials are not configured, are restricted by the Google Workspace administrator, or the callback URI does not match.

**Your request is stuck pending:** A verified administrator must approve your specific team membership. This is expected, not a database error.

**Workspace is empty:** The live database starts blank by design. Use **Explore sample workspace** for fictional data or create real projects after an administrator approves the account.

**No new messages appear until refresh:** Realtime uses authenticated Postgres Changes, and requires a successful subscription and RLS authorization. Check the database connection and browser network conditions.

**Permissions error:** Do not add a service-role key to the client or disable RLS. Verify the user's membership role and team ID.
