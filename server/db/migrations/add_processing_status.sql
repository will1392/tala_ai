-- Processing Status Migration
-- Adds support for document processing status tracking and logs

-- Add processing status columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS processing_id UUID,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_results JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ocr_content TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS visual_description TEXT,
ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS has_translation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS entity_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS relationship_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_count INTEGER DEFAULT 0;

-- Create indexes for processing status
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_processing_id ON documents(processing_id);
CREATE INDEX IF NOT EXISTS idx_documents_detected_language ON documents(detected_language);
CREATE INDEX IF NOT EXISTS idx_documents_has_translation ON documents(has_translation);

-- Processing logs table
CREATE TABLE IF NOT EXISTS processing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  processing_id UUID NOT NULL,
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  message TEXT,
  error_details TEXT,
  metadata JSONB DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_processing_logs_document (document_id),
  INDEX idx_processing_logs_processing_id (processing_id),
  INDEX idx_processing_logs_stage (stage),
  INDEX idx_processing_logs_status (status),
  INDEX idx_processing_logs_created (created_at)
);

-- Processing queue table
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  processing_id UUID NOT NULL UNIQUE,
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status VARCHAR(50) DEFAULT 'queued',
  stage VARCHAR(50),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  options JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  results JSONB DEFAULT '{}',
  queued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  
  -- Indexes
  INDEX idx_queue_status (status),
  INDEX idx_queue_priority (priority, queued_at),
  INDEX idx_queue_document (document_id),
  INDEX idx_queue_processing_id (processing_id)
);

-- Processing statistics table
CREATE TABLE IF NOT EXISTS processing_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  hour INTEGER DEFAULT 0 CHECK (hour BETWEEN 0 AND 23),
  total_processed INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  retried INTEGER DEFAULT 0,
  cancelled INTEGER DEFAULT 0,
  avg_duration_ms INTEGER,
  total_ocr_processed INTEGER DEFAULT 0,
  total_translations INTEGER DEFAULT 0,
  total_visual_analysis INTEGER DEFAULT 0,
  by_document_type JSONB DEFAULT '{}',
  by_language JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint for date/hour combination
  CONSTRAINT unique_stats_date_hour UNIQUE (date, hour),
  
  -- Indexes
  INDEX idx_stats_date (date),
  INDEX idx_stats_date_hour (date, hour)
);

-- Processing webhooks table (for notifications)
CREATE TABLE IF NOT EXISTS processing_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['completed', 'failed'],
  is_active BOOLEAN DEFAULT true,
  secret_key VARCHAR(255),
  headers JSONB DEFAULT '{}',
  retry_config JSONB DEFAULT '{"max_attempts": 3, "retry_delay": 1000}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_webhooks_org (organization_id),
  INDEX idx_webhooks_active (is_active)
);

-- Processing events table (for webhook deliveries)
CREATE TABLE IF NOT EXISTS processing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES processing_webhooks(id) ON DELETE CASCADE,
  processing_id UUID NOT NULL,
  document_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMPTZ,
  
  -- Indexes
  INDEX idx_events_webhook (webhook_id),
  INDEX idx_events_status (delivery_status),
  INDEX idx_events_processing (processing_id),
  INDEX idx_events_created (created_at)
);

-- Functions

-- Function to update processing statistics
CREATE OR REPLACE FUNCTION update_processing_statistics(
  p_date DATE,
  p_hour INTEGER,
  p_status VARCHAR(50),
  p_duration_ms INTEGER DEFAULT NULL,
  p_document_type VARCHAR(50) DEFAULT NULL,
  p_language VARCHAR(10) DEFAULT NULL,
  p_features JSONB DEFAULT '{}'
) RETURNS void AS $$
DECLARE
  v_stats_id UUID;
