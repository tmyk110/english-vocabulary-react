-- Create vocabulary_words table
CREATE TABLE vocabulary_words (
  id BIGSERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  meaning TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Allow all operations" ON vocabulary_words;

-- Create policy for authenticated users to only access their own data
CREATE POLICY "Users can manage their own words" 
ON vocabulary_words FOR ALL 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_vocabulary_words_word ON vocabulary_words(word);
CREATE INDEX idx_vocabulary_words_date_added ON vocabulary_words(date_added);
CREATE INDEX idx_vocabulary_words_user_id ON vocabulary_words(user_id);

-- Create push_subscriptions table
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to only access their own subscriptions
CREATE POLICY "Users can manage their own subscriptions" 
ON push_subscriptions FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Create notification_settings table
CREATE TABLE notification_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_time TIME DEFAULT '10:00:00',
  timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to only access their own settings
CREATE POLICY "Users can manage their own notification settings" 
ON notification_settings FOR ALL 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- Enable pg_cron extension (requires superuser privileges)
-- This needs to be run by a database administrator
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily notifications at 10:00 AM JST (01:00 AM UTC)
-- This will call the schedule-notifications Edge Function
-- Note: This needs to be run after the Edge Function is deployed
/*
SELECT cron.schedule(
  'daily-vocabulary-notifications',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_SUPABASE_PROJECT_URL.supabase.co/functions/v1/schedule-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('scheduled', true)
    );
  $$
);
*/