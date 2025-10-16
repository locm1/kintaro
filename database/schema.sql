-- NOTE: This file is now deprecated. 
-- Use Supabase migrations instead: supabase/migrations/20250116000001_initial_schema.sql

-- ユーザーテーブル（auth.usersの拡張）
CREATE TABLE users (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT,
    line_user_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 会社テーブル
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    admin_id UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーと会社の関連テーブル
CREATE TABLE user_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- 勤怠記録テーブル
CREATE TABLE attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR DEFAULT 'present' CHECK (status IN ('present', 'absent', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id, date)
);

-- インデックス作成
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX idx_attendance_records_user_company_date ON attendance_records(user_id, company_id, date);
CREATE INDEX idx_attendance_records_company_date ON attendance_records(company_id, date);

-- RLS (Row Level Security) 有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定

-- users テーブルのポリシー
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- companies テーブルのポリシー
CREATE POLICY "Companies are viewable by associated users" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Companies can be inserted by authenticated users" ON companies
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Companies can be updated by admin users" ON companies
    FOR UPDATE USING (
        admin_id = auth.uid() OR 
        id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- user_companies テーブルのポリシー
CREATE POLICY "User companies are viewable by the user" ON user_companies
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "User companies can be inserted by the user" ON user_companies
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "User companies can be updated by admin users" ON user_companies
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- attendance_records テーブルのポリシー
CREATE POLICY "Attendance records are viewable by user and company admins" ON attendance_records
    FOR SELECT USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Attendance records can be inserted by associated users" ON attendance_records
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Attendance records can be updated by user and company admins" ON attendance_records
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- 自動更新日時のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_atの自動更新トリガーを設定
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_companies_updated_at BEFORE UPDATE ON user_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();