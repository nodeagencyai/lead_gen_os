# Instantly Campaign Integration Guide

## Overview

This document explains the integration of 3 specific Instantly campaigns with real data from Instantly's API v2.

## Integrated Campaigns

### 1. Digital Marketing Agencies
- **Campaign ID**: `4bde0574-609a-409d-86cc-52b233699a2b`
- **Share URL**: https://app.instantly.ai/share/campaign?id=4bde0574-609a-409d-86cc-52b233699a2b
- **Purpose**: Outreach to digital marketing agencies

### 2. Sales Development Representative
- **Campaign ID**: `2e3519c8-ac6f-4961-b803-e28c7423d080`
- **Share URL**: https://app.instantly.ai/share/campaign?id=2e3519c8-ac6f-4961-b803-e28c7423d080
- **Purpose**: SDR recruitment and outreach

### 3. Beta
- **Campaign ID**: `afe7fbea-9d4e-491f-88e4-8f75985b9c07`
- **Share URL**: https://app.instantly.ai/share/campaign?id=afe7fbea-9d4e-491f-88e4-8f75985b9c07
- **Purpose**: Beta testing program outreach

## Implementation Architecture

### Files Modified/Created

1. **`src/services/instantlyCampaignService.ts`** (NEW)
   - Main service for fetching real campaign data
   - Maps Instantly API responses to dashboard format
   - Handles campaign details, analytics, and sequences

2. **`src/hooks/useCampaignData.ts`** (UPDATED)
   - Now uses `InstantlyCampaignService` for real data
   - Removed old mock data approach
   - Cleaner implementation focused on 3 specific campaigns

3. **`src/services/integrationService.ts`** (UPDATED)
   - Updated sequence fetching to use real data
   - Falls back to mock data if real sequences unavailable

4. **`docs/instantly-api-reference.md`** (NEW)
   - Complete Instantly API v2 documentation
   - Reference for future development

## Data Flow

```
Campaign Dashboard
    ↓
useCampaignData Hook
    ↓
InstantlyCampaignService.fetchAllCampaigns()
    ↓
Parallel API calls for each campaign:
- getCampaignDetails() → Basic campaign info
- getCampaignAnalytics() → Performance metrics
- getCampaignSequences() → Email sequences
    ↓
Map to dashboard format
    ↓
Display in UI with real data
```

## API Endpoints Used

### Campaign Details
```
GET /api/instantly/v2/campaigns/{campaign_id}
```
Returns: Campaign name, status, schedule, leads count, sequences

### Campaign Analytics
```
GET /api/instantly/v2/campaigns/{campaign_id}/analytics
```
Returns: Email metrics, lead metrics, performance data

### Campaign Sequences
```
GET /api/instantly/v2/campaigns/{campaign_id}/sequences
```
Returns: Email templates, sequence steps, timing

## Data Mapping

### Campaign Status
- `0` → `Draft` (Blue)
- `1` → `Running` (Green)
- `2` → `Paused` (Yellow)
- `3` → `Stopped` (Red)
- `4` → `Completed` (Gray)

### Dashboard Metrics
- **Leads Ready**: `total_leads` from analytics
- **Emails Sent**: `emails_sent` from analytics
- **Replies**: `emails_replied` from analytics
- **Meetings**: `meetings_booked` from analytics
- **Preparation**: Calculated based on campaign completeness

### Sequence Data
- Real sequence steps with email templates
- Performance metrics per sequence step
- Timing and delay configuration

## Testing

### Manual Testing Steps

1. **Dashboard Load Test**
   ```bash
   npm run dev
   ```
   - Verify 3 campaigns load with real names
   - Check status colors match campaign states
   - Confirm metrics show actual numbers

2. **Sequence Viewer Test**
   - Click "View Sequences" on each campaign
   - Verify real sequence data displays
   - Check email templates and performance metrics

3. **Status Filter Test**
   - Use status filters (Draft, Running, Paused, etc.)
   - Confirm filtering works with real campaign statuses

4. **Refresh Test**
   - Click refresh button
   - Verify data updates from Instantly API

### Expected Results

✅ **Campaign Names**: Show exact names from CAMPAIGN_NAMES mapping
✅ **Real Status**: Display actual campaign status from Instantly
✅ **Live Metrics**: Show current lead counts, email stats, meetings
✅ **Sequence Data**: Display real email templates and performance
✅ **Status Filtering**: Work correctly with actual campaign states
✅ **Refresh Functionality**: Update data from API on demand

## Troubleshooting

### Campaign Not Loading
- Check if campaign ID exists in INSTANTLY_CAMPAIGNS
- Verify API endpoints are responding
- Check browser console for API errors

### Missing Metrics
- Analytics endpoint may not be available for all campaigns
- Service falls back to campaign details stats
- Mock data used if no real data available

### Sequence Viewer Issues
- Real sequences fetched from campaign details first
- Falls back to direct sequence endpoint
- Mock sequences shown if no real data

## Future Enhancements

1. **Add More Campaigns**
   - Add new campaign IDs to INSTANTLY_CAMPAIGNS
   - Update CAMPAIGN_NAMES mapping

2. **Enhanced Analytics**
   - Daily/weekly performance trends
   - A/B testing metrics
   - Advanced filtering options

3. **Real-time Updates**
   - WebSocket integration for live updates
   - Auto-refresh on campaign status changes

---

*Integration completed: 2025-01-30*
*Real data from 3 specific Instantly campaigns*