# Blueprint premium interface system (v8)

## Goal

Keep the serious, high-clarity monochrome drafting-table aesthetic. Motion should explain interaction, not interrupt work.

## What changed

1. Workspace renders reconcile the existing DOM instead of rebuilding #app HTML after every click. The content container uses a stable view key. Route changes replace only the view and animate into place, while ordinary edits preserve the sidebar, scroll and unchanged controls.
2. A brief checkmark spring and radial ray burst appears only after a task or assigned checklist item successfully transitions to Done, not before a backend write has succeeded.
3. Button click ripples and pointer proximity are delegated from the persistent #app root. This avoids installing fresh listeners per component render. Pointer effects use requestAnimationFrame and only run with a fine pointing device and no reduced-motion request.
4. The Overview drafting compass tracks nearby mouse movement with a bounded 16 px displacement, and can be clicked or keyboard-activated to pulse.
5. Keyboard focus rings, aria-pressed for completion buttons, and accessible toast announcements support non-pointer navigation.

## Guardrails

- No new database tables or API privileges; only frontend code and CSS changed.
- No audio, third-party animation library or remote tracking.
- Do not replace every section with an animation on routine state updates.
- Respect prefers-reduced-motion; the site stays fully usable without animations.
- Keep all editable forms mounted during background updates so user-entered drafts are not lost.
- Always test on touch/mobile plus macOS desktop before broad student rollout.
- No AI integrations or autonomous processing were changed.

## Tests

The test suite checks persistent shell node identity, keyed task reorder, draft preservation, correct success animation gating, and existing role-dependent workspace behavior. These are automated tests, not a full production-browser usability test.
