
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vsnbgbmuwvujynfrxfsj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbmJnYm11d3Z1anluZnJ4ZnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjIxMzc5MSwiZXhwIjoyMDU3Nzg5NzkxfQ.IO9X89j6bF81Q0z7sPyvTQzykkYfGX22JZiw3xY7ZGw'

console.log(supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)