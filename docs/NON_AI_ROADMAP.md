# Blueprint: remaining non-AI development

**Current build:** teams 1810 and 9316. The dedicated Supabase project is separate from Relay, ARROW and all other projects.

## Delivered through v6

- Google/email authentication flows and verified, team-scoped Owner role
- Membership approval and member roles, including visual-only role inspector
- Tasks, projects, build logs, announcements, calendar, subgroup channels
- Self-owned profile and team directory customization
- Admin-only message reporting/review, hide/restore, and append-only activity history
- CAD/drawing/document/code links on subsystem projects
- Manufacturing request board with team Lead-controlled progress
- Shared inventory catalog with quantity-on-hand, reorder thresholds and storage locations
- Project-specific bills of materials, combined team demand and shortage calculations
- Project milestones with due dates, status tracking and owner-level activity auditing
- Automated JavaScript and PostgreSQL RLS isolation tests

## Pilot-readiness gates (high priority)

1. **Separate accounts:** Test at least one Member, Lead, Admin and an unapproved applicant. Ensure both team IDs isolate all records including reports, project references and manufacturing requests.
2. **Mentor oversight:** Agree who checks the report queue, how quickly reports are reviewed, how students contact a trusted adult, and how records should be retained or removed.
3. **Account recovery:** Handle lost access, duplicate Google/email identities, role changes, revoked memberships, and malicious/suspicious new account requests without putting an Owner override in browser code.
4. **Manual QA:** Test on iPhone/Android/desktop, slow connections, browser back/forward, reload during forms and long messages, and keyboard/screen-reader navigation.
5. **Data lifecycle:** Establish export and retention/deletion policies and safe handling of messages and student names.

## Engineering functionality to build after the pilot foundation

- Task dependencies, milestone dependencies, project checklists and responsibility handoffs
- Versioned CAD drawings, revision approvals, and private file storage with scoped permissions
- Stock movements, inventory adjustments history, supplier details and part request-to-inventory links
- Build/test gates, measurements, test results, and documented engineering change requests
- Event and competition preparation: deadlines, checklists, pit tasks, packing lists, meeting reminders
- Optional notifications, unread indicators, and user-controlled quiet settings

## Important limits

- CAD references are **links**, not file uploads; an external CAD service controls its own sharing.
- Moderation is **manual**; reports are not automatically escalated or emailed.
- The activity log tracks current action types, not every field edit; it is not a complete legal retention or incident management system.
- Stock is counted manually and BOM demand is planned, not reserved. Creating a manufacturing request or marking it complete does not change catalog quantities or initiate purchases.
- Role previews change only the interface; only separate signed-in users test the actual database policies.
- AI features and AI-generated reports are **not** part of this work.
