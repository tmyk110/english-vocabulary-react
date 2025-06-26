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