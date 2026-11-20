# Blueprint Teams v8: Lead tools, messaging, secure onboarding

## Delivered

- **Chat:** a consistent scrolling message panel, multiline composer, Enter-to-send / Shift+Enter-for-newline, bottom anchoring when following the newest messages, own-message styling, and a submission guard to prevent accidental double sends. This is ordinary HTML/CSS and remains fast.
- **Announcements and build logs:** Leads and above can remove entries after confirming. The database records a minimal append-only deletion audit (who, action, team, record ID and time) without exposing removed text.
- **Moderation:** Leads, Captains, Mentors, Admins, and Owners can review private message reports, hide/restore content, and see audit activity. Members can report but cannot see the team-wide report queue or hidden content.
- **Team Directory:** leaders can change eligible teammates' roles. The backend prevents changes to the Owner tier, self-promotion, promotions above the actor's tier, and edits to equal/higher-tier peers. Role requests from members can be reviewed by leaders with sufficient authority.
- **Sign-in:** verified Google accounts whose email domain is *explicitly allowlisted for that team by a trusted administrator* may automatically join as basic Members, without a separate approval stage. All other Google or email accounts retain a private request flow.
- **Layout:** the team-picker and brand area no longer shrink into a clipped row when the navigation fills the sidebar; the sidebar scrolls independently on smaller screens.

## Database prerequisite

The schema changes live in `database/upgrade_v8_lead_workspace.sql`.
They have been applied to the connected **Resonant. Blueprint** Supabase project.

The allowlist starts **empty** on purpose. Logging in with a random Google account is not proof of membership in a school robotics team. **Do not add gmail.com or other public email providers**.

Once the team's *official verified email domain* has been established, a trusted database administrator can add a team-specific row in `private.blueprint_google_domains`. This should be verified with the team/mentor first. It is not editable from the client and cannot be bypassed by setting browser user metadata. The effective backend policy checks the verified email and linked Google identity and permits only `role=member, status=approved`.

When a requested domain is not allowlisted, the user may still sign in, but private team content will remain inaccessible until approval. Avoid broad auto-enrollment when students' names, schedules, and private team discussions are stored here.

## Access boundaries

- Leaders can manage project work, engineering logs, events, stock and planning as before.
- Deletions and moderation are enforced by Supabase RLS and triggers, not just hidden buttons.
- Owners cannot be promoted or demoted from the browser.
- Only Admin/Owner may change membership status. Leads can adjust roles only within their delegation tier.
- User email addresses are not displayed in team directories.

## Testing

- `tests/lead_workspace_security.sql` checks that random/unverified Google identities cannot join, approved domains grant only Member, role escalation/self-promotion are rejected, and deleted records are audited.
- `tests/roles.test.mjs` checks the UI's role hierarchy.
- Existing render, layout, database, profile and RLS suites continue to run.

### Manual browser QA recommended

1. Re-test the top-left selector at 700px to 1300px widths.
2. Send messages, use Enter/Shift+Enter, switch between channels, test local scroll anchoring.
3. Verify Lead vs Member moderation screens with separate actual test accounts.
4. Remove one test announcement and log, check that they disappear and audit events are present.
5. Submit a role request, approve it using a separate appropriately authorized account, and confirm other roles cannot elevate themselves.
6. Test Google onboarding on both allowlisted and non-allowlisted test identities before enabling a whole school domain.

**Important:** The checked-in demo isn't evidence that external identity providers or live team access have been verified in a real browser.
