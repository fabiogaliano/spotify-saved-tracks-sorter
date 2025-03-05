import { getSupabase } from './db'

export async function getOrCreateUser(spotifyUserId: string, spotifyUserEmail: string) {
  const supabase = getSupabase()

  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('spotify_user_id', spotifyUserId)
    .single()

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error('Database error while checking user')
  }

  if (!existingUser) {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          spotify_user_id: spotifyUserId,
          spotify_user_email: spotifyUserEmail,
          last_login: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (insertError) {
      throw new Error('Database error while creating user')
    }

    return newUser
  } else {
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('spotify_user_id', spotifyUserId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Database error while updating user last login')
    }

    return updatedUser
  }
}
