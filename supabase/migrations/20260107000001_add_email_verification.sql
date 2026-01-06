-- Add email verification columns to users table
-- メールアドレス認証機能追加のマイグレーション

-- メール認証用カラムを追加
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

-- インデックスを追加（トークン検索用）
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token 
ON public.users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN public.users.email_verified IS 'メールアドレスが認証済みかどうか';
COMMENT ON COLUMN public.users.email_verification_token IS 'メール認証用のトークン';
COMMENT ON COLUMN public.users.email_verification_expires_at IS 'メール認証トークンの有効期限';
