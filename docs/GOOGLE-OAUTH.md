# Google sign-in for Blueprint

The website already contains the **Continue with Google** button, but Google OAuth cannot finish until an authorized Google Cloud/Supabase administrator supplies client credentials in their dashboards.

## Exact URLs

**Supabase Site URL and allowed app Redirect URL:**
```text
https://link9060.github.io/Blueprint/
```

**Google Cloud Authorized JavaScript origins:**
```text
https://link9060.github.io
```

**Google Cloud Authorized redirect URI:**
```text
https://weaytuxrcanwdbpcmlce.supabase.co/auth/v1/callback
```

Verify the redirect callback shown on the Supabase provider configuration screen before using it.

## One-time steps

1. Open [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience) and set up an authorized consent screen and test audience. School-managed accounts may require Workspace administrator approval.
2. Open [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients) and create an OAuth client ID of type **Web application**. Enter the JavaScript origin and redirect URI above in their respective fields.
3. Enter the generated **Client ID and Client Secret directly into the [Blueprint Supabase Google provider](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/providers?provider=Google)**. Enable and save the provider.
4. In [Supabase Auth → URL Configuration](https://supabase.com/dashboard/project/weaytuxrcanwdbpcmlce/auth/url-configuration), set the Site URL and allowed Redirect URL to the Blueprint website address above.
5. Visit https://link9060.github.io/Blueprint/, select your team, and click **Continue with Google**. It should return to Blueprint and show the membership-request screen.
6. Complete the verified first Owner bootstrap described in [SETUP.md](./SETUP.md). Google authentication does not automatically grant team access.
7. Have separate test users sign in and request access. Every new member must remain pending until approved.

Never put the Google Client Secret into GitHub, a public JavaScript file, or this conversation. Use a school-approved Google Cloud account and do not bypass school account restrictions.

Google provider reference: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
