-- =============================================================================
-- Migration: Add Translation Support to Tala AI
-- Purpose: Extend database schema to support multilingual documents
-- Date: 2025-07-14
-- =============================================================================

-- Add translation fields to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS language_confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS is_multilingual BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS translated_languages TEXT[] DEFAULT '{}';

-- Update existing records with default language
UPDATE documents 
SET original_language = COALESCE(language_code, 'en'),
    detected_language = COALESCE(language_code, 'en')
WHERE original_language IS NULL;

-- =============================================================================
-- DOCUMENT TRANSLATIONS TABLE
-- Purpose: Store translations of documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Translation metadata
    target_language VARCHAR(10) NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    translation_method VARCHAR(50), -- google, mock, manual
    translation_confidence NUMERIC(3,2),
    
    -- Translated content
    translated_title VARCHAR(500),
    translated_description TEXT,
    translated_content TEXT,
    translated_summary TEXT,
    
    -- Translated chunks (for large documents)
    translated_chunks JSONB DEFAULT '[]',
    
    -- Translated entities
    translated_entities JSONB DEFAULT '{}',
    
    -- Translation metadata
    preserved_terms JSONB DEFAULT '[]', -- Terms that weren't translated
    translation_notes TEXT,
    
    -- Status
    translation_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, partial
    error_message TEXT,
    
    -- Performance metrics
    translation_time_ms INTEGER,
    character_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique translation per document-language pair
    CONSTRAINT unique_document_language UNIQUE (document_id, target_language)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_translations_document_id ON document_translations(document_id);
CREATE INDEX IF NOT EXISTS idx_translations_target_language ON document_translations(target_language);
CREATE INDEX IF NOT EXISTS idx_translations_status ON document_translations(translation_status);

-- =============================================================================
-- TRANSLATION CACHE TABLE
-- Purpose: Cache frequently used translations
-- =============================================================================

CREATE TABLE IF NOT EXISTS translation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cache key components
    source_text_hash VARCHAR(64) NOT NULL, -- SHA256 hash of source text
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    
    -- Cached translation
    translated_text TEXT NOT NULL,
    translation_method VARCHAR(50),
    confidence NUMERIC(3,2),
    
    -- Usage tracking
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    character_count INTEGER,
    preserved_terms JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
    
    -- Ensure unique cache entries
    CONSTRAINT unique_translation_cache UNIQUE (source_text_hash, source_language, target_language)
);

-- Create indexes for cache performance
CREATE INDEX IF NOT EXISTS idx_cache_hash ON translation_cache(source_text_hash);
CREATE INDEX IF NOT EXISTS idx_cache_languages ON translation_cache(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON translation_cache(expires_at);

-- =============================================================================
-- USER LANGUAGE PREFERENCES TABLE
-- Purpose: Store user language preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_language_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Language preferences
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    secondary_languages TEXT[] DEFAULT '{}',
    
    -- Auto-translation settings
    auto_translate_documents BOOLEAN DEFAULT FALSE,
    translation_quality_preference VARCHAR(20) DEFAULT 'balanced', -- fast, balanced, high_quality
    
    -- Display preferences
    show_original_with_translation BOOLEAN DEFAULT TRUE,
    highlight_translated_content BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preference per user
    CONSTRAINT unique_user_language_pref UNIQUE (user_id)
);

-- =============================================================================
-- LANGUAGE DETECTION LOGS TABLE
-- Purpose: Track language detection for analytics and improvement
-- =============================================================================

CREATE TABLE IF NOT EXISTS language_detection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Detection results
    detected_language VARCHAR(10),
    confidence NUMERIC(3,2),
    alternative_languages JSONB DEFAULT '[]',
    is_mixed_language BOOLEAN DEFAULT FALSE,
    mixed_languages JSONB DEFAULT '[]',
    
    -- Detection metadata
    detection_method VARCHAR(50), -- franc, langdetect, combined
    text_sample_length INTEGER,
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_detection_logs_document ON language_detection_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_detection_logs_created ON language_detection_logs(created_at);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update translated_languages array when translation is added
CREATE OR REPLACE FUNCTION update_translated_languages()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.translation_status = 'completed' THEN
        UPDATE documents
        SET translated_languages = array_append(
            array_remove(translated_languages, NEW.target_language),
            NEW.target_language
        ),
        updated_at = NOW()
        WHERE id = NEW.document_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update translated_languages
