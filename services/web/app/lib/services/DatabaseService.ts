import { SupabaseClient, createClient } from '@supabase/supabase-js'

import { Database } from '~/types/database.types'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
	throw new Error('Missing Supabase environment variables')
}

let supabase: SupabaseClient<Database> | null

export function getSupabase(): SupabaseClient<Database> {
	if (!supabase) {
		supabase = createClient<Database>(SUPABASE_URL as string, SUPABASE_KEY as string)
	}
	return supabase
}