BEGIN
  -- Get or create statistics record
  INSERT INTO processing_statistics (date, hour)
  VALUES (p_date, p_hour)
  ON CONFLICT (date, hour) DO NOTHING
  RETURNING id INTO v_stats_id;
  
  IF v_stats_id IS NULL THEN
    SELECT id INTO v_stats_id
    FROM processing_statistics
    WHERE date = p_date AND hour = p_hour;
  END IF;
  
  -- Update counters based on status
  UPDATE processing_statistics
  SET 
    total_processed = total_processed + 1,
    successful = CASE WHEN p_status = 'completed' THEN successful + 1 ELSE successful END,
    failed = CASE WHEN p_status = 'failed' THEN failed + 1 ELSE failed END,
    retried = CASE WHEN p_status = 'retried' THEN retried + 1 ELSE retried END,
    cancelled = CASE WHEN p_status = 'cancelled' THEN cancelled + 1 ELSE cancelled END,
    avg_duration_ms = CASE 
      WHEN p_duration_ms IS NOT NULL THEN 
        COALESCE((avg_duration_ms * (total_processed - 1) + p_duration_ms) / total_processed, p_duration_ms)
      ELSE avg_duration_ms
    END,
    total_ocr_processed = CASE 
      WHEN (p_features->>'ocr')::boolean THEN total_ocr_processed + 1 
      ELSE total_ocr_processed 
    END,
    total_translations = CASE 
      WHEN (p_features->>'translation')::boolean THEN total_translations + 1 
      ELSE total_translations 
    END,
    total_visual_analysis = CASE 
      WHEN (p_features->>'visual')::boolean THEN total_visual_analysis + 1 
      ELSE total_visual_analysis 
    END,
    by_document_type = CASE 
      WHEN p_document_type IS NOT NULL THEN
        jsonb_set(
          by_document_type,
          ARRAY[p_document_type],
          to_jsonb(COALESCE((by_document_type->>p_document_type)::integer, 0) + 1)
        )
      ELSE by_document_type
    END,
    by_language = CASE 
      WHEN p_language IS NOT NULL THEN
        jsonb_set(
          by_language,
          ARRAY[p_language],
          to_jsonb(COALESCE((by_language->>p_language)::integer, 0) + 1)
        )
      ELSE by_language
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = v_stats_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get processing queue position
CREATE OR REPLACE FUNCTION get_queue_position(p_processing_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_position INTEGER;
BEGIN
  WITH queue_order AS (
    SELECT 
      processing_id,
      ROW_NUMBER() OVER (ORDER BY priority ASC, queued_at ASC) as position
    FROM processing_queue
    WHERE status = 'queued'
  )
  SELECT position INTO v_position
  FROM queue_order
  WHERE processing_id = p_processing_id;
  
  RETURN COALESCE(v_position, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to clean old processing logs
CREATE OR REPLACE FUNCTION cleanup_old_processing_logs(p_days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM processing_logs
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  DELETE FROM processing_events
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_to_keep;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Trigger to log processing status changes
CREATE OR REPLACE FUNCTION log_processing_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processing_status IS DISTINCT FROM OLD.processing_status OR
     NEW.processing_stage IS DISTINCT FROM OLD.processing_stage THEN
    
    INSERT INTO processing_logs (
      document_id,
      processing_id,
      stage,
      status,
      message,
      metadata
    ) VALUES (
      NEW.id,
      NEW.processing_id,
      COALESCE(NEW.processing_stage, 'unknown'),
      NEW.processing_status,
      CASE 
        WHEN NEW.processing_status = 'failed' THEN NEW.processing_error
        ELSE NULL
      END,
      jsonb_build_object(
        'old_status', OLD.processing_status,
        'new_status', NEW.processing_status,
        'old_stage', OLD.processing_stage,
        'new_stage', NEW.processing_stage
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_processing_status_change
  AFTER UPDATE ON documents
  FOR EACH ROW
  WHEN (NEW.processing_status IS DISTINCT FROM OLD.processing_status OR
        NEW.processing_stage IS DISTINCT FROM OLD.processing_stage)
  EXECUTE FUNCTION log_processing_status_change();

-- Views

-- View for current processing queue status
CREATE OR REPLACE VIEW processing_queue_status AS
SELECT 
  pq.id,
  pq.processing_id,
  pq.document_id,
  d.title as document_title,
  d.user_id,
  d.organization_id,
  pq.status,
  pq.stage,
  pq.priority,
  pq.attempts,
  pq.queued_at,
  pq.started_at,
  get_queue_position(pq.processing_id) as queue_position,
  CASE 
    WHEN pq.started_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pq.started_at)) * 1000
    ELSE NULL
  END as processing_duration_ms
FROM processing_queue pq
JOIN documents d ON d.id = pq.document_id
WHERE pq.status IN ('queued', 'processing', 'retrying');

-- View for processing statistics summary
CREATE OR REPLACE VIEW processing_stats_summary AS
SELECT 
  date,
  SUM(total_processed) as daily_total,
  SUM(successful) as daily_successful,
  SUM(failed) as daily_failed,
  CASE 
    WHEN SUM(total_processed) > 0 THEN 
      ROUND(SUM(successful)::numeric / SUM(total_processed) * 100, 2)
    ELSE 0
  END as success_rate,
  AVG(avg_duration_ms)::integer as avg_duration_ms,
  SUM(total_ocr_processed) as daily_ocr,
  SUM(total_translations) as daily_translations,
  SUM(total_visual_analysis) as daily_visual_analysis
FROM processing_statistics
GROUP BY date
ORDER BY date DESC;

-- Comments
COMMENT ON TABLE processing_logs IS 'Detailed logs of document processing stages and status changes';
COMMENT ON TABLE processing_queue IS 'Queue for document processing jobs with priority and retry management';
COMMENT ON TABLE processing_statistics IS 'Aggregated statistics for document processing performance';
COMMENT ON TABLE processing_webhooks IS 'Webhook configurations for processing event notifications';
COMMENT ON TABLE processing_events IS 'Event delivery tracking for processing webhooks';

COMMENT ON COLUMN documents.processing_status IS 'Current processing status: pending, queued, processing, completed, failed, cancelled';
COMMENT ON COLUMN documents.processing_stage IS 'Current processing stage: type_detection, visual_analysis, ocr_processing, etc.';
COMMENT ON COLUMN documents.processing_results IS 'JSON results from smart pipeline processing';
COMMENT ON COLUMN processing_queue.priority IS 'Processing priority: 1=high, 2=medium, 3=low';

-- Initial data
INSERT INTO processing_statistics (date, hour)
SELECT 
  CURRENT_DATE,
  generate_series(0, 23) as hour
ON CONFLICT (date, hour) DO NOTHING;