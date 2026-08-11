---
name: supabase-backend
description: Develop PostgreSQL databases, authentication, real-time sync, and storage using Supabase. Use when setting up schemas, migrations, RLS, or edge functions in Supabase.
license: MIT
---

# Supabase Backend Development

## Purpose
Guide AI agents and developers in building robust, secure, and scalable backend infrastructure using Supabase (PostgreSQL, GoTrue authentication, Storage, Realtime, and Edge Functions).

## When to Use
- Designing PostgreSQL database schemas.
- Managing migrations and database schema updates.
- Writing and securing PostgreSQL Row-Level Security (RLS) policies.
- Developing serverless Deno Edge Functions.
- Integrating Supabase Client SDK (`@supabase/supabase-js`) in frontends or backends.

## How to Use

### 1. Supabase CLI Setup
Always manage migrations and local development using the Supabase CLI. Do not write schemas directly in the Supabase Dashboard in production.
```bash
# Initialize Supabase configuration in project
npx supabase init

# Start local Supabase container environment
npx supabase start

# Stop local environment
npx supabase stop

# Check status of local services
npx supabase status
```

### 2. Schema and Migrations
Database schemas should be version-controlled using migrations.
```bash
# Create a new blank migration file
npx supabase migration new add_users_table

# Apply local migrations and reset database to clean state
npx supabase db reset

# Push migrations to remote database
npx supabase db push

# Generate migration from schema diff (compares local vs remote)
npx supabase db diff --local > supabase/migrations/new_migration.sql
```

### 3. Row-Level Security (RLS) Policies
Row-Level Security is mandatory for all tables exposed to the client.
```sql
-- 1. Enable RLS on the table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create select policy for authenticated users
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- 3. Create update policy
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );
```

### 4. Deno Edge Functions
For custom server-side logic, use Supabase Edge Functions (Deno runtime).
```bash
# Create a new function
npx supabase functions new handle-payment

# Deploy function to remote Supabase project
npx supabase functions deploy handle-payment
```

### 5. Client Integration (TypeScript)
Integrate Supabase in frontend applications securely.
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Fetch data example
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    
  if (error) throw error
  return data
}
```

## Best Practices
- ⚠️ **Always Enable RLS**: Never leave a table without RLS enabled if it is accessible via the anonymous client.
- 🔒 **Use service_role Key ONLY in Secure Backends**: The `service_role` key bypasses RLS and must never be exposed to the client.
- 🗄️ **Use Indexes**: Index columns frequently queried in `eq()`, `filter()`, or foreign keys.
