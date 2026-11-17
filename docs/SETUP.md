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

Do not use the existing **Relay** or other existing app's database. Blueprint should have its own project.

1. Open https://supabase.com/dashboard and create a new project named **Blueprint**. Review any pricing/plan limit before creating it.
2. In the new project's SQL editor, review and execute **database/schema.sql**. It creates teams, profiles, pending memberships, tasks, build logs, projects, messages and events. Every public table has RLS enabled and is permission-scoped.
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

An approved admin can authorize others in the database. The first release does **not** yet provide an admin review panel; approval must be performed through a trusted Supabase admin console. Do not promote students or mentors without the team's agreed governance.

## 5. Features and boundaries

**Available in demo:** team switch, dashboard, tasks and completion, build log entry creation, messages, subsystem cards, member directory, schedule and settings.

**Available after Supabase setup:** Google sign-in, self-service membership request, pending/approved check, approved team-scoped data fetching, role-checked task creation and completion, lead-authored build entries, and team messaging. This first connector fetches messages on navigation/reload and does not yet subscribe to Realtime.

**Not implemented yet:** approval UI, file upload, notifications, email/SMS delivery, nightly AI reports, inventory, scouting integration, advanced task dependencies, moderation tools, task assignment UI, actual CAD file processing.

## 6. Safeguards before real use

- Get school and mentor approval for student data collection, messaging and access policies.
- Confirm FIRST youth-protection policies; begin with visible subgroup channels rather than private adult-student direct messages.
- Use only necessary student details and protect team membership lists.
- Review RLS with more than one test account, including a pending member and members of opposite teams.
- Add moderation, reporting and audit trails before broad rollout.
- Keep any future AI output reviewable, grounded in verified records, and explicitly labeled.
- Do not add a Supabase service-role key or OAuth client secret to GitHub Pages.
