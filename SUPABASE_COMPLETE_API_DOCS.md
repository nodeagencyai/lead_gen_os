# Supabase Complete API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication & API Keys](#authentication--api-keys)
4. [Database API (PostgREST)](#database-api-postgrest)
5. [Authentication API](#authentication-api)
6. [Storage API](#storage-api)
7. [Realtime API](#realtime-api)
8. [Edge Functions](#edge-functions)
9. [Management API](#management-api)
10. [Database Webhooks](#database-webhooks)
11. [Client Libraries](#client-libraries)
12. [Code Examples](#code-examples)
13. [Best Practices](#best-practices)
14. [Error Handling](#error-handling)

## Introduction

Supabase is an open-source Firebase alternative built on PostgreSQL that provides:
- **Auto-generated REST API** via PostgREST
- **Real-time subscriptions** for database changes
- **Authentication system** with multiple providers
- **File storage** with transformation capabilities
- **Edge Functions** for serverless compute
- **Management API** for project administration

### Key Features
- **Instant APIs**: Auto-generated REST API from your database schema
- **Real-time**: Listen to database changes in real-time
- **Authentication**: Built-in auth with Row Level Security (RLS)
- **Storage**: S3-compatible object storage
- **Edge Functions**: Globally distributed serverless functions
- **Dashboard**: Web-based interface for database management

## Getting Started

### Project Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project credentials from Settings → API
3. Install the Supabase client library

### Project Credentials
```typescript
interface ProjectCredentials {
  url: string;          // https://<project_ref>.supabase.co
  anonKey: string;      // Public anonymous key
  serviceRoleKey: string; // Private service role key (server-only)
}
```

### Installation
```bash
# JavaScript/TypeScript
npm install @supabase/supabase-js

# Python
pip install supabase

# Flutter
flutter pub add supabase_flutter

# Kotlin
implementation("io.github.jan-tennert.supabase:supabase-kt-bom:VERSION")
```

## Authentication & API Keys

### API Key Types

#### Anonymous Key (anon)
- **Purpose**: Public client-side authentication
- **Security**: Safe to expose in frontend code
- **Access**: Limited by Row Level Security (RLS) policies
- **Usage**: Default key for client applications

#### Publishable Key
- **Purpose**: Improved version of anon key
- **Security**: Safe to expose publicly
- **Features**: Enhanced security checks
- **Recommendation**: Use instead of anon key when available

#### Service Role Key
- **Purpose**: Server-side operations with full access
- **Security**: NEVER expose in client-side code
- **Access**: Bypasses RLS policies
- **Usage**: Server environments, Edge Functions, admin operations

#### Secret Key
- **Purpose**: Improved version of service role key
- **Security**: Additional misuse protection
- **Features**: Browser detection, enhanced validation
- **Recommendation**: Use instead of service role key

### Authentication Headers
```typescript
// Client-side with anon key
const headers = {
  'apikey': 'your-anon-key',
  'Authorization': 'Bearer your-anon-key',
  'Content-Type': 'application/json'
};

// Server-side with service role
const headers = {
  'apikey': 'your-service-role-key',
  'Authorization': 'Bearer your-service-role-key',
  'Content-Type': 'application/json'
};

// With user JWT token
const headers = {
  'apikey': 'your-anon-key',
  'Authorization': 'Bearer user-jwt-token',
  'Content-Type': 'application/json'
};
```

## Database API (PostgREST)

Supabase automatically generates a REST API from your database schema using PostgREST.

### Base URL Structure
```
https://<project_ref>.supabase.co/rest/v1/
```

### Core Operations

#### SELECT Queries
```typescript
// Basic select
GET /rest/v1/users?select=*

// Select specific columns
GET /rest/v1/users?select=id,name,email

// Select with relationships
GET /rest/v1/users?select=id,name,posts(title,content)

// Select with count
GET /rest/v1/users?select=*&count=estimated
```

#### Filtering
```typescript
// Equal
GET /rest/v1/users?email=eq.john@example.com

// Not equal
GET /rest/v1/users?status=neq.inactive

// Greater than
GET /rest/v1/users?age=gt.18

// Greater than or equal
GET /rest/v1/users?age=gte.21

// Less than
GET /rest/v1/users?age=lt.65

// Less than or equal
GET /rest/v1/users?age=lte.64

// Like (pattern matching)
GET /rest/v1/users?name=like.*john*

// In array
GET /rest/v1/users?status=in.(active,pending)

// Is null
GET /rest/v1/users?deleted_at=is.null

// Is not null
GET /rest/v1/users?email=not.is.null

// Full text search
GET /rest/v1/posts?content=fts.supabase

// JSON operators
GET /rest/v1/users?metadata->role=eq.admin
GET /rest/v1/users?metadata->>age=eq.25
```

#### Ordering and Limiting
```typescript
// Order by
GET /rest/v1/users?order=created_at.desc

// Multiple order columns
GET /rest/v1/users?order=last_name.asc,first_name.asc

// Limit and offset
GET /rest/v1/users?limit=10&offset=20

// Range (alternative to limit/offset)
GET /rest/v1/users
Range: 0-9
```

#### INSERT Operations
```typescript
// Single insert
POST /rest/v1/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}

// Multiple insert
POST /rest/v1/users
[
  {"name": "John", "email": "john@example.com"},
  {"name": "Jane", "email": "jane@example.com"}
]

// Insert with return
POST /rest/v1/users?select=id,name
Prefer: return=representation

// Upsert (insert or update)
POST /rest/v1/users?on_conflict=email
Prefer: resolution=merge-duplicates
```

#### UPDATE Operations
```typescript
// Update with filter
PATCH /rest/v1/users?id=eq.123
{
  "name": "Updated Name",
  "updated_at": "2024-01-01T00:00:00Z"
}

// Update with return
PATCH /rest/v1/users?id=eq.123&select=*
Prefer: return=representation

// Bulk update
PATCH /rest/v1/users?status=eq.pending
{
  "status": "active"
}
```

#### DELETE Operations
```typescript
// Delete with filter
DELETE /rest/v1/users?id=eq.123

// Delete with return
DELETE /rest/v1/users?id=eq.123&select=*
Prefer: return=representation

// Bulk delete
DELETE /rest/v1/users?status=eq.inactive
```

#### RPC (Remote Procedure Calls)
```typescript
// Call a stored procedure
POST /rest/v1/rpc/function_name
{
  "param1": "value1",
  "param2": "value2"
}

// Call with return data
POST /rest/v1/rpc/get_user_stats?select=*
{
  "user_id": 123
}
```

### Advanced Querying

#### Nested Relationships
```typescript
// One-to-many
GET /rest/v1/users?select=name,posts(title,created_at)

// Many-to-many
GET /rest/v1/users?select=name,user_roles(role:roles(name))

// Multiple levels deep
GET /rest/v1/users?select=name,posts(title,comments(content,author:users(name)))

// Filtering on related tables
GET /rest/v1/users?select=*,posts(*)&posts.status=eq.published

// Counting related records
GET /rest/v1/users?select=name,posts(count)
```

#### JSON Operations
```typescript
// JSON column access
GET /rest/v1/users?select=metadata->preferences->theme

// JSON array elements
GET /rest/v1/users?select=tags->0

// JSON array contains
GET /rest/v1/users?tags=cs.{gaming}

// JSON object contains
GET /rest/v1/users?metadata=cs.{"role":"admin"}
```

#### Full-Text Search
```typescript
// Basic text search
GET /rest/v1/posts?title=fts.supabase

// Search with language
GET /rest/v1/posts?title=fts(english).supabase

// Search multiple columns
GET /rest/v1/posts?or=(title.fts.supabase,content.fts.supabase)

// Phrase search
GET /rest/v1/posts?title=plfts.supabase database

// Web search
GET /rest/v1/posts?title=wfts.supabase OR database
```

### Request Headers
```typescript
// Standard headers
{
  'apikey': 'your-api-key',
  'Authorization': 'Bearer token',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

// Preferences
{
  'Prefer': 'return=representation',  // Return inserted/updated data
  'Prefer': 'return=minimal',         // Don't return data
  'Prefer': 'resolution=merge-duplicates', // Upsert behavior
  'Prefer': 'resolution=ignore-duplicates', // Ignore conflicts
  'Prefer': 'count=exact',            // Get exact count
  'Prefer': 'count=estimated'         // Get estimated count (faster)
}

// Range for pagination
{
  'Range': '0-9',    // First 10 records
  'Range': '10-19'   // Next 10 records
}
```

## Authentication API

### Base URL
```
https://<project_ref>.supabase.co/auth/v1/
```

### User Registration

#### Email/Password Signup
```typescript
POST /auth/v1/signup
{
  "email": "user@example.com",
  "password": "securepassword",
  "data": {
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### Phone/SMS Signup
```typescript
POST /auth/v1/signup
{
  "phone": "+1234567890",
  "password": "securepassword"
}
```

### User Login

#### Email/Password Login
```typescript
POST /auth/v1/token?grant_type=password
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Magic Link Login
```typescript
POST /auth/v1/magiclink
{
  "email": "user@example.com"
}
```

#### Phone/OTP Login
```typescript
POST /auth/v1/otp
{
  "phone": "+1234567890"
}

// Verify OTP
POST /auth/v1/verify
{
  "phone": "+1234567890",
  "token": "123456",
  "type": "sms"
}
```

### OAuth Providers
```typescript
// Initiate OAuth flow
GET /auth/v1/authorize?provider=google
GET /auth/v1/authorize?provider=github
GET /auth/v1/authorize?provider=facebook
GET /auth/v1/authorize?provider=apple
GET /auth/v1/authorize?provider=twitter
GET /auth/v1/authorize?provider=linkedin
GET /auth/v1/authorize?provider=discord
GET /auth/v1/authorize?provider=slack

// With redirect URL
GET /auth/v1/authorize?provider=google&redirect_to=https://myapp.com/callback
```

### Session Management

#### Get Current User
```typescript
GET /auth/v1/user
Authorization: Bearer <jwt_token>
```

#### Refresh Token
```typescript
POST /auth/v1/token?grant_type=refresh_token
{
  "refresh_token": "your-refresh-token"
}
```

#### Update User
```typescript
PUT /auth/v1/user
Authorization: Bearer <jwt_token>
{
  "data": {
    "first_name": "Updated Name"
  }
}
```

#### Change Password
```typescript
PUT /auth/v1/user
Authorization: Bearer <jwt_token>
{
  "password": "new-secure-password"
}
```

#### Logout
```typescript
POST /auth/v1/logout
Authorization: Bearer <jwt_token>
```

### Password Recovery
```typescript
// Send reset email
POST /auth/v1/recover
{
  "email": "user@example.com"
}

// Reset password with token
PUT /auth/v1/user
Authorization: Bearer <reset_token>
{
  "password": "new-password"
}
```

### Multi-Factor Authentication

#### Enroll Factor
```typescript
POST /auth/v1/factors
Authorization: Bearer <jwt_token>
{
  "factor_type": "totp",
  "friendly_name": "My Authenticator"
}
```

#### Verify Factor
```typescript
POST /auth/v1/factors/{factor_id}/verify
Authorization: Bearer <jwt_token>
{
  "code": "123456"
}
```

#### Challenge Factor
```typescript
POST /auth/v1/factors/{factor_id}/challenge
Authorization: Bearer <jwt_token>
```

### Auth Response Format
```typescript
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user: {
    id: string;
    email?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    email_confirmed_at?: string;
    phone_confirmed_at?: string;
    last_sign_in_at?: string;
    user_metadata: Record<string, any>;
    app_metadata: Record<string, any>;
  };
}
```

## Storage API

Supabase Storage provides S3-compatible object storage with transformation capabilities.

### Base URL
```
https://<project_ref>.supabase.co/storage/v1/
```

### Bucket Management

#### Create Bucket
```typescript
POST /storage/v1/bucket
{
  "id": "my-bucket",
  "name": "My Bucket",
  "public": false,
  "file_size_limit": 50000000,
  "allowed_mime_types": ["image/jpeg", "image/png"]
}
```

#### List Buckets
```typescript
GET /storage/v1/bucket
```

#### Get Bucket Details
```typescript
GET /storage/v1/bucket/{bucket_id}
```

#### Update Bucket
```typescript
PUT /storage/v1/bucket/{bucket_id}
{
  "public": true,
  "file_size_limit": 100000000
}
```

#### Delete Bucket
```typescript
DELETE /storage/v1/bucket/{bucket_id}
```

#### Empty Bucket
```typescript
POST /storage/v1/bucket/{bucket_id}/empty
```

### Object Operations

#### Upload File
```typescript
POST /storage/v1/object/{bucket_id}/{file_path}
Content-Type: image/jpeg
Content-Length: 12345

[file_data]

// With options
POST /storage/v1/object/{bucket_id}/{file_path}?upsert=true
```

#### Download File
```typescript
GET /storage/v1/object/{bucket_id}/{file_path}

// With transformation
GET /storage/v1/object/{bucket_id}/{file_path}?width=300&height=200&resize=cover
```

#### List Objects
```typescript
POST /storage/v1/object/list/{bucket_id}
{
  "limit": 100,
  "offset": 0,
  "prefix": "folder/",
  "search": "filename"
}
```

#### Get Object Info
```typescript
GET /storage/v1/object/info/{bucket_id}/{file_path}
```

#### Update Object
```typescript
PUT /storage/v1/object/{bucket_id}/{file_path}
Content-Type: image/jpeg

[new_file_data]
```

#### Move Object
```typescript
POST /storage/v1/object/move
{
  "bucketId": "source-bucket",
  "sourceKey": "old/path/file.jpg",
  "destinationBucket": "dest-bucket",
  "destinationKey": "new/path/file.jpg"
}
```

#### Copy Object
```typescript
POST /storage/v1/object/copy
{
  "bucketId": "source-bucket",
  "sourceKey": "source/file.jpg",
  "destinationBucket": "dest-bucket",
  "destinationKey": "dest/file.jpg"
}
```

#### Delete Objects
```typescript
DELETE /storage/v1/object/{bucket_id}
{
  "prefixes": ["folder1/file1.jpg", "folder2/file2.png"]
}
```

### Signed URLs

#### Create Signed URL
```typescript
POST /storage/v1/object/sign/{bucket_id}/{file_path}
{
  "expiresIn": 3600
}
```

#### Create Multiple Signed URLs
```typescript
POST /storage/v1/object/sign/{bucket_id}
{
  "expiresIn": 3600,
  "paths": ["file1.jpg", "file2.png"]
}
```

### Image Transformations
```typescript
// Resize
GET /storage/v1/object/{bucket_id}/{file_path}?width=300&height=200

// Resize modes
GET /storage/v1/object/{bucket_id}/{file_path}?width=300&height=200&resize=cover
GET /storage/v1/object/{bucket_id}/{file_path}?width=300&height=200&resize=contain
GET /storage/v1/object/{bucket_id}/{file_path}?width=300&height=200&resize=fill

// Quality
GET /storage/v1/object/{bucket_id}/{file_path}?quality=80

// Format conversion
GET /storage/v1/object/{bucket_id}/{file_path}?format=webp

// Combined transformations
GET /storage/v1/object/{bucket_id}/{file_path}?width=300&height=200&resize=cover&quality=80&format=webp
```

### Storage Policies
```sql
-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-bucket');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-uploads' AND
    auth.role() = 'authenticated'
  );

-- Allow users to manage their own files
CREATE POLICY "User manages own files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Realtime API

Supabase Realtime provides three main features: Database Changes, Broadcast, and Presence.

### WebSocket Connection
```typescript
// Connect to realtime
const websocket = new WebSocket(
  'wss://<project_ref>.supabase.co/realtime/v1/websocket',
  ['realtime']
);

// Authentication
websocket.send(JSON.stringify({
  topic: 'realtime',
  event: 'access_token',
  payload: {
    access_token: 'your-jwt-token'
  }
}));
```

### Database Changes

#### Subscribe to Table Changes
```typescript
// Subscribe to all changes
{
  "topic": "realtime:public:users",
  "event": "phx_join",
  "payload": {
    "config": {
      "postgres_changes": [
        {
          "event": "*",
          "schema": "public",
          "table": "users"
        }
      ]
    }
  }
}

// Subscribe to specific events
{
  "topic": "realtime:public:users",
  "event": "phx_join",
  "payload": {
    "config": {
      "postgres_changes": [
        {
          "event": "INSERT",
          "schema": "public",
          "table": "users"
        },
        {
          "event": "UPDATE",
          "schema": "public",
          "table": "users"
        }
      ]
    }
  }
}

// Subscribe with filters
{
  "topic": "realtime:public:users",
  "event": "phx_join",
  "payload": {
    "config": {
      "postgres_changes": [
        {
          "event": "UPDATE",
          "schema": "public",
          "table": "users",
          "filter": "status=eq.active"
        }
      ]
    }
  }
}
```

#### Database Change Events
```typescript
// INSERT event
{
  "event": "postgres_changes",
  "payload": {
    "data": {
      "type": "INSERT",
      "table": "users",
      "schema": "public",
      "columns": [
        {"name": "id", "type": "int8"},
        {"name": "name", "type": "text"},
        {"name": "email", "type": "text"}
      ],
      "record": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "old_record": null
    }
  }
}

// UPDATE event
{
  "event": "postgres_changes",
  "payload": {
    "data": {
      "type": "UPDATE",
      "table": "users",
      "schema": "public",
      "columns": [...],
      "record": {
        "id": 1,
        "name": "John Updated",
        "email": "john@example.com"
      },
      "old_record": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}

// DELETE event
{
  "event": "postgres_changes",
  "payload": {
    "data": {
      "type": "DELETE",
      "table": "users",
      "schema": "public",
      "columns": [...],
      "record": null,
      "old_record": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

### Broadcast

#### Join Broadcast Channel
```typescript
{
  "topic": "realtime:my-channel",
  "event": "phx_join",
  "payload": {
    "config": {
      "broadcast": {
        "self": false
      }
    }
  }
}
```

#### Send Broadcast Message
```typescript
{
  "topic": "realtime:my-channel",
  "event": "broadcast",
  "payload": {
    "type": "cursor_move",
    "event": "cursor_move",
    "payload": {
      "x": 100,
      "y": 200,
      "user_id": "user-123"
    }
  }
}
```

#### Receive Broadcast Message
```typescript
{
  "event": "broadcast",
  "payload": {
    "type": "cursor_move",
    "event": "cursor_move",
    "payload": {
      "x": 100,
      "y": 200,
      "user_id": "user-123"
    }
  }
}
```

### Presence

#### Track Presence
```typescript
{
  "topic": "realtime:my-channel",
  "event": "presence",
  "payload": {
    "type": "track",
    "event": "track",
    "payload": {
      "user_id": "user-123",
      "name": "John Doe",
      "status": "online",
      "cursor": { "x": 100, "y": 200 }
    }
  }
}
```

#### Untrack Presence
```typescript
{
  "topic": "realtime:my-channel",
  "event": "presence",
  "payload": {
    "type": "untrack",
    "event": "untrack"
  }
}
```

#### Presence State Updates
```typescript
// Presence sync (full state)
{
  "event": "presence_state",
  "payload": {
    "user-123": {
      "metas": [
        {
          "name": "John Doe",
          "status": "online",
          "phx_ref": "ref-1"
        }
      ]
    },
    "user-456": {
      "metas": [
        {
          "name": "Jane Smith",
          "status": "away",
          "phx_ref": "ref-2"
        }
      ]
    }
  }
}

// Presence diff (changes only)
{
  "event": "presence_diff",
  "payload": {
    "joins": {
      "user-789": {
        "metas": [
          {
            "name": "Bob Wilson",
            "status": "online",
            "phx_ref": "ref-3"
          }
        ]
      }
    },
    "leaves": {
      "user-456": {
        "metas": [
          {
            "name": "Jane Smith",
            "status": "away",
            "phx_ref": "ref-2"
          }
        ]
      }
    }
  }
}
```

## Edge Functions

Supabase Edge Functions are globally distributed Deno-based serverless functions.

### Function Structure
```typescript
// Basic function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  const { name } = await req.json();
  
  return new Response(
    JSON.stringify({ 
      message: `Hello ${name}!` 
    }),
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
});
```

### Function with Supabase Client
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

serve(async (req: Request) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { 
          Authorization: req.headers.get('Authorization')! 
        },
      },
    }
  );

  // Get authenticated user
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: { user } } = await supabaseClient.auth.getUser(token);

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Query database with RLS
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', user.id);

  return new Response(JSON.stringify({ user, data }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### CORS Handling
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Your function logic here
    const data = { message: 'Success' };

    return new Response(JSON.stringify(data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});
```

### Invoking Functions

#### From Client
```typescript
// Using supabase-js
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { name: 'World' }
});

// Direct HTTP call
const response = await fetch(
  'https://<project_ref>.supabase.co/functions/v1/function-name',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'World' })
  }
);
```

#### With Authentication
```typescript
const { data, error } = await supabase.functions.invoke('private-function', {
  body: { message: 'Hello' },
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});
```

### Background Tasks
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  const { urls } = await req.json();

  // Start background task
  const backgroundTask = async () => {
    for (const url of urls) {
      await fetch(url);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Ensure function doesn't terminate until background task completes
  // @ts-ignore
  globalThis.EdgeRuntime?.waitUntil(backgroundTask());

  return new Response(
    JSON.stringify({ message: 'Processing started' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### WebSockets Support
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Not a websocket request', { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener('open', () => {
    console.log('WebSocket connected');
  });

  socket.addEventListener('message', (event) => {
    console.log('Received:', event.data);
    socket.send(`Echo: ${event.data}`);
  });

  socket.addEventListener('close', () => {
    console.log('WebSocket disconnected');
  });

  return response;
});
```

## Management API

The Management API allows you to manage Supabase projects and organizations programmatically.

### Base URL
```
https://api.supabase.com/v1
```

### Authentication
```typescript
const headers = {
  'Authorization': 'Bearer <personal_access_token>',
  'Content-Type': 'application/json'
};
```

### Organizations

#### List Organizations
```typescript
GET /v1/organizations
```

#### Create Organization
```typescript
POST /v1/organizations
{
  "name": "My Organization",
  "tier": "free"
}
```

### Projects

#### List Projects
```typescript
GET /v1/projects
```

#### Create Project
```typescript
POST /v1/projects
{
  "organization_id": "org-id",
  "name": "My Project",
  "plan": "free",
  "region": "us-east-1",
  "db_pass": "secure-password"
}
```

#### Get Project
```typescript
GET /v1/projects/{project_ref}
```

#### Update Project
```typescript
PATCH /v1/projects/{project_ref}
{
  "name": "Updated Project Name"
}  
```

#### Delete Project
```typescript
DELETE /v1/projects/{project_ref}
```

### Project Configuration

#### Get Project API Keys
```typescript
GET /v1/projects/{project_ref}/api-keys
```

#### Update Project Config
```typescript
POST /v1/projects/{project_ref}/config
{
  "site_url": "https://myapp.com",
  "jwt_exp": 3600
}
```

### Database Management

#### Get Database Info
```typescript
GET /v1/projects/{project_ref}/database
```

#### Create Database Backup
```typescript
POST /v1/projects/{project_ref}/database/backups
```

#### List Database Backups
```typescript
GET /v1/projects/{project_ref}/database/backups
```

### Rate Limiting
- **Limit**: 60 requests per minute per user
- **Headers**: Check `X-RateLimit-*` headers
- **Status**: 429 Too Many Requests when exceeded

## Database Webhooks

Database Webhooks trigger HTTP requests when database events occur.

### Webhook Payload Types
```typescript
interface InsertPayload {
  type: 'INSERT';
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: null;
}

interface UpdatePayload {
  type: 'UPDATE';
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any>;
}

interface DeletePayload {
  type: 'DELETE';
  table: string;
  schema: string;
  record: null;
  old_record: Record<string, any>;
}
```

### Creating Webhooks

#### Via Dashboard
1. Go to Database → Webhooks
2. Click "Create a new hook"
3. Configure table, events, and URL
4. Set HTTP method and headers

#### Via SQL
```sql
-- Create webhook trigger
CREATE TRIGGER webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://your-endpoint.com/webhook',
    'POST',
    '{"Content-Type": "application/json"}',
    '{}',
    '5000'
  );
```

### Webhook Security
```typescript
// Verify webhook signature (if implemented)
const verifyWebhook = (payload: string, signature: string, secret: string) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
};

// Express webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-supabase-signature'];
  const isValid = verifyWebhook(
    JSON.stringify(req.body), 
    signature, 
    process.env.WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).send('Unauthorized');
  }

  const { type, table, record, old_record } = req.body;

  switch (type) {
    case 'INSERT':
      console.log(`New ${table} record:`, record);
      break;
    case 'UPDATE':
      console.log(`Updated ${table} record:`, record);
      console.log(`Previous values:`, old_record);
      break;
    case 'DELETE':
      console.log(`Deleted ${table} record:`, old_record);
      break;
  }

  res.status(200).send('OK');
});
```

## Client Libraries

### JavaScript/TypeScript

#### Installation & Setup
```bash
npm install @supabase/supabase-js
```

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

#### Database Operations
```typescript
// Select
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('users')
  .insert([
    { name: 'John', email: 'john@example.com' }
  ])
  .select();

// Update
const { data, error } = await supabase
  .from('users')
  .update({ name: 'John Updated' })
  .eq('id', 1)
  .select();

// Delete
const { data, error } = await supabase
  .from('users')
  .delete()
  .eq('id', 1);

// RPC
const { data, error } = await supabase
  .rpc('get_user_stats', { user_id: 1 });
```

#### Authentication
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe'
    }
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://myapp.com/callback'
  }
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});
```

#### Storage
```typescript
// Upload
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/to/file.jpg', file);

// Download
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/to/file.jpg');

// Get public URL
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/to/file.jpg');

// Create signed URL
const { data, error } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl('path/to/file.jpg', 3600);
```

#### Realtime
```typescript
// Subscribe to database changes
const channel = supabase
  .channel('users-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'users' },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// Broadcast
const channel = supabase.channel('my-channel');

channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.send({
      type: 'broadcast',
      event: 'cursor-pos',
      payload: { x: 100, y: 200 }
    });
  }
});

// Presence
const channel = supabase.channel('presence-channel', {
  config: {
    presence: {
      key: 'user-123'
    }
  }
});

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  console.log('Online users:', state);
});

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      user_id: 'user-123',
      status: 'online'
    });
  }
});
```

### React Hooks

```typescript
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

