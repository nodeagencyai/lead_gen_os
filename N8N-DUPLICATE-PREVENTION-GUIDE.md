# N8N Duplicate Prevention Guide

## Overview
This guide shows how to update your N8N workflows to prevent duplicate leads from being inserted into the Apollo and LinkedIn tables.

## What Changed
1. **Database Constraints**: Added unique constraints on `email + company` combination
2. **Upsert Functions**: Created database functions that insert new leads or skip duplicates
3. **Batch Processing**: Added bulk upsert function for processing multiple leads efficiently

## Quick Migration Steps

### Step 1: Run the SQL Script
Execute `prevent-duplicate-leads.sql` in your Supabase SQL Editor first.

### Step 2: Update N8N Apollo Workflow

**OLD (Direct Insert):**
```sql
INSERT INTO public."Apollo" (
    email, 
    company, 
    full_name, 
    title, 
    phone, 
    linkedin_url
) VALUES (
    '{{ $json.email }}',
    '{{ $json.company }}',
    '{{ $json.full_name }}',
    '{{ $json.title }}',
    '{{ $json.phone }}',
    '{{ $json.linkedin_url }}'
);
```

**NEW (Upsert Function):**
```sql
SELECT * FROM upsert_apollo_lead(
    p_email := '{{ $json.email }}',
    p_company := '{{ $json.company }}',
    p_full_name := '{{ $json.full_name }}',
    p_title := '{{ $json.title }}',
    p_phone := '{{ $json.phone }}',
    p_linkedin_url := '{{ $json.linkedin_url }}',
    p_niche := '{{ $json.niche }}',
    p_tags := ARRAY[{{ $json.tags }}]
);
```

### Step 3: Update N8N LinkedIn Workflow

**OLD (Direct Insert):**
```sql
INSERT INTO public."LinkedIn" (
    email, 
    company, 
    name, 
    position, 
    linkedin_url
) VALUES (
    '{{ $json.email }}',
    '{{ $json.company }}',
    '{{ $json.name }}',
    '{{ $json.position }}',
    '{{ $json.linkedin_url }}'
);
```

**NEW (Upsert Function):**
```sql
SELECT * FROM upsert_linkedin_lead(
    p_email := '{{ $json.email }}',
    p_company := '{{ $json.company }}',
    p_name := '{{ $json.name }}',
    p_position := '{{ $json.position }}',
    p_linkedin_url := '{{ $json.linkedin_url }}',
    p_niche := '{{ $json.niche }}',
    p_tags := ARRAY[{{ $json.tags }}]
);
```

## Function Parameters

### Apollo Upsert Function
- `p_email` (required) - Lead email
- `p_company` (required) - Company name  
- `p_full_name` - Full name
- `p_first_name` - First name
- `p_last_name` - Last name
- `p_title` - Job title
- `p_phone` - Phone number
- `p_linkedin_url` - LinkedIn profile URL
- `p_website` - Company website
- `p_niche` - Industry/niche
- `p_tags` - Array of tags
- `p_icebreaker` - Personalized icebreaker
- `p_personalization_hooks` - Personalization data
- `p_additional_data` - JSON data

### LinkedIn Upsert Function
- `p_email` (required) - Lead email
- `p_company` (required) - Company name
- `p_name` - Name
- `p_full_name` - Full name
- `p_position` - Job position
- `p_linkedin_url` - LinkedIn profile URL  
- `p_phone` - Phone number
- `p_niche` - Industry/niche
- `p_tags` - Array of tags
- `p_icebreaker` - Personalized icebreaker
- `p_additional_data` - JSON data

## Return Values

Each function returns:
- `lead_id` - The ID of the lead (existing or new)
- `was_inserted` - Boolean indicating if this was a new lead
- `message` - Description of what happened

## Bulk Processing (Optional)

For workflows processing many leads at once, use the batch function:

```sql  
SELECT * FROM batch_upsert_apollo_leads('[
    {
        "email": "lead1@company.com",
        "company": "Company A", 
        "full_name": "Lead One",
        "title": "Manager"
    },
    {
        "email": "lead2@company.com",
        "company": "Company B",
        "full_name": "Lead Two", 
        "title": "Director"
    }
]'::JSONB);
```

## Testing

After updating your workflows:

1. **Test with new leads** - Should insert normally
2. **Test with duplicate data** - Should skip and return existing ID
3. **Check the return values** - Use `was_inserted` to track new vs existing leads

## Monitoring

The functions will:
- ✅ Insert new leads normally
- ⚠️ Skip duplicates and return existing lead ID
- 📊 Provide clear feedback on what happened

## Error Handling

If the function encounters an error:
- Database constraint violations are prevented
- Clear error messages are returned
- Existing data remains unchanged

## Rollback (if needed)

To rollback these changes:

```sql
-- Remove constraints
ALTER TABLE public."Apollo" DROP CONSTRAINT IF EXISTS unique_apollo_email_company;
ALTER TABLE public."LinkedIn" DROP CONSTRAINT IF EXISTS unique_linkedin_email_company;

-- Drop functions  
DROP FUNCTION IF EXISTS upsert_apollo_lead;
DROP FUNCTION IF EXISTS upsert_linkedin_lead;
DROP FUNCTION IF EXISTS batch_upsert_apollo_leads;
```

## Support

If you encounter issues:
1. Check the function return values for error messages
2. Verify your email and company data is not null
3. Test with a small batch first
4. Check Supabase logs for detailed error information