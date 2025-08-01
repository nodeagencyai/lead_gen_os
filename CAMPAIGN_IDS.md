# Campaign IDs Reference

This document contains the campaign IDs for your Instantly campaigns for easy reference during development and testing.

## Instantly Campaign IDs

| Campaign Name | Campaign ID | URL |
|---------------|-------------|-----|
| Digital Marketing Agencies | `4bde0574-609a-409d-86cc-52b233699a2b` | https://app.instantly.ai/share/campaign?id=4bde0574-609a-409d-86cc-52b233699a2b |
| Sales Development Representative | `2e3519c8-ac6f-4961-b803-e28c7423d080` | https://app.instantly.ai/share/campaign?id=2e3519c8-ac6f-4961-b803-e28c7423d080 |
| Beta | `afe7fbea-9d4e-491f-88e4-8f75985b9c07` | https://app.instantly.ai/share/campaign?id=afe7fbea-9d4e-491f-88e4-8f75985b9c07 |

## Usage in Code

### API Testing
Use these IDs in test endpoints:
```javascript
const campaignIds = [
  '4bde0574-609a-409d-86cc-52b233699a2b', // Digital Marketing Agencies
  '2e3519c8-ac6f-4961-b803-e28c7423d080', // Sales Development Representative  
  'afe7fbea-9d4e-491f-88e4-8f75985b9c07'  // Beta
];
```

### Test Endpoints
- Test all campaigns: `/api/test-instantly-send`
- Test specific campaign: `/api/test-instantly-send?campaignId=CAMPAIGN_ID`
- Test send to specific campaign: `/api/test-instantly-send?campaignId=CAMPAIGN_ID&testSend=true`

## Notes
- All campaigns are for email outreach via Instantly
- IDs are UUIDs in the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
- These IDs should be used when testing campaign send functionality
- Campaign names and IDs are retrieved dynamically via the Instantly API

## Last Updated
Created: January 2025