// Custom hook for data fetching
function useSupabaseQuery<T>(
  table: string,
  query?: (builder: any) => any
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let builder = supabase.from(table).select('*');
        
        if (query) {
          builder = query(builder);
        }

        const { data, error } = await builder;

        if (error) throw error;
        setData(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [table]);

  return { data, loading, error };
}

// Usage
function UsersList() {
  const { data: users, loading, error } = useSupabaseQuery(
    'users',
    (query) => query.eq('status', 'active').order('created_at')
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### TypeScript Types

#### Generate Types
```bash
# Install CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Generate types
supabase gen types typescript --local > types/supabase.ts
```

#### Use Generated Types
```typescript
import { Database } from './types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Now you get full type safety
const { data, error } = await supabase
  .from('users') // ✅ Autocomplete and type checking
  .select('id, name, email') // ✅ Column names are validated
  .eq('status', 'active'); // ✅ Values are type-checked
```

## Code Examples

### Complete CRUD Operations
```typescript
class UserService {
  constructor(private supabase: SupabaseClient) {}

  async getUsers(filters?: { status?: string; limit?: number }) {
    let query = this.supabase
      .from('users')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async createUser(userData: Partial<User>) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteUser(id: string) {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async searchUsers(query: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

    if (error) throw new Error(error.message);
    return data;
  }
}
```

### Real-time Chat Application
```typescript
class ChatService {
  private channel: RealtimeChannel;

  constructor(
    private supabase: SupabaseClient,
    private roomId: string
  ) {
    this.channel = this.supabase.channel(`chat-${roomId}`);
  }

  async joinRoom(userId: string, userName: string) {
    // Subscribe to new messages
    this.channel
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message:', payload.new);
          this.onNewMessage?.(payload.new as Message);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this.onPresenceUpdate?.(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await this.channel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString()
          });
        }
      });
  }

  async sendMessage(content: string, userId: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .insert([{
        content,
        user_id: userId,
        room_id: this.roomId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getMessageHistory(limit = 50) {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        users (
          id,
          name,
          avatar_url
        )
      `)
      .eq('room_id', this.roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data.reverse(); // Show oldest first
  }

  async leaveRoom() {
    await this.channel.untrack();
    await this.channel.unsubscribe();
  }

  // Callback handlers
  onNewMessage?: (message: Message) => void;
  onPresenceUpdate?: (state: any) => void;
}

