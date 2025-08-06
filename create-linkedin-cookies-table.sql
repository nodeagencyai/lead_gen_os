-- Create LinkedIn Cookies Table
-- This table stores LinkedIn session cookies for Sales Navigator scraping

-- Create the table
CREATE TABLE IF NOT EXISTS public.linkedin_cookies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cookies TEXT NOT NULL, -- JSON string of cookies
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT -- Optional notes about the cookies
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_linkedin_cookies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linkedin_cookies_updated_at
    BEFORE UPDATE ON public.linkedin_cookies
    FOR EACH ROW
    EXECUTE FUNCTION update_linkedin_cookies_updated_at();

-- Grant permissions
GRANT ALL ON public.linkedin_cookies TO anon, authenticated, service_role;

-- Insert a comment for documentation
COMMENT ON TABLE public.linkedin_cookies IS 'Stores LinkedIn session cookies for Sales Navigator scraping';
COMMENT ON COLUMN public.linkedin_cookies.cookies IS 'JSON string containing LinkedIn session cookies';
COMMENT ON COLUMN public.linkedin_cookies.is_active IS 'Whether these cookies are currently active and should be used';
COMMENT ON COLUMN public.linkedin_cookies.last_updated IS 'Timestamp of last update to help track cookie freshness';

-- Create an index on is_active for faster queries
CREATE INDEX idx_linkedin_cookies_active ON public.linkedin_cookies(is_active) WHERE is_active = true;