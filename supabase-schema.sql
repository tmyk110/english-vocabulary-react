-- Create vocabulary_words table
CREATE TABLE vocabulary_words (
  id BIGSERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  meaning TEXT NOT NULL,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations" ON vocabulary_words FOR ALL USING (true);

-- Create index for better performance
CREATE INDEX idx_vocabulary_words_word ON vocabulary_words(word);
CREATE INDEX idx_vocabulary_words_date_added ON vocabulary_words(date_added);