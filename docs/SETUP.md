# Blueprint setup & launch

## 1. Publish the website using GitHub Actions

Repository: https://github.com/Link9060/Blueprint

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to **Actions → Publish Blueprint**. Run the workflow manually if a run is not already queued by the latest main push.
4. The expected website address is **https://link9060.github.io/Blueprint/**.
5. If GitHub Pages has not been enabled, deployments may fail until the repository Pages source is selected.

The workflow checks the JavaScript syntax and deploys the static **site/** folder. No Node dependencies or build tokens are needed.

## 2. Review the preview

The page initially displays two workspaces with **fictional sample content**. The sample tasks, logs and messages can be edited, but are saved only in browser localStorage. Nothing is shared, emailed or sent to Supabase. Use **Settings → Reset preview** to restore the fixture data.

The site is built as a proof-of-concept interface and foundation, not a production system for student information. No real membership approvals or messages should be used until school/mentor review.

## 3. Set up a *separate* Supabase project

**Account limit:** On November 16, 2026 Supabase refused creating `Blueprint` at the quoted $0/month cost because the account already had its maximum two active free projects. The existing `Relay` and `Link9060's Project` projects were left untouched. A free slot would require the owner's explicit decision to pause/delete an existing project, or moving to an eligible paid plan. Do not pause an app's database without confirming it is safe to interrupt.


Do not use the existing **Relay** or other existing app's database. Blueprint should have its own project.

1. Open https://supabase.com/dashboard and create a new project named **Blueprint**. Review any pricing/plan limit before creating it.
2. In the new project's SQL editor, review and execute **database/schema.sql**. This SQL is also run by GitHub Actions against a disposable PostgreSQL database with simulated auth roles and RLS tests. It creates teams, profiles, pending memberships, tasks, build logs, projects, messages and events. Every public table has RLS enabled and is permission-scoped.
3. In **Authentication → Providers**, configure **Google** OAuth using the Google Cloud client ID and secret. Never put that secret into GitHub or frontend files.
4. In **Authentication → URL Configuration**, set the Site URL and add redirect URL:
   https://link9060.github.io/Blueprint/
   Add localhost URLs only if testing locally.
5. Copy the new project's **Project URL** and **publishable key** from the Supabase dashboard into **site/config.js** in the repository. A publishable key is meant for browser apps, but a **secret key / service-role key must NEVER be exposed**.
6. Commit the config update. The GitHub Pages workflow republishes the site.

When configured, users authenticate with Google, request membership in 1810 or 9316, and remain blocked from private team data until approved. Even if someone edits the browser UI, server-side policies reject unauthorized reads and writes.

## 4. Bootstrap the first approved administrator

The initial admin must be promoted using a trusted SQL-editor action, not via an open signup. This is intentionally not automatic.

1. Sign in on the website with Google and request membership in your correct team.
2. Have the school's authorized adult/mentor open the **Blueprint** Supabase SQL Editor.
3. Identify the new account's UUID in **Authentication → Users**.
4. Carefully execute the statement below using the verified UUID and team ID:

    update public.team_memberships
    set role = 'admin', status = 'approved'
    where team_id = '1810' and user_id = 'REPLACE_WITH_AUTH_USER_UUID'::uuid;

5. Sign in again or use **Check again** to refresh membership.

An approved admin can now open **Membership** in Blueprint's sidebar to review pending members, approve or reject requests, and assign access levels. The initial admin must still be bootstrapped manually. Verify every applicant's identity with an authorized school mentor before approving, especially anyone requesting elevated roles.

## 5. Features and boundaries

**Available in demo:** team switch, dashboard, tasks and completion, build log entry creation, messages, subsystem cards, member directory, schedule and settings.

**Available after Supabase setup:** Google sign-in, self-service membership request, pending/approved check, administrator approval panel, approved-team directory, role-checked task ownership and editing, lead-authored build entries, and channel messaging. This first connector fetches messages on navigation/reload and does not yet subscribe to Realtime.

**Not implemented yet:** approval UI, file upload, notifications, email/SMS delivery, nightly AI reports, inventory, scouting integration, advanced task dependencies, moderation tools, task assignment UI, actual CAD file processing.

## 6. Safeguards before real use

- Get school and mentor approval for student data collection, messaging and access policies.
- Confirm FIRST youth-protection policies; begin with visible subgroup channels rather than private adult-student direct messages.
- Use only necessary student details and protect team membership lists.
- Review RLS with more than one test account, including a pending member and members of opposite teams.
- Add moderation, reporting and audit trails before broad rollout.
- Keep any future AI output reviewable, grounded in verified records, and explicitly labeled.
- Do not add a Supabase service-role key or OAuth client secret to GitHub Pages.

## 7. Test before live student onboarding

- Verify the GitHub Actions **Blueprint CI** result for every proposed change.
- Using a separate non-production Supabase test project, sign in with at least an admin, a pending member, a normal approved member, and an approved member of the opposite team. Verify that cross-team reads and edits are denied.
- Confirm that normal members cannot change task assignment, priority or role; only assigned members can change their own task status, and only admins can approve membership.
- Check mobile usability, keyboard navigation and reduced-motion preferences before release.
- Get mentor/school authorization and implement audit and abuse-reporting controls before connecting real student records.

## 8. Database validation in CI

On each `build/**` branch push or pull request to `main`, **Blueprint CI** runs two jobs:

- `test`: JavaScript syntax, mock data isolation and static schema expectations.
- `database`: PostgreSQL 16 with a small simulated Supabase Auth environment. It runs `tests/bootstrap.sql`, applies `database/schema.sql`, and executes `tests/security.sql` to check access boundaries and safe task edits.

The database CI tests passed on the readiness branch. **These do not prove real Supabase OAuth or every permission scenario.** Once the dedicated project is created, verify the actual policies with separate Google accounts, run Supabase Security Advisors, and obtain mentor approval before onboarding students.
