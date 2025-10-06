-- Upload Batches Tracking
-- Tracks bulk upload batches for monitoring, rollback, and analytics

BEGIN;

-- Create upload_batches table
CREATE TABLE IF NOT EXISTS upload_batches (
    id VARCHAR(100) PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'initializing',
    total_files INTEGER NOT NULL DEFAULT 0,
    uploaded_files INTEGER NOT NULL DEFAULT 0,
    processed_files INTEGER NOT NULL DEFAULT 0,
    failed_files INTEGER NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    folder_path TEXT,
    metadata JSONB DEFAULT '{}',
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT upload_batches_status_check CHECK (
        status IN (
            'initializing',
            'uploading',
            'processing',
            'completed',
            'failed',
            'partial_failure'
        )
    ),
    CONSTRAINT upload_batches_files_check CHECK (
        uploaded_files >= 0 AND
        processed_files >= 0 AND
        failed_files >= 0 AND
        uploaded_files <= total_files AND
        processed_files <= uploaded_files
    )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_category ON upload_batches(category);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_at ON upload_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_batches_metadata ON upload_batches USING gin(metadata);

-- Update documents table to track batch_id
-- Add batch_id to metadata if not already there
DO $$
BEGIN
    -- This is a safe operation since we're using JSONB
    -- If the column doesn't support JSONB operations, this will be a no-op
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_batch_id ON documents ((metadata->>''batch_id''))';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create batch_id index on documents';
END
$$;

-- Create function to update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- When a document is created with a batch_id, increment uploaded_files
    IF TG_OP = 'INSERT' AND NEW.metadata ? 'batch_id' THEN
        UPDATE upload_batches
        SET uploaded_files = uploaded_files + 1,
            updated_at = NOW()
        WHERE id = NEW.metadata->>'batch_id';
    END IF;
    
    -- When a document processing status changes, update processed/failed counts
    IF TG_OP = 'UPDATE' AND NEW.metadata ? 'batch_id' THEN
        -- If document just completed processing successfully
        IF OLD.status != 'processed' AND NEW.status = 'processed' THEN
            UPDATE upload_batches
            SET processed_files = processed_files + 1,
                updated_at = NOW()
            WHERE id = NEW.metadata->>'batch_id';
        END IF;
        
        -- If document processing failed
        IF OLD.status != 'failed' AND NEW.status = 'failed' THEN
            UPDATE upload_batches
            SET failed_files = failed_files + 1,
                updated_at = NOW()
            WHERE id = NEW.metadata->>'batch_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on documents table
DROP TRIGGER IF EXISTS trigger_update_batch_progress ON documents;
CREATE TRIGGER trigger_update_batch_progress
    AFTER INSERT OR UPDATE ON documents
    FOR EACH ROW
    WHEN (NEW.metadata ? 'batch_id')
    EXECUTE FUNCTION update_batch_progress();

-- Function to auto-complete batch when all files are processed
CREATE OR REPLACE FUNCTION auto_complete_batch()
RETURNS TRIGGER AS $$
BEGIN
    -- If all files in batch are processed (success or failure), mark batch as complete
    IF NEW.uploaded_files > 0 AND 
       (NEW.processed_files + NEW.failed_files) >= NEW.uploaded_files THEN
        
        IF NEW.failed_files = 0 THEN
            NEW.status := 'completed';
        ELSIF NEW.failed_files < NEW.uploaded_files THEN
            NEW.status := 'partial_failure';
        ELSE
            NEW.status := 'failed';
        END IF;
        
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-complete batches
DROP TRIGGER IF EXISTS trigger_auto_complete_batch ON upload_batches;
CREATE TRIGGER trigger_auto_complete_batch
    BEFORE UPDATE ON upload_batches
    FOR EACH ROW
    EXECUTE FUNCTION auto_complete_batch();

-- Enable RLS on upload_batches
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role manages upload batches" ON upload_batches
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view batches from their organization
CREATE POLICY "Users can view organization batches" ON upload_batches
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_user_id = auth.uid()
            AND (
                role IN ('owner', 'admin')
                OR metadata->>'created_by' = id::text
            )
        )
    );

-- Comments
COMMENT ON TABLE upload_batches IS 'Tracks bulk upload batches for monitoring and analytics';
COMMENT ON COLUMN upload_batches.id IS 'Unique batch identifier (e.g., batch_2024_01_15_154732)';
COMMENT ON COLUMN upload_batches.status IS 'Current batch status: initializing, uploading, processing, completed, failed, partial_failure';
COMMENT ON COLUMN upload_batches.total_files IS 'Total number of files in this batch';
COMMENT ON COLUMN upload_batches.uploaded_files IS 'Number of files successfully uploaded';
COMMENT ON COLUMN upload_batches.processed_files IS 'Number of files fully processed (embeddings generated)';
COMMENT ON COLUMN upload_batches.failed_files IS 'Number of files that failed processing';
COMMENT ON COLUMN upload_batches.metadata IS 'Additional batch metadata (created_by, source, tags, etc.)';
COMMENT ON COLUMN upload_batches.error_details IS 'Detailed error information for failed batches';

COMMIT;
