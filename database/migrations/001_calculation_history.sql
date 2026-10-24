create table if not exists public.calculation_history (
  id uuid primary key default gen_random_uuid(),
  left_value double precision not null,
  operation text not null check (operation in ('add', 'subtract', 'multiply', 'divide', 'percentage')),
  right_value double precision not null,
  result double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists calculation_history_created_at_idx
  on public.calculation_history (created_at desc);

alter table public.calculation_history enable row level security;
-- Access is through the .NET API using a server-only database connection string.
-- No browser-facing policies are created for this private log table.
