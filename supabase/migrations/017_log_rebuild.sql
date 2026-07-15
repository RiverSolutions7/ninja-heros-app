-- 017: log-flow rebuild — new-card fields + extensible types
-- Single-gym now, tenancy-ready: columns/tables are designed so gym_id bolts on later
-- without rework (add gym_id uuid + RLS predicate; no shape changes needed).
-- Applied via the Supabase MCP after River's approval (the chunk-5 gate).

-- Structured-set fields from the develop parse (ledger §4).
-- setup_steps: ordered step strings. cues: the "Coach's cues" text.
-- duration_minutes + equipment already exist and stay as hidden data fields.
-- photos text[] already exists and stays: ordered, first = cover.
alter table public.components
  add column if not exists setup_steps jsonb not null default '[]'::jsonb,
  add column if not exists cues text;

-- Extensible types (ledger §1: defaults + gyms add their own; a type = name +
-- monogram + plannable flag, NOT a per-type schema). Seed rows cover the shipped
-- defaults so the picker reads from one place. Coach Tip / Link ship later.
create table if not exists public.component_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monogram text,                          -- custom types: auto first letter; null for defaults
  plannable boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.component_types enable row level security;
create policy "component_types open" on public.component_types
  for all using (true) with check (true);  -- matches the app's current no-auth posture

insert into public.component_types (name, plannable, is_default, sort_order)
values ('station', true, true, 0), ('game', true, true, 1), ('warmup', true, true, 2)
on conflict (name) do nothing;

-- Custom types must be storable on components: replace the hard 3-value check
-- with a non-empty guard (type names are validated against component_types in app code).
alter table public.components drop constraint components_type_check;
alter table public.components add constraint components_type_check
  check (length(trim(type)) > 0);
