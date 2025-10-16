-- Create users table and initial schema for attendance management system
-- This migration sets up the complete database schema with proper relationships

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create users table (extends auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  email text,
  line_user_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create companies table
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique not null,
  admin_id uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create user_companies junction table
create table public.user_companies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- Create attendance_records table
create table public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  status text default 'present' check (status in ('present', 'absent', 'partial')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, company_id, date)
);

-- Create indexes for better query performance
create index idx_users_line_user_id on public.users(line_user_id);
create index idx_companies_code on public.companies(code);
create index idx_user_companies_user_id on public.user_companies(user_id);
create index idx_user_companies_company_id on public.user_companies(company_id);
create index idx_attendance_records_user_company_date on public.attendance_records(user_id, company_id, date);
create index idx_attendance_records_company_date on public.attendance_records(company_id, date);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.user_companies enable row level security;
alter table public.attendance_records enable row level security;

-- RLS Policies for users table
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- RLS Policies for companies table
create policy "Companies are viewable by associated users" on public.companies
  for select using (
    id in (
      select company_id from public.user_companies 
      where user_id = auth.uid()
    )
  );

create policy "Companies can be inserted by authenticated users" on public.companies
  for insert with check (auth.uid() is not null);

create policy "Companies can be updated by admin users" on public.companies
  for update using (
    admin_id = auth.uid() or 
    id in (
      select company_id from public.user_companies 
      where user_id = auth.uid() and is_admin = true
    )
  );

-- RLS Policies for user_companies table
create policy "User companies are viewable by the user" on public.user_companies
  for select using (user_id = auth.uid());

create policy "User companies can be inserted by the user" on public.user_companies
  for insert with check (user_id = auth.uid());

create policy "User companies can be updated by admin users" on public.user_companies
  for update using (
    user_id = auth.uid() or 
    company_id in (
      select company_id from public.user_companies 
      where user_id = auth.uid() and is_admin = true
    )
  );

-- RLS Policies for attendance_records table
create policy "Attendance records are viewable by user and company admins" on public.attendance_records
  for select using (
    user_id = auth.uid() or 
    company_id in (
      select company_id from public.user_companies 
      where user_id = auth.uid() and is_admin = true
    )
  );

create policy "Attendance records can be inserted by the user" on public.attendance_records
  for insert with check (
    user_id = auth.uid() or 
    company_id in (
      select company_id from public.user_companies 
      where user_id = auth.uid() and is_admin = true
    )
  );

create policy "Attendance records can be updated by user and company admins" on public.attendance_records
  for update using (
    user_id = auth.uid() or 
    company_id in (
      select company_id from public.user_companies 
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Function to handle updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_users_updated_at before update on public.users
  for each row execute function public.handle_updated_at();

create trigger handle_companies_updated_at before update on public.companies
  for each row execute function public.handle_updated_at();

create trigger handle_user_companies_updated_at before update on public.user_companies
  for each row execute function public.handle_updated_at();

create trigger handle_attendance_records_updated_at before update on public.attendance_records
  for each row execute function public.handle_updated_at();