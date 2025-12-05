-- Create change_requests table for attendance record modification requests
create table public.change_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  attendance_record_id uuid references public.attendance_records(id) on delete cascade,
  request_date date not null, -- 変更リクエスト対象の日付
  current_clock_in timestamptz,
  current_clock_out timestamptz,
  current_break_start timestamptz,
  current_break_end timestamptz,
  requested_clock_in timestamptz,
  requested_clock_out timestamptz,
  requested_break_start timestamptz,
  requested_break_end timestamptz,
  reason text, -- 変更理由
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index idx_change_requests_user_id on public.change_requests(user_id);
create index idx_change_requests_company_id on public.change_requests(company_id);
create index idx_change_requests_status on public.change_requests(status);
create index idx_change_requests_created_at on public.change_requests(created_at);

-- Enable Row Level Security (RLS)
alter table public.change_requests enable row level security;

-- RLS Policies for change_requests table
create policy "Change requests are manageable via service role" on public.change_requests
  for all using (true);

-- Create trigger for updated_at
create trigger handle_change_requests_updated_at before update on public.change_requests
  for each row execute function public.handle_updated_at();
