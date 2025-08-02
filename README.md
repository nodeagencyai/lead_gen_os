# Lead Generation OS

A modern, real-time dashboard for managing email and LinkedIn campaigns with comprehensive analytics and lead management.

## 🚀 Features

- **Real-time Campaign Management**: Monitor email and LinkedIn campaigns
- **Lead Database Integration**: Connect to Supabase Apollo and LinkedIn tables
- **API Integrations**: Instantly.ai for emails, HeyReach for LinkedIn
- **Live Analytics**: Real-time metrics with auto-refresh
- **Campaign Overview**: Comprehensive campaign status and performance tracking
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Lucide React Icons
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **API Integrations**: Instantly.ai, HeyReach, N8N
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/nodeagencyai/lead_gen_os.git
cd lead_gen_os
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Supabase URL and keys
   - Instantly.ai API key
   - N8N webhook URLs
   - Other API credentials

5. Start the development server:
```bash
npm run dev
```

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_INSTANTLY_API_KEY` | Instantly.ai API key | ✅ |
| `VITE_N8N_AUTH_TOKEN` | N8N authentication token | ✅ |
| `VITE_N8N_*_WEBHOOK` | N8N webhook URLs | ✅ |

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📊 API Integrations

### Instantly.ai
- Campaign management
- Email analytics
- Real-time metrics

### Supabase
- Lead storage (Apollo, LinkedIn tables)
- User authentication
- Real-time subscriptions

### N8N
- Workflow automation
- Data processing
- Webhook handling

## 🎯 Key Components

- **Dashboard**: Real-time analytics and KPI tracking
- **Campaign Overview**: Campaign status and performance
- **Lead Database**: Lead management and filtering
- **Lead Finder**: New lead generation tools
- **Integration Setup**: API configuration and management

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # API service layers
├── store/              # State management
├── lib/                # Utility libraries
└── data/               # Static data and helpers
```

### Key Files
- `src/services/integrationService.ts` - API integration logic
- `src/hooks/useRealTimeData.ts` - Real-time data management
- `src/components/CampaignsOverview.tsx` - Campaign management UI

## 🔧 Troubleshooting

### "Failed to fetch" Error in Dashboard

If you see "Error loading real-time data: Failed to fetch" in the dashboard:

1. **Development Mode**: Ensure the proxy server is running:
   ```bash
   node server.cjs
   ```
   The proxy server should be running on `http://localhost:3001`

2. **Check Environment Variables**: Verify your `.env` file has:
   ```
   VITE_INSTANTLY_API_KEY=your_instantly_api_key
   ```

3. **Check Browser Console**: Open browser DevTools → Console for detailed error logs

4. **Proxy Server Issues**: If proxy server fails, the app will automatically fallback to direct API calls

5. **CORS Issues**: In production, direct API calls are used with proper CORS headers

### Development Server Issues

- **Port Conflicts**: If port 5173 is in use, Vite will automatically use the next available port
- **Environment Variables**: Restart the dev server after changing `.env` files
- **Proxy Server**: Run `node server.cjs` in a separate terminal for API proxy functionality

## 📝 License

Private - Node Agency AI

## 🤝 Support

For support and questions, contact the Node Agency AI team.# Rollback committed as production
