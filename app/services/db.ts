import { createClient } from '@supabase/supabase-js'

const SUPABASE_KEY = process.env.SUPABASE_KEY
const supabase = createClient('https://szhpoywveuvfbhcxiafi.supabase.co', SUPABASE_KEY)
