-- Initial schema setup for fitness-studio

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (handled by Supabase Auth, extended with profile)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  google_refresh_token TEXT,  -- Encrypted, for Google API access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User fitness profile for health calculations
CREATE TABLE user_fitness_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  height_inches NUMERIC(5,2) NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female', 'other')),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal_type TEXT CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  target_weight_lbs NUMERIC(5,1),
  weekly_rate_lbs NUMERIC(3,1) CHECK (weekly_rate_lbs IN (0.5, 1.0, 1.5, 2.0)),
  calculated_bmr NUMERIC(6,1),
  calculated_tdee NUMERIC(6,1),
  calculated_macros JSONB,  -- { calories, protein_g, carbs_g, fat_g }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Pictures with metadata
CREATE TABLE pictures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  width INT,
  height INT,
  -- Custom metadata
  title TEXT,
  description TEXT,
  tags TEXT[],
  location JSONB,  -- { lat, lng, address }
  taken_at TIMESTAMPTZ,
  exif_data JSONB,
  custom_metadata JSONB,
  -- Fitness-specific fields
  picture_type TEXT DEFAULT 'other' CHECK (picture_type IN ('weight', 'food', 'progress', 'other')),
  is_reviewed BOOLEAN DEFAULT FALSE,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  -- Sync tracking
  local_id TEXT,  -- Client-generated ID for offline sync
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weight entries
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight_lbs NUMERIC(5,1) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picture_id UUID REFERENCES pictures(id) ON DELETE SET NULL,
  notes TEXT,
  -- Sync tracking
  local_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food entries
CREATE TABLE food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories NUMERIC(6,1) NOT NULL,
  protein_g NUMERIC(5,1) NOT NULL,
  carbs_g NUMERIC(5,1) NOT NULL,
  fat_g NUMERIC(5,1) NOT NULL,
  fiber_g NUMERIC(5,1),
  serving_size NUMERIC(7,2) NOT NULL,
  serving_unit TEXT NOT NULL,
  servings NUMERIC(5,2) NOT NULL DEFAULT 1,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  picture_id UUID REFERENCES pictures(id) ON DELETE SET NULL,
  external_food_id TEXT,  -- Reference to external food database
  notes TEXT,
  -- Sync tracking
  local_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Text entries (journal, notes)
CREATE TABLE text_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  entry_type TEXT,  -- 'note', 'journal', etc.
  tags TEXT[],
  metadata JSONB,
  -- Sync tracking
  local_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google sync tracking
CREATE TABLE google_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL,  -- 'calendar', 'tasks'
  resource_id TEXT,       -- Specific calendar or task list ID
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service, resource_id)
);

-- Indexes for common queries
CREATE INDEX idx_pictures_user_id ON pictures(user_id);
CREATE INDEX idx_pictures_created_at ON pictures(created_at DESC);
CREATE INDEX idx_pictures_tags ON pictures USING gin(tags);
CREATE INDEX idx_pictures_type ON pictures(picture_type);
CREATE INDEX idx_text_entries_user_id ON text_entries(user_id);
CREATE INDEX idx_text_entries_created_at ON text_entries(created_at DESC);
CREATE INDEX idx_text_entries_tags ON text_entries USING gin(tags);
CREATE INDEX idx_weight_entries_user_id ON weight_entries(user_id);
CREATE INDEX idx_weight_entries_recorded_at ON weight_entries(recorded_at DESC);
CREATE INDEX idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX idx_food_entries_consumed_at ON food_entries(consumed_at DESC);
CREATE INDEX idx_user_fitness_profile_user_id ON user_fitness_profile(user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fitness_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE pictures ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_state ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

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

-- Text entries policies
CREATE POLICY "Users can view own text entries"
  ON text_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own text entries"
  ON text_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own text entries"
  ON text_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own text entries"
  ON text_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Google sync state policies
CREATE POLICY "Users can manage own sync state"
  ON google_sync_state FOR ALL
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_fitness_profile_updated_at
  BEFORE UPDATE ON user_fitness_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pictures_updated_at
  BEFORE UPDATE ON pictures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER weight_entries_updated_at
  BEFORE UPDATE ON weight_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER food_entries_updated_at
  BEFORE UPDATE ON food_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER text_entries_updated_at
  BEFORE UPDATE ON text_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create profile automatically on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
