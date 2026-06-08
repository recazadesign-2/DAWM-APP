
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$f$;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO anon, authenticated;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "roles_select_own" ON public.user_roles;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT
  USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "roles_admin_all" ON public.user_roles;
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$f$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$f$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.dynamic_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
  screen TEXT, description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT ON public.dynamic_strings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dynamic_strings TO authenticated;
GRANT ALL ON public.dynamic_strings TO service_role;
ALTER TABLE public.dynamic_strings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strings_read" ON public.dynamic_strings;
CREATE POLICY "strings_read" ON public.dynamic_strings FOR SELECT USING (true);
DROP POLICY IF EXISTS "strings_admin" ON public.dynamic_strings;
CREATE POLICY "strings_admin" ON public.dynamic_strings FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_dynamic_strings_updated ON public.dynamic_strings;
CREATE TRIGGER trg_dynamic_strings_updated BEFORE UPDATE ON public.dynamic_strings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.daily_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_date DATE NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'ayah',
  arabic_text TEXT NOT NULL,
  reference TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_daily_content_date ON public.daily_content(content_date, content_type);
GRANT SELECT ON public.daily_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.daily_content TO authenticated;
GRANT ALL ON public.daily_content TO service_role;
ALTER TABLE public.daily_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_read" ON public.daily_content;
CREATE POLICY "daily_read" ON public.daily_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "daily_admin" ON public.daily_content;
CREATE POLICY "daily_admin" ON public.daily_content FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON public.app_settings;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_admin" ON public.app_settings;
CREATE POLICY "settings_admin" ON public.app_settings FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_app_settings_updated ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
