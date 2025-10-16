-- Seed data for development environment
-- This file is run after migrations to set up initial test data

-- Insert sample companies (without admin_id for now)
-- Admin will be assigned when users are created through LINE authentication
INSERT INTO public.companies (id, name, code) 
VALUES 
  ('123e4567-e89b-12d3-a456-426614174000', 'サンプル会社', 'SAMPLE001')
ON CONFLICT (code) DO NOTHING;

-- Note: Users will be created automatically when they first authenticate via LINE
-- Admin assignment can be done later through the application