DROP TRIGGER IF EXISTS trigger_update_translated_languages ON document_translations;
CREATE TRIGGER trigger_update_translated_languages
AFTER INSERT OR UPDATE ON document_translations
FOR EACH ROW
EXECUTE FUNCTION update_translated_languages();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_translation_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM translation_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS FOR CONVENIENCE
-- =============================================================================

-- View for documents with translation status
CREATE OR REPLACE VIEW documents_with_translations AS
SELECT 
    d.*,
    COALESCE(
        json_agg(
            json_build_object(
                'language', dt.target_language,
                'status', dt.translation_status,
                'confidence', dt.translation_confidence,
                'updated_at', dt.updated_at
            ) ORDER BY dt.updated_at DESC
        ) FILTER (WHERE dt.id IS NOT NULL),
        '[]'::json
    ) AS translations
FROM documents d
LEFT JOIN document_translations dt ON d.id = dt.document_id
GROUP BY d.id;

-- View for translation statistics by organization
CREATE OR REPLACE VIEW organization_translation_stats AS
SELECT 
    d.organization_id,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT dt.document_id) AS translated_documents,
    COUNT(DISTINCT dt.target_language) AS unique_languages,
    AVG(dt.translation_confidence)::NUMERIC(3,2) AS avg_confidence,
    SUM(dt.character_count) AS total_characters_translated
FROM documents d
LEFT JOIN document_translations dt ON d.id = dt.document_id
WHERE dt.translation_status = 'completed'
GROUP BY d.organization_id;

-- =============================================================================
-- PERMISSIONS (for Supabase RLS)
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE document_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_detection_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_translations
CREATE POLICY "Users can view translations of accessible documents"
ON document_translations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = document_translations.document_id
        AND (
            d.visibility = 'public'
            OR d.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM document_permissions dp
                WHERE dp.document_id = d.id
                AND dp.user_id = auth.uid()
            )
        )
    )
);

-- RLS Policies for user_language_preferences
CREATE POLICY "Users can manage their own language preferences"
ON user_language_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- SUPPORTED LANGUAGES TABLE
-- Purpose: Maintain list of supported languages for the system
-- =============================================================================

CREATE TABLE IF NOT EXISTS supported_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL, -- ISO 639-1 code
    name VARCHAR(100) NOT NULL, -- English name
    native_name VARCHAR(100) NOT NULL, -- Native name
    is_primary BOOLEAN DEFAULT FALSE, -- Primary languages for UI
    is_active BOOLEAN DEFAULT TRUE, -- Available for translation
    translation_available BOOLEAN DEFAULT TRUE,
    detection_available BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    flag_emoji VARCHAR(10),
    rtl BOOLEAN DEFAULT FALSE, -- Right-to-left language
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default supported languages
INSERT INTO supported_languages (code, name, native_name, is_primary, is_active) VALUES
    ('en', 'English', 'English', true, true),
    ('es', 'Spanish', 'Español', true, true),
    ('fr', 'French', 'Français', true, true),
    ('de', 'German', 'Deutsch', true, true),
    ('it', 'Italian', 'Italiano', true, true),
    ('pt', 'Portuguese', 'Português', true, true),
    ('ja', 'Japanese', '日本語', true, true),
    ('ko', 'Korean', '한국어', true, true),
    ('zh', 'Chinese', '中文', true, true),
    ('ar', 'Arabic', 'العربية', true, true),
    ('ru', 'Russian', 'Русский', false, true),
    ('hi', 'Hindi', 'हिन्दी', false, true),
    ('th', 'Thai', 'ไทย', false, true),
    ('vi', 'Vietnamese', 'Tiếng Việt', false, true),
    ('tr', 'Turkish', 'Türkçe', false, true),
    ('nl', 'Dutch', 'Nederlands', false, true),
    ('pl', 'Polish', 'Polski', false, true),
    ('sv', 'Swedish', 'Svenska', false, true)
ON CONFLICT (code) DO NOTHING;