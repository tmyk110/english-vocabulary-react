-- Create FCM tokens table for storing Firebase Cloud Messaging registration tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON public.fcm_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens(token);

-- Create unique constraint to prevent duplicate tokens per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_unique_user_token ON public.fcm_tokens(user_id, token) WHERE is_active = true;

-- Set up Row Level Security (RLS)
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view own fcm tokens" ON public.fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own fcm tokens" ON public.fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own fcm tokens" ON public.fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own fcm tokens" ON public.fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_fcm_tokens_updated_at 
    BEFORE UPDATE ON public.fcm_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();