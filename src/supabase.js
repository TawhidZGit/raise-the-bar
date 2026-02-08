import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Save a transcript to the database
export async function saveTranscript(text) {
  const { data, error } = await supabase
    .from('transcripts')
    .insert([
      { 
        text,
        created_at: new Date().toISOString(),
      }
    ])
    .select()

  if (error) {
    console.error('Error saving transcript:', error)
    throw error
  }

  console.log('Transcript saved:', data)
  return data
}

// Get all transcripts
export async function getTranscripts() {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching transcripts:', error)
    throw error
  }

  return data
}

