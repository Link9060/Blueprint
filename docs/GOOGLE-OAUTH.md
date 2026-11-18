# Blueprint Google sign-in

Blueprint uses its **dedicated** project [Resonant. Blueprint](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce). Do not reuse Relay's OAuth secret.

## One-time owner/mentor steps

1. In the Blueprint [Supabase Auth providers](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/providers), open **Google** and note its exact Supabase callback URL.
2. In a Google Cloud project controlled by an authorized team/school administrator, configure an OAuth consent screen and a **Web application** OAuth client. If required, the school's Google Workspace admin must approve the app.
3. Add the exact Supabase callback URL as an **authorized redirect URI** in Google Cloud. This is **not** the GitHub Pages URL.
4. Save the Google **client ID** and **client secret** in the Supabase Google provider configuration. Do not put the secret in \`site/config.js\`, GitHub, or a public webpage.
5. In [Supabase Auth URL configuration](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/url-configuration), use \`https://link9060.github.io/Blueprint/\` as Site URL and as an allowed Redirect URL.
6. Test with an approved, non-admin test account, then with a pending member.

The frontend's **Continue with Google** button is already coded, but the provider cannot be activated through the currently connected database/GitHub tools. Only the authorized dashboard owner can complete the OAuth credential setup.

For initial testing without Google, the frontend also offers an email sign-in link. It likewise requires the correct Site URL and redirect allowlist.

**Privacy:** Google sign-in proves a Google account controls an identity; it does not grant team membership. Every new account remains pending until an approved administrator verifies and authorizes it.