// Usage
const chat = new ChatService(supabase, 'room-123');

chat.onNewMessage = (message) => {
  displayMessage(message);
};

chat.onPresenceUpdate = (state) => {
  updateOnlineUsers(state);
};

await chat.joinRoom('user-456', 'John Doe');
```

### File Upload with Progress
```typescript
class FileUploadService {
  constructor(private supabase: SupabaseClient) {}

  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: {
      onProgress?: (progress: number) => void;
      upsert?: boolean;
    }
  ) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          options?.onProgress?.(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const { data } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          resolve(data.publicUrl);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      const formData = new FormData();
      formData.append('file', file);

      const url = `${this.supabase.supabaseUrl}/storage/v1/object/${bucket}/${path}`;
      const upsertParam = options?.upsert ? '?upsert=true' : '';

      xhr.open('POST', url + upsertParam);
      xhr.setRequestHeader('Authorization', `Bearer ${this.supabase.supabaseKey}`);
      xhr.setRequestHeader('apikey', this.supabase.supabaseKey);
      xhr.send(formData);
    });
  }

  async uploadMultipleFiles(
    bucket: string,
    files: { file: File; path: string }[],
    onProgress?: (overall: number, fileProgress: Record<string, number>) => void
  ) {
    const fileProgress: Record<string, number> = {};
    const promises = files.map(({ file, path }) =>
      this.uploadFile(bucket, path, file, {
        onProgress: (progress) => {
          fileProgress[path] = progress;
          const overall = Object.values(fileProgress).reduce((a, b) => a + b, 0) / files.length;
          onProgress?.(overall, fileProgress);
        }
      })
    );

    return await Promise.all(promises);
  }

  async createResumableUpload(bucket: string, path: string, file: File) {
    // For large files, use TUS resumable uploads
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        // Enable resumable upload for files > 6MB
        duplex: 'half'
      });

    if (error) throw new Error(error.message);
    return data;
  }
}
```

### Authentication with Middleware
```typescript
// Next.js middleware example
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect authenticated routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (req.nextUrl.pathname.startsWith('/login')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
};

