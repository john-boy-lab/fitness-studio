-- Migration: 00001_fitness_schema.sql
-- Description: Initial fitness studio schema with profiles, fitness data, weight/food entries, and pictures
-- Created: 2026-01-19

-- ============================================
-- Function: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Table: profiles
-- Extends auth.users with profile data
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  google_refresh_token TEXT,  -- Encrypted, for Google API access
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Table: user_fitness_profile
-- User's fitness configuration and calculated macros
-- ============================================
CREATE TABLE IF NOT EXISTS user_fitness_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  height_inches NUMERIC(5,2) NOT NULL CHECK (height_inches > 0 AND height_inches < 120),
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female', 'other')),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  goals TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(goals, 1) IS NULL OR goals <@ ARRAY['lose_weight', 'maintain_weight', 'gain_weight', 'build_muscle']::TEXT[]),
  calculated_macros JSONB,  -- { calories, protein_g, carbs_g, fat_g, fiber_g }
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_fitness_profile_user_id ON user_fitness_profile(user_id);

CREATE TRIGGER user_fitness_profile_updated_at
  BEFORE UPDATE ON user_fitness_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Table: pictures
-- Stores picture metadata for weight/food photos
-- ============================================
CREATE TABLE IF NOT EXISTS pictures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  width INT,
  height INT,
  picture_type TEXT NOT NULL CHECK (picture_type IN ('weight', 'food', 'progress', 'other')),
  is_reviewed BOOLEAN DEFAULT FALSE NOT NULL,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  -- Sync tracking
  local_id TEXT,  -- Client-generated ID for offline sync
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pictures_user_id ON pictures(user_id);
CREATE INDEX idx_pictures_created_at ON pictures(created_at DESC);
CREATE INDEX idx_pictures_picture_type ON pictures(picture_type);
CREATE INDEX idx_pictures_local_id ON pictures(local_id) WHERE local_id IS NOT NULL;

CREATE TRIGGER pictures_updated_at
  BEFORE UPDATE ON pictures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Table: weight_entries
-- User weight tracking entries
-- ============================================
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight_lbs NUMERIC(6,2) NOT NULL CHECK (weight_lbs > 0 AND weight_lbs < 2000),
  recorded_at TIMESTAMPTZ NOT NULL,
  picture_id UUID REFERENCES pictures(id) ON DELETE SET NULL,
  notes TEXT,
  -- Sync tracking
  local_id TEXT,  -- Client-generated ID for offline sync
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_weight_entries_user_id ON weight_entries(user_id);
CREATE INDEX idx_weight_entries_recorded_at ON weight_entries(recorded_at DESC);
CREATE INDEX idx_weight_entries_local_id ON weight_entries(local_id) WHERE local_id IS NOT NULL;

CREATE TRIGGER weight_entries_updated_at
  BEFORE UPDATE ON weight_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Table: food_entries
-- User food/nutrition tracking entries
-- ============================================
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  -- Macro nutrients
  calories NUMERIC(8,2) NOT NULL CHECK (calories >= 0),
  protein_g NUMERIC(8,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g NUMERIC(8,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g NUMERIC(8,2) NOT NULL CHECK (fat_g >= 0),
  fiber_g NUMERIC(8,2) CHECK (fiber_g IS NULL OR fiber_g >= 0),
  -- Serving info
  serving_size NUMERIC(10,2) NOT NULL CHECK (serving_size > 0),
  serving_unit TEXT NOT NULL,
  servings NUMERIC(6,2) NOT NULL CHECK (servings > 0),
  -- Timing and categorization
  consumed_at TIMESTAMPTZ NOT NULL,
  meal_type TEXT CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  -- References
  picture_id UUID REFERENCES pictures(id) ON DELETE SET NULL,
  external_food_id TEXT,  -- For linking to external food databases
  notes TEXT,
  -- Sync tracking
  local_id TEXT,  -- Client-generated ID for offline sync
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX idx_food_entries_consumed_at ON food_entries(consumed_at DESC);
CREATE INDEX idx_food_entries_meal_type ON food_entries(meal_type) WHERE meal_type IS NOT NULL;
CREATE INDEX idx_food_entries_local_id ON food_entries(local_id) WHERE local_id IS NOT NULL;
CREATE INDEX idx_food_entries_external_id ON food_entries(external_food_id) WHERE external_food_id IS NOT NULL;

CREATE TRIGGER food_entries_updated_at
  BEFORE UPDATE ON food_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fitness_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE pictures ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User fitness profile policies
CREATE POLICY "Users can view own fitness profile"
  ON user_fitness_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fitness profile"
  ON user_fitness_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fitness profile"
  ON user_fitness_profile FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fitness profile"
  ON user_fitness_profile FOR DELETE
  USING (auth.uid() = user_id);

-- Pictures policies
CREATE POLICY "Users can view own pictures"
  ON pictures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pictures"
  ON pictures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pictures"
  ON pictures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pictures"
  ON pictures FOR DELETE
  USING (auth.uid() = user_id);

-- Weight entries policies
CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries"
  ON weight_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
  ON weight_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Food entries policies
CREATE POLICY "Users can view own food entries"
  ON food_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food entries"
  ON food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food entries"
  ON food_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food entries"
  ON food_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Function: Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
