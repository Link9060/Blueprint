# Blueprint Google authentication setup

These steps apply **only after** creating a dedicated Blueprint Supabase project. Do not reuse the Relay project's credentials.

## Google OAuth provider

1. Open the new Blueprint project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Open **Authentication → Sign In / Providers → Google** and note the Supabase callback URL.
3. In a Google Cloud project owned/approved by the school or authorized administrator, set up an OAuth consent screen and a **Web application** OAuth client. Enter the exact Supabase callback URL as the authorized redirect URI. School-managed Google accounts may require Workspace administrator approval.
4. Copy the Google OAuth **client ID** and **client secret** into the Blueprint **Supabase authentication provider settings**. The client secret stays in Supabase/Google admin settings only.
5. In **Authentication → URL Configuration**, set the **Site URL** to \`https://link9060.github.io/Blueprint/\` and add that same exact address to allowed redirect URLs.
6. Obtain the **Project URL** and a browser-safe **publishable** API key from the Blueprint Supabase project settings.
7. Populate \`site/config.js\` with those two public client values. **Never add a service-role key or Google client secret to GitHub Pages.**
8. Wait for your GitHub Actions Pages deployment to succeed, then sign in and request membership. The first admin must be bootstrapped by an authorized adult using the reviewed instructions in \`docs/SETUP.md\`.
9. Test signed-out, pending, rejected, normal member, lead and administrator experiences with separate test users.

## Before students use Blueprint

Require school/mentor approval, review FIRST youth protection policies, and add incident-reporting and moderation workflows for communication features. Google sign-in validates identity, but does not imply team authorization. Authorization lives in the membership table and its row-level security policies.

No live Supabase project or Google OAuth provider is connected to the preview until these steps have been performed.
