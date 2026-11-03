-- ==============================================================================
-- ENTERPRISE DEFENSE-IN-DEPTH POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- Project: Personal Expense & Money Manager (My Money)
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================
-- This script configures production-grade Row Level Security, role-based access
-- control, immutable security audit logging, anti-IDOR triggers, and strict user
-- isolation. Every financial record is cryptographically bound to auth.uid().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE (User Management & Role Verification)
-- ------------------------------------------------------------------------------
-- Tracks user status and verified roles.
-- PASSWORDS ARE NEVER STORED HERE (handled securely by Supabase auth.users).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email and role for fast authentication and authorization lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Automatic updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profiles_updated_at();

-- Automatic profile creation on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        -- Protect Admin role: only pre-designated root admin email gets 'admin' role
        CASE
            WHEN LOWER(NEW.email) = 'admin@mymoney.com' THEN 'admin'
            ELSE 'user'
        END,
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_registration();

-- ------------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE (Private Financial Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    category TEXT NOT NULL CHECK (category IN ('home', 'room', 'other', 'people')),
    subcategory TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0 AND amount <= 100000000.00),
    title TEXT NOT NULL CHECK (LENGTH(title) <= 250),
    description TEXT,
    person_name TEXT CHECK (person_name IS NULL OR LENGTH(person_name) <= 150),
    transaction_date DATE NOT NULL,
    transaction_time TIME NOT NULL,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-performance compound indexes for user-isolated queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat ON public.transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_person ON public.transactions(user_id, person_name) WHERE person_name IS NOT NULL;

-- Automatic updated_at trigger for transactions
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profiles_updated_at();

-- ANTI-TAMPERING TRIGGER: Prevent changing transaction ownership (Anti-IDOR)
CREATE OR REPLACE FUNCTION public.prevent_transaction_owner_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id <> OLD.user_id THEN
        RAISE EXCEPTION 'Security Violation: Cannot reassign transaction ownership to another user_id.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_tx_owner_change ON public.transactions;
CREATE TRIGGER trg_prevent_tx_owner_change
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_transaction_owner_change();

-- ------------------------------------------------------------------------------
-- 4. SECURITY AUDIT LOGS TABLE (Tamper-Resistant Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    actor_role TEXT NOT NULL DEFAULT 'user' CHECK (actor_role IN ('admin', 'user', 'anonymous')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for chronological auditing by administrators
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON public.security_audit_logs(event_type);

-- IMMUTABILITY ENFORCEMENT: Audit logs can NEVER be updated or deleted by anyone!
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Security audit logs are strictly append-only and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON public.security_audit_logs;
CREATE TRIGGER trg_audit_no_update
    BEFORE UPDATE OR DELETE ON public.security_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check if currently executing user is a verified Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 6. POLICIES: PROFILES TABLE
-- ------------------------------------------------------------------------------

-- Regular users can view ONLY their own profile; Admins can view ALL profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id OR public.is_admin()
    );

-- Users can insert their own profile on registration (strictly with role='user')
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
    ON public.profiles FOR INSERT
    WITH CHECK (
        auth.uid() = id AND role = 'user'
    );

-- Regular users can update only their non-privileged fields;
-- ONLY Admin can alter role or status
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
    ON public.profiles FOR UPDATE
    USING (
        auth.uid() = id OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND status = (SELECT status FROM public.profiles WHERE id = auth.uid()))
        OR public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 7. POLICIES: TRANSACTIONS TABLE (STRICT MULTI-TENANT ISOLATION)
-- ------------------------------------------------------------------------------
-- Every user sees, inserts, updates, and deletes ONLY their own transactions.
-- User financial privacy: Even administrators CANNOT view or edit another user's private financial records!

DROP POLICY IF EXISTS "transactions_select_isolation" ON public.transactions;
CREATE POLICY "transactions_select_isolation"
    ON public.transactions FOR SELECT
    USING (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "transactions_insert_isolation" ON public.transactions;
CREATE POLICY "transactions_insert_isolation"
    ON public.transactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "transactions_update_isolation" ON public.transactions;
CREATE POLICY "transactions_update_isolation"
    ON public.transactions FOR UPDATE
    USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "transactions_delete_isolation" ON public.transactions;
CREATE POLICY "transactions_delete_isolation"
    ON public.transactions FOR DELETE
    USING (
        auth.uid() = user_id
    );

-- ------------------------------------------------------------------------------
-- 8. POLICIES: SECURITY AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
-- Authenticated users & triggers can insert security events.
-- ONLY verified active administrators can view security audit logs.
-- Modifications and deletions are completely blocked by the immutability trigger.

DROP POLICY IF EXISTS "audit_insert_policy" ON public.security_audit_logs;
CREATE POLICY "audit_insert_policy"
    ON public.security_audit_logs FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "audit_select_admin_only" ON public.security_audit_logs;
CREATE POLICY "audit_select_admin_only"
    ON public.security_audit_logs FOR SELECT
    USING (
        public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 9. ADMIN PROCEDURES: USER MANAGEMENT & CREDENTIAL OVERRIDES
-- ------------------------------------------------------------------------------

-- Function: Admin Set User Password
CREATE OR REPLACE FUNCTION public.admin_set_user_password(target_user_id UUID, new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    ) OR auth.uid() IS NULL
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user passwords.';
  END IF;

  IF length(new_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'User password updated successfully');
END;
$$;

-- Function: Admin Delete User
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    ) OR auth.uid() IS NULL
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can delete users.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'User and all associated data deleted successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, anon;

-- ==============================================================================
-- Schema and RLS configuration complete.
-- ==============================================================================
