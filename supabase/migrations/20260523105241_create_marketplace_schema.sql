/*
  # Marketplace Schema

  1. New Tables
    - `profiles` - User profile data linked to auth.users
      - `id` (uuid, PK, references auth.users)
      - `full_name` (text)
      - `avatar_url` (text)
      - `phone` (text)
      - `location` (text)
      - `created_at` (timestamptz)

    - `listings` - Product listings posted by users
      - `id` (uuid, PK)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `category` (text) - cars, real_estate, electronics, appliances, etc.
      - `condition` (text) - new, like_new, good, fair, poor
      - `asking_price` (numeric) - price set by seller (can be null = ask AI)
      - `ai_suggested_price` (numeric) - price calculated by AI
      - `ai_price_min` (numeric)
      - `ai_price_max` (numeric)
      - `ai_price_reasoning` (text)
      - `ai_price_updated_at` (timestamptz)
      - `images` (text[]) - array of image URLs
      - `location` (text)
      - `status` (text) - active, sold, draft
      - `views` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `listing_attributes` - Key-value attributes per listing (mileage, year, brand, etc.)
      - `id` (uuid, PK)
      - `listing_id` (uuid, references listings)
      - `key` (text)
      - `value` (text)

    - `messages` - Messages between buyer and seller
      - `id` (uuid, PK)
      - `listing_id` (uuid)
      - `sender_id` (uuid)
      - `receiver_id` (uuid)
      - `content` (text)
      - `read` (boolean)
      - `created_at` (timestamptz)

    - `favorites` - Saved listings per user
      - `id` (uuid, PK)
      - `user_id` (uuid)
      - `listing_id` (uuid)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Profiles: users can read all, update own
    - Listings: anyone can read active, authenticated can insert, owner can update/delete
    - Messages: participants can read/insert
    - Favorites: owner only
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  subcategory text DEFAULT '',
  condition text NOT NULL DEFAULT 'good',
  asking_price numeric,
  ai_suggested_price numeric,
  ai_price_min numeric,
  ai_price_max numeric,
  ai_price_reasoning text DEFAULT '',
  ai_price_updated_at timestamptz,
  images text[] DEFAULT '{}',
  location text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active listings are viewable by everyone"
  ON listings FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Listing attributes table
CREATE TABLE IF NOT EXISTS listing_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL DEFAULT '',
  value text NOT NULL DEFAULT ''
);

ALTER TABLE listing_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listing attributes viewable by everyone"
  ON listing_attributes FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert listing attributes"
  ON listing_attributes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update listing attributes"
  ON listing_attributes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete listing attributes"
  ON listing_attributes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid()
    )
  );

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS listings_user_id_idx ON listings(user_id);
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings(category);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS listing_attributes_listing_id_idx ON listing_attributes(listing_id);
CREATE INDEX IF NOT EXISTS messages_listing_id_idx ON messages(listing_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
