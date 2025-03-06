-- Enable Row Level Security for user_provider_preferences table
ALTER TABLE user_provider_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for INSERT: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON user_provider_preferences
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id::uuid);

-- Create policy for SELECT: Users can only view their own preferences
CREATE POLICY "Users can only view their own preferences"
  ON user_provider_preferences
  FOR SELECT
  TO public
  USING (auth.uid() = user_id::uuid);

-- Create policy for UPDATE: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON user_provider_preferences
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id::uuid);
