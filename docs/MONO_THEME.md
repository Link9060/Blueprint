# MONO visual system for Blueprint Teams

This theme adapts the **MONO** demo in [Blueprint Archive](https://github.com/Link9060/Blueprint-Archive/tree/main/templates/mono) to the existing robotics workspace.

## Scope

- Warm off-white paper background; crisp near-black type, outlines, and controls.
- Unrounded navigation, cards, inputs, tabs, and buttons.
- Dark-on-light active navigation, stark statistic numerals, and uppercase editorial headings.
- Theme covers team selection, sign-in, approval screens, Overview, Tasks, Logs, Projects, Manufacturing, Inventory, Messages, Calendar, Members, Profile, Membership, Moderation, Settings, and dialogs.
- Subtle interaction and drawing animations still work. Reduced-motion rules remain in place.
- Status colors are intentionally muted but distinct for **in progress**, **complete**, and **blocked**; profile avatar swatches retain their actual colors to keep the selection meaningful.

## Implementation

The `site/index.html` loads `styles.css` first, then `mono-theme.css`.

The new stylesheet **overrides only presentation**. No JavaScript, authorization, navigation, state, database, OAuth, or event-handler changes were needed. Existing responsive breakpoint and independent scroll layout constraints remain in `styles.css`.

### Design tokens

| Token | Value | Purpose |
| --- | --- | --- |
| Ink | `#191b1a` | Text, active controls, strong rules |
| Background | `#eae9e4` | Main and landing canvas |
| Card | `#f6f5ef` | Cards, inputs, dialogs |
| Sidebar | `#deddd5` | Navigation background |
| Divider | `#b9b9b2` | Structural borders |
| Secondary text | `#646a65` | Helper and metadata text |

### Maintenance

Keep the base CSS as the application's structural stylesheet and put any new MONO-specific colors, corners, or typography in `site/mono-theme.css`. Existing `styles.css` motion, forms, grid layouts, scroll mechanics, and media breakpoints should remain unchanged unless necessary for an actual feature.

## Verification

- Existing CI JavaScript/data/render/layout/security tests still apply.
- Review the app on desktop and mobile before giving it to teams.
- Check the signed-out landing, preview workspace, task checkmark animations, side navigation, forms, dialogs, role inspector, and permission-specific screens.
- Verify color contrast and focus visibility on both hover-capable and touch devices.

The theme is cosmetic; it does **not** expand access to private student/team records.