// React Auth Provider
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Best Practices

### Security

#### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Public read, authenticated write
CREATE POLICY "Public read access" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Role-based access
CREATE POLICY "Admins can manage all posts" ON posts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

#### API Key Management
```typescript
// Environment variables
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-only
};

// Client configuration
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

// Server configuration (use service key cautiously)
const supabaseAdmin = createClient(
  config.supabaseUrl, 
  config.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### Performance

#### Query Optimization
```typescript
// ✅ Good: Select only needed columns
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at')
  .limit(10);

// ❌ Bad: Select all columns
const { data } = await supabase
  .from('posts')
  .select('*');

// ✅ Good: Use appropriate limits
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(0, 9); // First 10 records

// ✅ Good: Use indexes for filtering
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId) // Ensure user_id is indexed
  .eq('status', 'published'); // Ensure status is indexed
```

#### Caching Strategy
```typescript
// Client-side caching
class CachedSupabaseClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  async cachedQuery(key: string, queryFn: () => Promise<any>) {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.ttl) {
      return cached.data;
    }

    const data = await queryFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  async getUsers() {
    return this.cachedQuery('users', () =>
      supabase.from('users').select('*')
    );
  }
}

// React Query integration
import { useQuery } from '@tanstack/react-query';

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Database Design

#### Optimized Schema
```sql
-- Use appropriate data types
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Use foreign keys for relationships
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Use computed columns for common queries
ALTER TABLE users ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
  COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
) STORED;
```

