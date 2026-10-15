# DEBATRIX — first complete rebuild

A responsive debate/MUN preparation site with a local-first guest mode, preparation history, export/print, and group workspace. The Groq API key is used only by the serverless function in `api/groq.js`; never put it in `app.js` or browser code.

## 1. Deploy the site

1. Upload these files to the root of your GitHub repository, keeping the `api` folder.
2. Import the repository into Vercel.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `GROQ_API_KEY` = your Groq API key
   - Optional: `GROQ_MODEL` = `llama-3.3-70b-versatile`
4. Redeploy after adding variables. Do not commit your API key to GitHub.
5. Open the Vercel URL. Debate Prep and Model UN call `/api/groq`.

The home page, history, print/download, and group workspace run in guest mode without API credentials. AI generation needs the server-side Groq key.

## 2. Accounts and real cross-device collaboration (Supabase)

The UI has optional Supabase authentication hooks, but live multi-device group sync requires a database schema and row-level security. Until this is configured, group workspaces are intentionally local to the current browser; invite codes do not magically sync between devices.

1. Create a Supabase project and enable email/password authentication.
2. In `app.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the project URL and public anon key. Never use a service-role key in the browser.
3. To turn on true shared workspaces, create tables with appropriate row-level security and update the group data layer to use them. Suggested schema:

```sql
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  motion text default '',
  purpose text default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

**Security warning:** Do not enable public write access on these tables. Before using with real users, enable RLS and add policies so only authenticated workspace members can read/write workspace data, and only owners can change membership. The local-first UI in this starter does not yet call these tables, so account sign-in alone does not mean live collaboration is enabled.

## Current working features

- Responsive DEBATRIX landing page and debate/MUN forms
- Server-side Groq generation endpoint with helpful error states
- Guest-mode preparation history stored in the browser
- Print and Markdown download
- Group workspace UI: create group, local invite code, task list, argument board, team brief
- Optional Supabase email/password auth wiring

## Before a public launch

Add the Supabase group data layer and RLS policies, then test auth, invite acceptance, simultaneous edits, API error handling, and mobile layouts. Add rate limits to the AI endpoint to control API spend. Verify all facts and sources from generated preparation before using them in competition.
