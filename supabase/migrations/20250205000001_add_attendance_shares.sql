-- Create attendance_shares table for public sharing of monthly attendance records
create table public.attendance_shares (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  token text unique not null,
  year_month text not null, -- Format: YYYY-MM
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index idx_attendance_shares_token on public.attendance_shares(token);
create index idx_attendance_shares_user_company on public.attendance_shares(user_id, company_id);
create index idx_attendance_shares_expires_at on public.attendance_shares(expires_at);

-- Enable Row Level Security (RLS)
alter table public.attendance_shares enable row level security;

-- RLS Policies for attendance_shares table
-- Allow all operations via service role (API routes)
create policy "Attendance shares are manageable via service role" on public.attendance_shares
  for all using (true);

-- Create trigger for updated_at
create trigger handle_attendance_shares_updated_at before update on public.attendance_shares
  for each row execute function public.handle_updated_at();