#### Database Functions
```sql
-- Create reusable functions
CREATE OR REPLACE FUNCTION get_user_post_count(user_uuid UUID)
RETURNS INTEGER AS $
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM posts
    WHERE user_id = user_uuid AND status = 'published'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Error Handling

#### Comprehensive Error Handling
```typescript
class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

class DatabaseService {
  private handleError(error: any): never {
    if (error.code === 'PGRST116') {
      throw new SupabaseError('Record not found', '404', error);
    }
    
    if (error.code === '23505') {
      throw new SupabaseError('Record already exists', '409', error);
    }
    
    if (error.code === '42501') {
      throw new SupabaseError('Permission denied', '403', error);
    }

    throw new SupabaseError(error.message || 'Database error', '500', error);
  }

  async safeQuery<T>(queryFn: () => Promise<{ data: T; error: any }>) {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        this.handleError(error);
      }
      
      return data;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      
      throw new SupabaseError('Unexpected error occurred', '500', error);
    }
  }
}

// Usage with retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Don't retry client errors
      if (error instanceof SupabaseError && error.code?.startsWith('4')) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Testing

#### Unit Testing with Jest
```typescript
// __mocks__/@supabase/supabase-js.ts
export const createClient = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  })),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
}));

// userService.test.ts
import { UserService } from '../services/UserService';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');

describe('UserService', () => {
  let userService: UserService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createClient();
    userService = new UserService(mockSupabase);
    jest.clearAllMocks();
  });

  test('should get users successfully', async () => {
    const mockUsers = [{ id: 1, name: 'John' }];
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }),
    });

    const result = await userService.getUsers();
    
    expect(result).toEqual(mockUsers);
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
  });

  test('should handle errors properly', async () => {
    const mockError = { message: 'Database error' };
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });

    await expect(userService.getUsers()).rejects.toThrow('Database error');
  });
});
```

