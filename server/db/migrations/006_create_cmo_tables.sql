-- Migration: Create CMO-specific tables for marketing functionality

-- 1. Create marketing asset types enum
DO $$ BEGIN
    CREATE TYPE marketing_asset_type AS ENUM (
        'email_template',
        'social_post',
        'ad_copy',
        'seo_content',
        'direct_mail',
        'landing_page',
        'blog_post',
        'video_script',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create marketing_assets table
CREATE TABLE IF NOT EXISTS marketing_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type marketing_asset_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    performance_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT marketing_assets_user_id_check CHECK (user_id != '')
);

CREATE INDEX idx_marketing_assets_user_id ON marketing_assets(user_id);
CREATE INDEX idx_marketing_assets_type ON marketing_assets(type);
CREATE INDEX idx_marketing_assets_created_at ON marketing_assets(created_at DESC);
CREATE INDEX idx_marketing_assets_tags ON marketing_assets USING GIN(tags);
CREATE INDEX idx_marketing_assets_metadata ON marketing_assets USING GIN(metadata);

-- 3. Create marketing_templates table
CREATE TABLE IF NOT EXISTS marketing_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    preview_data JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketing_templates_category ON marketing_templates(category, sub_category);
CREATE INDEX idx_marketing_templates_name ON marketing_templates(name);
CREATE INDEX idx_marketing_templates_is_public ON marketing_templates(is_public);

-- 4. Create quick_actions_history table
CREATE TABLE IF NOT EXISTS quick_actions_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    sub_mode VARCHAR(50),
    context JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quick_actions_user_id ON quick_actions_history(user_id);
CREATE INDEX idx_quick_actions_timestamp ON quick_actions_history(timestamp DESC);
CREATE INDEX idx_quick_actions_action ON quick_actions_history(action);
CREATE INDEX idx_quick_actions_mode ON quick_actions_history(mode, sub_mode);

-- 5. Create marketing_campaigns table for campaign management
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    goals JSONB DEFAULT '{}',
    target_audience JSONB DEFAULT '{}',
    channels TEXT[] DEFAULT '{}',
    budget JSONB DEFAULT '{}',
    assets UUID[] DEFAULT '{}', -- References to marketing_assets
    performance JSONB DEFAULT '{}',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketing_campaigns_user_id ON marketing_campaigns(user_id);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_type ON marketing_campaigns(type);
CREATE INDEX idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);

-- 6. Create marketing_analytics table for tracking performance
CREATE TABLE IF NOT EXISTS marketing_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    asset_id UUID REFERENCES marketing_assets(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketing_analytics_user_id ON marketing_analytics(user_id);
CREATE INDEX idx_marketing_analytics_asset_id ON marketing_analytics(asset_id);
CREATE INDEX idx_marketing_analytics_campaign_id ON marketing_analytics(campaign_id);
CREATE INDEX idx_marketing_analytics_recorded_at ON marketing_analytics(recorded_at DESC);
CREATE INDEX idx_marketing_analytics_channel_metric ON marketing_analytics(channel, metric_type);

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers for updated_at
CREATE TRIGGER update_marketing_assets_updated_at BEFORE UPDATE ON marketing_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_templates_updated_at BEFORE UPDATE ON marketing_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert default marketing templates
INSERT INTO marketing_templates (category, sub_category, name, description, template, variables, is_system) VALUES
-- Email Templates
('email', 'subject_line', 'Urgency Subject Line', 'Creates urgency to increase open rates', 
 '🚨 {{urgency_word}} - {{benefit}} {{time_limit}}', 
 '[{"name": "urgency_word", "description": "Word like Last Chance, Final Hours"}, {"name": "benefit", "description": "Main benefit or offer"}, {"name": "time_limit", "description": "Time constraint"}]'::jsonb,
 true),

('email', 'subject_line', 'Personalized Subject', 'Personalized subject line template',
 '{{first_name}}, {{question_or_statement}}',
 '[{"name": "first_name", "description": "Recipient first name"}, {"name": "question_or_statement", "description": "Engaging question or statement"}]'::jsonb,
 true),

-- SEO Templates
('seo', 'title_tag', 'Product Page Title', 'SEO-optimized product page title',
 '{{product_name}} - {{key_benefit}} | {{brand_name}}',
 '[{"name": "product_name", "description": "Name of the product"}, {"name": "key_benefit", "description": "Primary benefit or feature"}, {"name": "brand_name", "description": "Your brand name"}]'::jsonb,
 true),

('seo', 'meta_description', 'Service Page Meta', 'Meta description for service pages',
 '{{service_description}} ✓ {{benefit_1}} ✓ {{benefit_2}} ✓ {{cta}}. {{brand_name}}',
 '[{"name": "service_description", "description": "Brief service description"}, {"name": "benefit_1", "description": "First key benefit"}, {"name": "benefit_2", "description": "Second key benefit"}, {"name": "cta", "description": "Call to action"}, {"name": "brand_name", "description": "Your brand name"}]'::jsonb,
 true),

-- Social Media Templates
('social', 'instagram', 'Engagement Post', 'High-engagement Instagram post template',
 '{{hook_question}}

{{value_proposition}}

👇 {{cta}}

{{hashtags}}',
 '[{"name": "hook_question", "description": "Engaging opening question"}, {"name": "value_proposition", "description": "Main message or value"}, {"name": "cta", "description": "Call to action"}, {"name": "hashtags", "description": "Relevant hashtags"}]'::jsonb,
 true),

-- Ad Copy Templates
('ads', 'google_ads', 'Responsive Search Ad', 'Google Ads RSA template',
 'Headline: {{benefit}} - {{brand}}
Headline: {{problem_solved}}
Headline: {{social_proof}}
Description: {{full_value_prop}} {{cta}}',
 '[{"name": "benefit", "description": "Primary benefit"}, {"name": "brand", "description": "Brand name"}, {"name": "problem_solved", "description": "Problem you solve"}, {"name": "social_proof", "description": "Trust indicator"}, {"name": "full_value_prop", "description": "Complete value proposition"}, {"name": "cta", "description": "Call to action"}]'::jsonb,
 true);

-- 10. Add comments for documentation
COMMENT ON TABLE marketing_assets IS 'Stores all marketing content created by users';
COMMENT ON TABLE marketing_templates IS 'Reusable templates for various marketing content types';
COMMENT ON TABLE quick_actions_history IS 'Tracks user interactions with quick actions for personalization';
COMMENT ON TABLE marketing_campaigns IS 'Campaign management and organization';
COMMENT ON TABLE marketing_analytics IS 'Performance tracking for marketing assets and campaigns';