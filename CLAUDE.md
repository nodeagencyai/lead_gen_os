# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Architecture

This is a React + TypeScript lead generation and outreach automation platform built with Vite. The application provides dual-mode functionality for email and LinkedIn campaigns.

### Core Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with dark theme
- **State Management**: Zustand with persistence
- **Database**: Supabase (PostgreSQL)
- **Automation**: N8N webhooks for campaign execution
- **Icons**: Lucide React

### Application Structure

**State Management:**
- Uses Zustand for campaign mode switching (email/linkedin)
- Campaign mode is persisted via localStorage
- Real-time data sync with Supabase subscriptions

**Navigation:**
- Single-page app with view-based routing
- Views: dashboard, leadfinder, campaigns, leads, integrations
- Mode toggle affects metrics and integrations displayed

**Data Flow:**
- `src/hooks/` contains custom hooks for data fetching
- `src/services/api.ts` handles all Supabase operations
- `src/store/campaignStore.ts` manages global campaign mode state

### Key Components

**Main Views:**
- `App.tsx` - Main dashboard with metrics and navigation
- `LeadFinder.tsx` - Lead generation interface
- `CampaignsOverview.tsx` - Campaign management
- `LeadsDatabase.tsx` - Lead management
- `IntegrationSetup.tsx` - Third-party platform connections

**Dashboard Components:**
- `PerformanceChart.tsx` - Metric visualization
- `CampaignToggle.tsx` - Email/LinkedIn mode switcher

### Database Schema

The Supabase schema includes:
- `campaigns` - Campaign definitions and settings
- `leads` - Contact information and status
- `campaign_leads` - Junction table with outreach status
- `automation_jobs` - N8N job tracking
- `templates` - Message templates
- `integrations` - Platform API credentials

### Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Integration Platforms

**Email Mode:**
- Apollo (lead scraping)
- Instantly (email automation)

**LinkedIn Mode:**
- Sales Navigator (lead scraping) 
- HeyReach (LinkedIn automation)

### N8N Automation

Campaign execution is handled via N8N webhooks:
- Lead scraping workflows
- Email campaign execution
- LinkedIn outreach automation
- Follow-up sequences

Update webhook URLs in `src/services/api.ts` for your N8N instance.

### Development Notes

- The app uses a consistent dark theme with specific color palette
- Component styling uses inline styles for hover effects
- All API calls include proper error handling
- Real-time updates use Supabase subscriptions
- Campaign metrics are calculated from database relationships