#### Integration Testing
```typescript
// integration.test.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_ANON_KEY!
);

describe('Supabase Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await supabase.from('test_users').delete().neq('id', 0);
  });

  test('should create and retrieve user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
    };

    // Create user
    const { data: createdUser, error: createError } = await supabase
      .from('test_users')
      .insert([userData])
      .select()
      .single();

    expect(createError).toBeNull();
    expect(createdUser).toMatchObject(userData);

    // Retrieve user
    const { data: retrievedUser, error: getError } = await supabase
      .from('test_users')
      .select('*')
      .eq('id', createdUser.id)
      .single();

    expect(getError).toBeNull();
    expect(retrievedUser).toMatchObject(userData);
  });
});
```

### Deployment

#### Environment Configuration
```typescript
// config/supabase.ts
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

const configs: Record<string, SupabaseConfig> = {
  development: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_DEV,
  },
  staging: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_STAGING!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING,
  },
  production: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

const env = process.env.NODE_ENV as keyof typeof configs;
export const supabaseConfig = configs[env] || configs.development;

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey
);
```

#### Database Migrations
```sql
-- migrations/001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Supabase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        env:
          SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_TEST_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
          
      - name: Install Supabase CLI
        run: npm install -g supabase
        
      - name: Deploy migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
          
      - name: Deploy Edge Functions
        run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

## Error Handling

### Common Error Codes

#### Database Errors
```typescript
const DATABASE_ERRORS = {
  'PGRST116': 'Resource not found',
  'PGRST301': 'Invalid JSON',
  '23505': 'Unique constraint violation',
  '23503': 'Foreign key constraint violation', 
  '42501': 'Insufficient privileges',
  '42P01': 'Table does not exist',
  '42703': 'Column does not exist',
} as const;
```

#### Auth Errors
```typescript
const AUTH_ERRORS = {
  'invalid_credentials': 'Invalid email or password',
  'email_not_confirmed': 'Email not confirmed',
  'user_not_found': 'User not found',
  'signup_disabled': 'Signups are disabled',
  'email_address_invalid': 'Invalid email address',
  'password_too_short': 'Password is too short',
  'weak_password': 'Password is too weak',
} as const;
```

#### Storage Errors
```typescript
const STORAGE_ERRORS = {
  'BucketNotFound': 'Bucket does not exist',
  'ObjectNotFound': 'File does not exist',
  'InvalidMimeType': 'File type not allowed',
  'FileSizeExceeded': 'File size too large',
  'BucketAlreadyExists': 'Bucket already exists',
} as const;
```

### Error Handling Utilities
```typescript
interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
  statusCode: number;
}

