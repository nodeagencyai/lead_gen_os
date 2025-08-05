# Supabase Delete Functionality Debugging Guide

## Current Status
✅ Enhanced debug logging added to all delete methods in `LeadsService`
✅ SQL fix script created: `fix-delete-permissions.sql`
✅ Comprehensive analysis completed

## Most Likely Issues & Solutions

### 1. **Row Level Security (RLS) Policies** - MOST LIKELY CAUSE
**Problem**: The Apollo and LinkedIn tables have overly restrictive RLS policies that may not allow DELETE operations.

**Solution**: Run the `fix-delete-permissions.sql` script in your Supabase SQL Editor.

### 2. **Missing DELETE Permissions** - SECOND MOST LIKELY
**Problem**: The `authenticated` role might not have DELETE permissions on Apollo/LinkedIn tables.

**Solution**: The SQL script will grant proper permissions.

### 3. **Authentication Issues**
**Problem**: User might not be properly authenticated or session expired.

**Look for**: Check browser console for auth errors in the debug logs.

## Step-by-Step Debugging Process

### Step 1: Run the SQL Fix Script
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `fix-delete-permissions.sql`
4. Run the script
5. Review the diagnostic output

### Step 2: Test Delete Functionality
1. Open your application
2. Navigate to the Leads page
3. Select one or more leads
4. Click the "Delete" button
5. **IMPORTANT**: Open browser DevTools (F12) > Console tab to see debug logs

### Step 3: Analyze Debug Logs
Look for these console messages:

**Successful Delete:**
```
🗑️ Attempting to delete Apollo lead: 123
🔐 Current user: user-uuid-here Auth error: null
📊 Delete result: { data: [...], error: null }
✅ Successfully deleted Apollo lead: 123 Deleted rows: 1
```

**Failed Delete - Permissions:**
```
🗑️ Attempting to delete Apollo lead: 123  
🔐 Current user: user-uuid-here Auth error: null
📊 Delete result: { data: null, error: { message: "permission denied", code: "42501" } }
❌ Error deleting Apollo lead: { message: "permission denied", ... }
```

**Failed Delete - RLS Policy:**
```
🗑️ Attempting to delete Apollo lead: 123
🔐 Current user: user-uuid-here Auth error: null  
📊 Delete result: { data: null, error: { message: "row-level security policy violation", code: "42501" } }
❌ Error deleting Apollo lead: { message: "row-level security policy violation", ... }
```

**Failed Delete - Authentication:**
```
🗑️ Attempting to delete Apollo lead: 123
🔐 Current user: null Auth error: {...}
📊 Delete result: { data: null, error: { message: "JWT expired", code: "401" } }
❌ Error deleting Apollo lead: { message: "JWT expired", ... }
```

### Step 4: Check Network Tab
1. Open DevTools > Network tab
2. Filter by "Fetch/XHR"
3. Attempt delete operation
4. Look for requests to Supabase API
5. Check HTTP status codes:
   - **200**: Success
   - **401**: Authentication error
   - **403**: Permission denied
   - **422**: RLS policy violation

## Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 42501 | Permission denied or RLS violation | Run the SQL fix script |
| 401 | Unauthorized/JWT expired | Check user authentication |
| 403 | Forbidden | Check API permissions |
| 422 | RLS policy prevented operation | Update RLS policies |

## UI-Specific Notes

### Current Delete Functionality
- ✅ **Bulk Delete**: Working (Delete button appears when leads are selected)
- ❓ **Single Delete**: Code exists but no UI button implemented
- ✅ **Debug Logging**: Added comprehensive logging

### Delete Flow
1. User selects leads using checkboxes
2. "Delete (X)" button appears in action bar
3. Clicking triggers `handleBulkDelete()` 
4. Confirmation modal appears
5. `confirmDelete()` calls `LeadsService.deleteApolloLeads()` or `deleteLinkedInLeads()`
6. State updates to remove deleted leads from UI

## Common Fixes

### Fix 1: Update RLS Policies (Most Common)
```sql
-- Run in Supabase SQL Editor
ALTER TABLE public.Apollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.LinkedIn ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can access Apollo leads" ON public.Apollo;
DROP POLICY IF EXISTS "Authenticated users can access LinkedIn leads" ON public.LinkedIn;

CREATE POLICY "Authenticated users can manage Apollo leads" ON public.Apollo
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage LinkedIn leads" ON public.LinkedIn  
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Fix 2: Grant DELETE Permissions
```sql
-- Run in Supabase SQL Editor
GRANT DELETE ON public.Apollo TO authenticated;
GRANT DELETE ON public.LinkedIn TO authenticated;
```

### Fix 3: Check User Authentication
```javascript
// Add to browser console to check auth
const { data: { user }, error } = await window.supabase.auth.getUser();
console.log('User:', user, 'Error:', error);
```

## Next Steps After Fixes

1. **Clear browser cache** to ensure fresh authentication tokens
2. **Refresh the application** 
3. **Test delete functionality** with debug logs open
4. **Remove debug logging** once issue is resolved (optional)

## Files Modified
- ✅ `src/services/leadsService.ts` - Added comprehensive debug logging
- ✅ `fix-delete-permissions.sql` - SQL script to fix permissions
- ✅ `debug-delete-issue.md` - Initial analysis
- ✅ `DELETE_DEBUGGING_GUIDE.md` - This comprehensive guide

## Contact Points for Further Help
If the issue persists after running the SQL script:
1. Share the console log output from the debug messages
2. Share the Network tab details from browser DevTools
3. Confirm which error codes you're seeing