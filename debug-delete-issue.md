# Debug Report: Delete Functionality Issue with Supabase

## Analysis of Current Implementation

After examining the codebase, I've identified several potential issues with the delete functionality:

### 1. **Row Level Security (RLS) Policies**

From the schema file (`leadgenos-core-schema.sql`), the Apollo and LinkedIn tables have different RLS policies:

```sql
-- Apollo/LinkedIn tables have broad authentication-based policy
CREATE POLICY "Authenticated users can access Apollo leads" ON public.Apollo
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access LinkedIn leads" ON public.LinkedIn
    FOR ALL USING (auth.role() = 'authenticated');
```

**Problem**: These policies only check if the user is authenticated, but don't restrict DELETE operations properly.

### 2. **Missing DELETE Permissions**

From the schema, the Apollo and LinkedIn tables are not explicitly granted DELETE permissions:

```sql
-- Other tables get SELECT, INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;

-- But Apollo/LinkedIn tables might only have SELECT, INSERT, UPDATE
-- (not explicitly shown in the schema file)
```

### 3. **Potential Issues in Delete Implementation**

The delete methods in `LeadsService` look correct:

```typescript
static async deleteApolloLead(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('Apollo')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting Apollo lead:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete Apollo lead:', error);
    throw error;
  }
}
```

## Debugging Steps to Perform

### Step 1: Check Browser Console for Errors

1. Open browser DevTools (F12)
2. Go to Console tab
3. Attempt to delete a lead
4. Look for any error messages, particularly:
   - `Error deleting Apollo lead:` or `Error deleting LinkedIn lead:`
   - Supabase authentication errors
   - RLS policy violations

### Step 2: Check Network Tab for API Calls

1. Open DevTools > Network tab
2. Filter by XHR/Fetch requests
3. Attempt to delete a lead
4. Look for:
   - DELETE requests to Supabase API
   - HTTP status codes (403 = permissions, 401 = auth, 422 = RLS)
   - Response bodies with error details

### Step 3: Add Enhanced Debug Logging

Add this enhanced debug version to the delete methods:

```typescript
static async deleteApolloLead(id: number): Promise<void> {
  try {
    console.log('🗑️ Attempting to delete Apollo lead:', id);
    
    // Check current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Current user:', user?.id, 'Auth error:', authError);
    
    const { data, error } = await supabase
      .from('Apollo')
      .delete()
      .eq('id', id)
      .select(); // Add select() to see what would be deleted

    console.log('📊 Delete result:', { data, error });

    if (error) {
      console.error('❌ Error deleting Apollo lead:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Successfully deleted Apollo lead:', id);
  } catch (error) {
    console.error('💥 Failed to delete Apollo lead:', error);
    throw error;
  }
}
```

## Likely Solutions

### Solution 1: Fix RLS Policies
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can access Apollo leads" ON public.Apollo;
DROP POLICY IF EXISTS "Authenticated users can access LinkedIn leads" ON public.LinkedIn;

-- Create user-scoped policies (if user_id column exists)
CREATE POLICY "Users can manage own Apollo leads" ON public.Apollo
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own LinkedIn leads" ON public.LinkedIn
    FOR ALL USING (auth.uid() = user_id);

-- OR if no user_id column, allow all authenticated users
CREATE POLICY "Authenticated users can manage Apollo leads" ON public.Apollo
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage LinkedIn leads" ON public.LinkedIn
    FOR ALL USING (auth.role() = 'authenticated');
```

### Solution 2: Grant DELETE Permissions
```sql
-- Ensure DELETE permissions are granted
GRANT DELETE ON public.Apollo TO authenticated;
GRANT DELETE ON public.LinkedIn TO authenticated;
```

### Solution 3: Check if RLS is enabled on Apollo/LinkedIn tables
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('Apollo', 'LinkedIn');

-- Enable RLS if not already enabled
ALTER TABLE public.Apollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.LinkedIn ENABLE ROW LEVEL SECURITY;
```

## Recommended Debug Process

1. **First**: Add the enhanced logging to see exact error messages
2. **Second**: Check browser console and network tab during delete attempts
3. **Third**: Based on the error messages, apply the appropriate SQL fixes above
4. **Fourth**: Test delete functionality again

The most likely issue is either missing DELETE permissions or overly restrictive RLS policies.