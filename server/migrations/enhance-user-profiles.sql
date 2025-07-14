-- Migration: Enhance User Profiles for Advanced Client Profile Management
-- This migration enhances the existing user_profiles table and adds supporting tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create additional enum types for enhanced profiles
DO $$ BEGIN
    CREATE TYPE budget_category AS ENUM (
        'economy', 'mid_range', 'luxury', 'ultra_luxury', 'budget_conscious', 'value_seeker'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE travel_frequency AS ENUM (
        'rare', 'occasional', 'regular', 'frequent', 'business_heavy'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE relationship_type AS ENUM (
        'spouse', 'partner', 'child', 'parent', 'sibling', 'friend', 
        'colleague', 'business_partner', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE preference_confidence AS ENUM (
        'very_low', 'low', 'medium', 'high', 'very_high'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhance existing user_profiles table with new columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) NOT NULL DEFAULT 'default-org';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_version INTEGER DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_enrichment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS enrichment_source VARCHAR(100);

-- Add new comprehensive preference columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS accommodation_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS transportation_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dining_preferences JSONB DEFAULT '{}'::jsonb;

-- Add budget and travel pattern columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS budget_category budget_category DEFAULT 'mid_range';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS average_trip_budget DECIMAL(10,2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS budget_flexibility DECIMAL(3,2) DEFAULT 0.5;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS travel_frequency travel_frequency DEFAULT 'occasional';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trips_per_year INTEGER DEFAULT 0;

-- Add seasonal and timing preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS seasonal_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_trip_duration JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS booking_lead_time INTEGER; -- days in advance

-- Add important dates and personal information
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS important_dates JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS personal_details JSONB DEFAULT '{}'::jsonb;

-- Add confidence scoring for preferences
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preference_confidence_scores JSONB DEFAULT '{}'::jsonb;

-- Create travel_history table for detailed trip tracking
CREATE TABLE IF NOT EXISTS travel_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    
    -- Trip identification
    trip_name VARCHAR(200),
    trip_type VARCHAR(50), -- business, leisure, family, romantic, adventure, etc.
    
    -- Destination information
    primary_destination VARCHAR(200) NOT NULL,
    destinations_visited TEXT[],
    countries_visited TEXT[],
    
    -- Dates and duration
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
    
    -- Budget and costs
    total_budget DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    cost_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Travel arrangements
    airlines_used TEXT[],
    hotels_stayed TEXT[],
    accommodation_types TEXT[], -- hotel, resort, airbnb, etc.
    transportation_modes TEXT[], -- flight, car, train, etc.
    
    -- Experience data
    activities_enjoyed TEXT[],
    restaurants_visited TEXT[],
    experience_rating INTEGER CHECK (experience_rating >= 1 AND experience_rating <= 5),
    would_return BOOLEAN,
    
    -- Companions
    travel_companions JSONB DEFAULT '[]'::jsonb,
    companion_count INTEGER DEFAULT 1,
    
    -- Trip characteristics
    booking_source VARCHAR(100), -- website, agent, app, etc.
    booking_lead_time INTEGER, -- days in advance
    spontaneous BOOLEAN DEFAULT false,
    
    -- Lessons learned and preferences discovered
    lessons_learned TEXT,
    preferences_discovered JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'conversation', -- conversation, booking, manual
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT travel_history_user_org_fk 
        FOREIGN KEY (user_id, organization_id) 
        REFERENCES user_profiles(user_id, organization_id),
    CONSTRAINT travel_history_valid_dates CHECK (start_date <= end_date),
    CONSTRAINT travel_history_valid_rating CHECK (experience_rating IS NULL OR (experience_rating >= 1 AND experience_rating <= 5))
);

-- Create travel_companions table for detailed companion tracking
CREATE TABLE IF NOT EXISTS travel_companions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    
    -- Companion information
    companion_name VARCHAR(200),
    relationship_type relationship_type NOT NULL,
    age_range VARCHAR(20), -- child, teen, adult, senior
    
    -- Travel patterns with this companion
    trips_together INTEGER DEFAULT 1,
    first_trip_date DATE,
    last_trip_date DATE,
    
    -- Companion preferences and requirements
    dietary_restrictions TEXT[],
    accessibility_needs TEXT[],
    activity_preferences TEXT[],
    accommodation_preferences TEXT[],
    
    -- Companion characteristics
    is_frequent_companion BOOLEAN DEFAULT false,
    travel_experience_level VARCHAR(50), -- novice, experienced, expert
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT travel_companions_user_org_fk 
        FOREIGN KEY (user_id, organization_id) 
        REFERENCES user_profiles(user_id, organization_id)
);

-- Create preference_history table for tracking preference changes over time
CREATE TABLE IF NOT EXISTS preference_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    
    -- Preference identification
    preference_category VARCHAR(100) NOT NULL,
    preference_type VARCHAR(100) NOT NULL,
    preference_value TEXT NOT NULL,
    
    -- Confidence and source
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    confidence_level preference_confidence NOT NULL DEFAULT 'medium',
    data_source VARCHAR(100) NOT NULL, -- conversation, booking, explicit, inferred
    
    -- Context
    conversation_id VARCHAR(36),
    trip_id VARCHAR(36),
    context_description TEXT,
    
    -- Change tracking
    action VARCHAR(20) NOT NULL, -- added, updated, removed, confirmed
    previous_value TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT preference_history_user_org_fk 
        FOREIGN KEY (user_id, organization_id) 
        REFERENCES user_profiles(user_id, organization_id),
    CONSTRAINT preference_history_confidence_range 
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    CONSTRAINT preference_history_valid_action 
        CHECK (action IN ('added', 'updated', 'removed', 'confirmed'))
);

-- Create service_preferences table for detailed service provider preferences
CREATE TABLE IF NOT EXISTS service_preferences (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    
    -- Service information
    service_type VARCHAR(50) NOT NULL, -- airline, hotel_chain, car_rental, etc.
    service_name VARCHAR(200) NOT NULL,
    
    -- Preference metrics
    preference_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    usage_count INTEGER DEFAULT 1,
    positive_experiences INTEGER DEFAULT 0,
    negative_experiences INTEGER DEFAULT 0,
    
    -- Experience details
    first_used_date DATE,
    last_used_date DATE,
    loyalty_program_member BOOLEAN DEFAULT false,
    loyalty_tier VARCHAR(50),
    
    -- Preference reasons
    liked_aspects TEXT[],
    disliked_aspects TEXT[],
    notes TEXT,
    
    -- Recommendation data
    would_recommend BOOLEAN,
    recommendation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT service_preferences_user_org_fk 
        FOREIGN KEY (user_id, organization_id) 
        REFERENCES user_profiles(user_id, organization_id),
    CONSTRAINT service_preferences_score_range 
        CHECK (preference_score >= 0.0 AND preference_score <= 1.0),
    CONSTRAINT service_preferences_unique_service 
        UNIQUE (user_id, organization_id, service_type, service_name)
);

-- Create indexes for efficient querying

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id 
    ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_org 
    ON user_profiles(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_budget_category 
    ON user_profiles(budget_category);
CREATE INDEX IF NOT EXISTS idx_user_profiles_travel_frequency 
    ON user_profiles(travel_frequency);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_enrichment 
    ON user_profiles(last_enrichment_date DESC);

-- Travel history indexes
CREATE INDEX IF NOT EXISTS idx_travel_history_user_org 
    ON travel_history(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_travel_history_dates 
    ON travel_history(start_date DESC, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_travel_history_destination 
    ON travel_history(primary_destination);
CREATE INDEX IF NOT EXISTS idx_travel_history_trip_type 
    ON travel_history(trip_type);
CREATE INDEX IF NOT EXISTS idx_travel_history_budget 
    ON travel_history(total_budget DESC) WHERE total_budget IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_history_rating 
    ON travel_history(experience_rating DESC) WHERE experience_rating IS NOT NULL;

-- Travel companions indexes
CREATE INDEX IF NOT EXISTS idx_travel_companions_user_org 
    ON travel_companions(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_travel_companions_relationship 
    ON travel_companions(relationship_type);
CREATE INDEX IF NOT EXISTS idx_travel_companions_frequent 
    ON travel_companions(is_frequent_companion) WHERE is_frequent_companion = true;

-- Preference history indexes
CREATE INDEX IF NOT EXISTS idx_preference_history_user_org 
    ON preference_history(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_preference_history_category 
    ON preference_history(preference_category, preference_type);
CREATE INDEX IF NOT EXISTS idx_preference_history_created_at 
    ON preference_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preference_history_confidence 
    ON preference_history(confidence_score DESC);

-- Service preferences indexes
CREATE INDEX IF NOT EXISTS idx_service_preferences_user_org 
    ON service_preferences(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_service_preferences_service_type 
    ON service_preferences(service_type);
CREATE INDEX IF NOT EXISTS idx_service_preferences_score 
    ON service_preferences(preference_score DESC);
CREATE INDEX IF NOT EXISTS idx_service_preferences_usage 
    ON service_preferences(usage_count DESC);

-- Create utility functions for profile analytics

-- Function to calculate travel frequency category
CREATE OR REPLACE FUNCTION calculate_travel_frequency(
    p_user_id VARCHAR(36),
    p_organization_id VARCHAR(36)
)
RETURNS travel_frequency AS $$
DECLARE
    trip_count INTEGER;
    months_active INTEGER;
    trips_per_year DECIMAL;
BEGIN
    -- Count trips in the last 24 months
    SELECT COUNT(*) INTO trip_count
    FROM travel_history 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id
      AND start_date >= CURRENT_DATE - INTERVAL '24 months';
    
    -- Calculate months with travel activity
    SELECT COUNT(DISTINCT DATE_TRUNC('month', start_date)) INTO months_active
    FROM travel_history 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id
      AND start_date >= CURRENT_DATE - INTERVAL '24 months';
    
    IF months_active = 0 OR trip_count = 0 THEN
        RETURN 'rare';
    END IF;
    
    trips_per_year := (trip_count::DECIMAL / GREATEST(months_active, 1)) * 12;
    
    IF trips_per_year >= 12 THEN
        RETURN 'business_heavy';
    ELSIF trips_per_year >= 6 THEN
        RETURN 'frequent';
    ELSIF trips_per_year >= 3 THEN
        RETURN 'regular';
    ELSIF trips_per_year >= 1 THEN
        RETURN 'occasional';
    ELSE
        RETURN 'rare';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate budget category
CREATE OR REPLACE FUNCTION calculate_budget_category(
    p_user_id VARCHAR(36),
    p_organization_id VARCHAR(36)
)
RETURNS budget_category AS $$
DECLARE
    avg_daily_budget DECIMAL;
    luxury_indicators INTEGER := 0;
    economy_indicators INTEGER := 0;
BEGIN
    -- Calculate average daily budget from travel history
    SELECT AVG(actual_cost / NULLIF(duration_days, 0)) INTO avg_daily_budget
    FROM travel_history 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id
      AND actual_cost IS NOT NULL 
      AND duration_days > 0
      AND start_date >= CURRENT_DATE - INTERVAL '24 months';
    
    IF avg_daily_budget IS NULL THEN
        RETURN 'mid_range';
    END IF;
    
    -- Count luxury indicators
    SELECT COUNT(*) INTO luxury_indicators
    FROM travel_history 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id
      AND (
        'luxury' = ANY(accommodation_types) OR
        'business_class' = ANY(transportation_modes) OR
        'first_class' = ANY(transportation_modes) OR
        (actual_cost / NULLIF(duration_days, 0)) > 500
      );
    
    -- Count economy indicators  
    SELECT COUNT(*) INTO economy_indicators
    FROM travel_history 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id
      AND (
        'budget' = ANY(accommodation_types) OR
        'economy' = ANY(transportation_modes) OR
        (actual_cost / NULLIF(duration_days, 0)) < 100
      );
    
    -- Determine category
    IF avg_daily_budget > 1000 OR luxury_indicators > economy_indicators * 2 THEN
        RETURN 'ultra_luxury';
    ELSIF avg_daily_budget > 500 OR luxury_indicators > economy_indicators THEN
        RETURN 'luxury';
    ELSIF avg_daily_budget < 100 OR economy_indicators > luxury_indicators * 2 THEN
        RETURN 'economy';
    ELSIF economy_indicators > luxury_indicators THEN
        RETURN 'budget_conscious';
    ELSE
        RETURN 'mid_range';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get profile enrichment recommendations
CREATE OR REPLACE FUNCTION get_profile_enrichment_recommendations(
    p_user_id VARCHAR(36),
    p_organization_id VARCHAR(36)
)
RETURNS TABLE (
    category VARCHAR(100),
    recommendation TEXT,
    priority INTEGER,
    data_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH profile_data AS (
        SELECT 
            up.*,
            COUNT(th.id) as trip_count,
            COUNT(tc.id) as companion_count,
            COUNT(sp.id) as service_pref_count
        FROM user_profiles up
        LEFT JOIN travel_history th ON up.user_id = th.user_id AND up.organization_id = th.organization_id
        LEFT JOIN travel_companions tc ON up.user_id = tc.user_id AND up.organization_id = tc.organization_id  
        LEFT JOIN service_preferences sp ON up.user_id = sp.user_id AND up.organization_id = sp.organization_id
        WHERE up.user_id = p_user_id AND up.organization_id = p_organization_id
        GROUP BY up.user_id, up.organization_id, up.id
    )
    
    SELECT 
        'travel_history'::VARCHAR(100),
        'Add more travel history to improve recommendations'::TEXT,
        CASE WHEN pd.trip_count < 3 THEN 1 ELSE 3 END,
        pd.trip_count > 0
    FROM profile_data pd
    
    UNION ALL
    
    SELECT 
        'budget_preferences'::VARCHAR(100),
        'Specify budget preferences for better pricing'::TEXT,
        CASE WHEN pd.average_trip_budget IS NULL THEN 2 ELSE 4 END,
        pd.average_trip_budget IS NOT NULL
    FROM profile_data pd
    
    UNION ALL
    
    SELECT 
        'service_preferences'::VARCHAR(100),
        'Add preferred airlines and hotels'::TEXT,
        CASE WHEN pd.service_pref_count < 3 THEN 2 ELSE 4 END,
        pd.service_pref_count > 0
    FROM profile_data pd
    
    ORDER BY priority ASC;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_travel_history_updated_at 
    BEFORE UPDATE ON travel_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_companions_updated_at 
    BEFORE UPDATE ON travel_companions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_preferences_updated_at 
    BEFORE UPDATE ON service_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE travel_history IS 'Detailed travel history for users with trip analytics';
COMMENT ON TABLE travel_companions IS 'Travel companions and their preferences/requirements';
COMMENT ON TABLE preference_history IS 'Historical tracking of preference changes over time';
COMMENT ON TABLE service_preferences IS 'User preferences for airlines, hotels, and other services';

COMMENT ON FUNCTION calculate_travel_frequency IS 'Calculate travel frequency category based on trip history';
COMMENT ON FUNCTION calculate_budget_category IS 'Determine budget category from spending patterns';
COMMENT ON FUNCTION get_profile_enrichment_recommendations IS 'Get recommendations for improving profile completeness';

-- Sample data views for analytics
CREATE OR REPLACE VIEW user_travel_summary AS
SELECT 
    up.user_id,
    up.organization_id,
    up.profile_completeness_score,
    COUNT(th.id) as total_trips,
    MIN(th.start_date) as first_trip,
    MAX(th.start_date) as last_trip,
    AVG(th.duration_days) as avg_trip_duration,
    AVG(th.actual_cost) as avg_trip_cost,
    COUNT(DISTINCT th.primary_destination) as unique_destinations,
    up.travel_frequency,
    up.budget_category
FROM user_profiles up
LEFT JOIN travel_history th ON up.user_id = th.user_id AND up.organization_id = th.organization_id
GROUP BY up.user_id, up.organization_id, up.profile_completeness_score, up.travel_frequency, up.budget_category;

COMMENT ON VIEW user_travel_summary IS 'Summary view of user travel patterns and profile data';