class ErrorHandler {
  static handle(error: any): ErrorResponse {
    // Database errors
    if (error.code && DATABASE_ERRORS[error.code as keyof typeof DATABASE_ERRORS]) {
      return {
        message: DATABASE_ERRORS[error.code as keyof typeof DATABASE_ERRORS],
        code: error.code,
        details: error.details,
        statusCode: this.getStatusCode(error.code),
      };
    }

    // Auth errors
    if (error.message && AUTH_ERRORS[error.message as keyof typeof AUTH_ERRORS]) {
      return {
        message: AUTH_ERRORS[error.message as keyof typeof AUTH_ERRORS],
        code: error.message,
        statusCode: 401,
      };
    }

    // Storage errors
    if (error.error && STORAGE_ERRORS[error.error as keyof typeof STORAGE_ERRORS]) {
      return {
        message: STORAGE_ERRORS[error.error as keyof typeof STORAGE_ERRORS],
        code: error.error,
        statusCode: 400,
      };
    }

    // Generic error
    return {
      message: error.message || 'An unexpected error occurred',
      code: error.code,
      details: error.details,
      statusCode: 500,
    };
  }

  private static getStatusCode(code: string): number {
    switch (code) {
      case 'PGRST116': return 404;
      case '23505': return 409;
      case '23503': return 400;
      case '42501': return 403;
      case '42P01':
      case '42703': return 400;
      default: return 500;
    }
  }
}

// Usage
try {
  const { data, error } = await supabase
    .from('users')
    .select('*');
    
  if (error) {
    const errorResponse = ErrorHandler.handle(error);
    throw new Error(errorResponse.message);
  }
} catch (error) {
  console.error('Database operation failed:', error);
}
```

### React Error Boundaries
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SupabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Supabase Error Boundary caught an error:', error, errorInfo);
    
    // Log to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </details>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Advanced Features

### Custom Hooks for Complex Operations
```typescript
// useSupabaseSubscription.ts
import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSupabaseSubscriptionOptions<T> {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { new: T; old: T }) => void;
  onDelete?: (payload: { old: T }) => void;
}

