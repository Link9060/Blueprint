# Blueprint

A quieter, more organized place to build robots.

Blueprint is a browser-based robotics team workspace for FRC teams **1810 (CATATRONICS)** and **9316 (CUBATRONICS)**. It is designed around real engineering work: tasks, subsystem progress, build logs, announcements, scheduling, and subgroup conversations.

## First-release features

- Team selection and a responsive, accessible workspace
- Overview dashboard, task ownership and due dates, role-aware editing, and a personal task view
- Structured build logs and robot subsystem cards
- Subgroup discussion channels and team directory
- Calendar and workspace settings
- Fast drafting-style line animations with reduced-motion support
- Local demo data so teams can review the design safely
- Optional Supabase adapter with Google OAuth, administrator membership approval, team directory and RLS
- GitHub Actions workflow to publish the static site to GitHub Pages
- PostgreSQL integration tests that apply the schema and verify team/member access boundaries in a temporary CI database

**Important:** The public preview defaults to fictional data. It is **not** connected to your real team's information. Until a dedicated Supabase project is configured, Google sign-in and live collaboration are not active. Chat in preview is local to your browser.

## Preview

After enabling GitHub Pages with **GitHub Actions** as the source:

https://link9060.github.io/Blueprint/

Source: https://github.com/Link9060/Blueprint

## Architecture

- **Frontend:** dependency-free HTML, CSS and ES modules, hosted on GitHub Pages
- **Presentation:** site/app.js and site/styles.css
- **Demo store:** site/data.js, isolated per team in localStorage
- **Production adapter:** site/supabase.js, SDK loaded only if configured
- **Schema:** database/schema.sql with row-level security on every public table
- **Automation:** .github/workflows/pages.yml

This lean first release avoids build dependencies and gives the team a stable Pages deployment. The data and presentation layers are deliberately separated to allow future expansion.

See **docs/SETUP.md** for publication, secure Supabase setup and the next milestones.

## Roadmap

1. Review UI with mentors and team leads.
2. Set up a dedicated Supabase project and approve initial administrators.
3. Add real-time subscriptions, announcements, audit history and moderation controls.
4. Add CAD links, inventory, manufacturing handoffs, competition mode and structured nightly summaries.

Team member safety and access control are prerequisites before using Blueprint with real student data.

## Quality gates

In addition to the JavaScript and fixture tests, the `database` CI job runs PostgreSQL 16, installs the schema, then checks member/admin/pending-team isolation, task status authorization and cross-team message denial. This is a simulated Supabase auth environment, not a live Supabase project.


`Blueprint CI` validates JavaScript syntax, deterministic demo isolation, and key schema security assumptions on development branches and pull requests. The `Publish Blueprint` workflow runs the same checks before deploying `main`. It cannot replace a real multi-account Supabase authorization test, which is required before onboarding students.
