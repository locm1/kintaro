-- Rename admin_id to user_id in companies table
-- This migration renames the admin_id column to user_id for better clarity

-- Rename the column from admin_id to user_id
ALTER TABLE public.companies 
RENAME COLUMN admin_id TO user_id;

-- Update any RLS policies that reference admin_id
-- Drop the old policy
DROP POLICY IF EXISTS "Companies can be updated by admin users" ON public.companies;

-- Create new policy with user_id reference
CREATE POLICY "Companies can be updated by admin users" ON public.companies
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.users WHERE line_user_id = current_setting('app.current_line_user_id', true)
    ) OR 
    id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE line_user_id = current_setting('app.current_line_user_id', true)
      ) AND is_admin = true
    )
  );