export function useSupabaseSubscription<T = any>(
  options: UseSupabaseSubscriptionOptions<T>
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channelName = `${options.schema || 'public'}:${options.table}`;
    const newChannel = supabase.channel(channelName);

    newChannel
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: options.table,
          filter: options.filter,
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              options.onInsert?.(payload.new as T);
              break;
            case 'UPDATE':
              options.onUpdate?.({
                new: payload.new as T,
                old: payload.old as T,
              });
              break;
            case 'DELETE':
              options.onDelete?.({ old: payload.old as T });
              break;
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [options.table, options.schema, options.filter, options.event]);

  return { channel, isConnected };
}

// Usage
function MessageList({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useSupabaseSubscription<Message>({
    table: 'messages',
    filter: `chat_id=eq.${chatId}`,
    event: 'INSERT',
    onInsert: (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    },
  });

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
    </div>
  );
}
```

### Advanced Storage Management
```typescript
class AdvancedStorageService {
  constructor(private supabase: SupabaseClient) {}

  async uploadWithMetadata(
    bucket: string,
    path: string,
    file: File,
    metadata: Record<string, string> = {}
  ) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          size: file.size.toString(),
        },
      });

    if (error) throw error;
    return data;
  }

  async createImageVariants(
    bucket: string,
    originalPath: string,
    variants: Array<{ suffix: string; width: number; height?: number }>
  ) {
    const results = await Promise.allSettled(
      variants.map(async (variant) => {
        const variantPath = originalPath.replace(
          /(\.[^.]+)$/, 
          `_${variant.suffix}$1`
        );

        // This would typically involve an Edge Function or external service
        // for actual image processing
        const { data } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(originalPath, {
            transform: {
              width: variant.width,
              height: variant.height,
            },
          });

        return {
          variant: variant.suffix,
          url: data.publicUrl,
          path: variantPath,
        };
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  async getFileAnalytics(bucket: string, prefix?: string) {
    const { data: files, error } = await this.supabase.storage
      .from(bucket)
      .list(prefix, { limit: 1000 });

    if (error) throw error;

    const analytics = files.reduce((acc, file) => ({
      totalFiles: acc.totalFiles + 1,
      totalSize: acc.totalSize + (file.metadata?.size || 0),
      fileTypes: {
        ...acc.fileTypes,
        [file.metadata?.mimetype || 'unknown']: 
          (acc.fileTypes[file.metadata?.mimetype || 'unknown'] || 0) + 1,
      },
    }), {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {} as Record<string, number>,
    });

    return analytics;
  }

  async bulkDelete(bucket: string, paths: string[]) {
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < paths.length; i += batchSize) {
      batches.push(paths.slice(i, i + batchSize));
    }

    const results = await Promise.allSettled(
      batches.map(batch => 
        this.supabase.storage.from(bucket).remove(batch)
      )
    );

    const successCount = results
      .filter(result => result.status === 'fulfilled')
      .reduce((count, result) => 
        count + ((result as PromiseFulfilledResult<any>).value.data?.length || 0), 0
      );

    return { successCount, totalRequested: paths.length };
  }
}
```

### Database Connection Pooling
```typescript
class ConnectionPool {
  private clients: SupabaseClient[] = [];
  private availableClients: SupabaseClient[] = [];
  private readonly maxConnections: number;

  constructor(
    private config: { url: string; key: string },
    maxConnections = 10
  ) {
    this.maxConnections = maxConnections;
    this.initialize();
  }

  private initialize() {
    for (let i = 0; i < this.maxConnections; i++) {
      const client = createClient(this.config.url, this.config.key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
      
      this.clients.push(client);
      this.availableClients.push(client);
    }
  }

  async acquire(): Promise<SupabaseClient> {
    return new Promise((resolve) => {
      const checkForClient = () => {
        if (this.availableClients.length > 0) {
          const client = this.availableClients.pop()!;
          resolve(client);
        } else {
          setTimeout(checkForClient, 10);
        }
      };
      checkForClient();
    });
  }

  release(client: SupabaseClient) {
    if (this.clients.includes(client)) {
      this.availableClients.push(client);
    }
  }

  async withClient<T>(fn: (client: SupabaseClient) => Promise<T>): Promise<T> {
    const client = await this.acquire();
    try {
      return await fn(client);
    } finally {
      this.release(client);
    }
  }

  async close() {
    // Close all connections if needed
    this.clients.forEach(client => {
      // Supabase client doesn't have explicit close method
      // but you might want to unsubscribe from realtime channels
    });
    this.clients.length = 0;
    this.availableClients.length = 0;
  }
}

// Usage
const pool = new ConnectionPool({
  url: process.env.SUPABASE_URL!,
  key: process.env.SUPABASE_ANON_KEY!,
}, 5);

// Use the pool
const users = await pool.withClient(async (client) => {
  const { data, error } = await client.from('users').select('*');
  if (error) throw error;
  return data;
});
```

This comprehensive Supabase API documentation covers all major aspects of working with Supabase, from basic CRUD operations to advanced features like Edge Functions, real-time subscriptions, and production deployment strategies. The documentation includes practical code examples, best practices, and error handling patterns that you can use directly in your Cursor project with Claude Code.

The documentation is organized to serve as both a learning resource and a quick reference guide, with TypeScript examples throughout to ensure type safety and better developer experience.