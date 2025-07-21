-- Document Relationships Migration
-- Adds support for document relationships, clusters, and trip organization

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Relationship types table
CREATE TABLE IF NOT EXISTS relationship_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  bidirectional BOOLEAN DEFAULT true,
  icon VARCHAR(50),
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default relationship types
INSERT INTO relationship_types (id, name, description, bidirectional, icon, color) VALUES
  ('BOOKING_CONFIRMATION', 'Booking Confirmation', 'Links a booking to its confirmation', true, 'link', '#10b981'),
  ('TRIP_DOCUMENT', 'Trip Document', 'Documents belonging to the same trip', true, 'map-pin', '#3b82f6'),
  ('PREREQUISITE', 'Prerequisite', 'Document required before another', false, 'arrow-right', '#f59e0b'),
  ('AMENDMENT', 'Amendment', 'Changes or updates to original document', false, 'edit', '#ef4444'),
  ('SUPPLEMENT', 'Supplement', 'Additional document supporting another', false, 'plus-circle', '#8b5cf6'),
  ('TRANSLATION', 'Translation', 'Translated version of document', true, 'globe', '#06b6d4'),
  ('CANCELLATION', 'Cancellation', 'Cancellation of original document', false, 'x-circle', '#dc2626'),
  ('REPLACEMENT', 'Replacement', 'Replaces an earlier document', false, 'refresh', '#059669'),
  ('RELATED_BOOKING', 'Related Booking', 'Related but separate bookings', true, 'link-2', '#7c3aed'),
  ('COMPANION_DOCUMENT', 'Companion Document', 'Documents for traveling companions', true, 'users', '#2563eb')
ON CONFLICT (id) DO NOTHING;

-- Document relationships table
CREATE TABLE IF NOT EXISTS document_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL REFERENCES relationship_types(id),
  source_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  confidence NUMERIC(3,2) DEFAULT 0.00 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  is_auto_detected BOOLEAN DEFAULT false,
  is_confirmed BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure source and target are different
  CONSTRAINT different_documents CHECK (source_id != target_id),
  
  -- Ensure unique relationships (considering bidirectional)
  CONSTRAINT unique_relationship UNIQUE (type, source_id, target_id)
);

-- Create indexes for performance
CREATE INDEX idx_relationships_source ON document_relationships(source_id);
CREATE INDEX idx_relationships_target ON document_relationships(target_id);
CREATE INDEX idx_relationships_type ON document_relationships(type);
CREATE INDEX idx_relationships_confidence ON document_relationships(confidence);
CREATE INDEX idx_relationships_auto_detected ON document_relationships(is_auto_detected);

-- Document clusters table
CREATE TABLE IF NOT EXISTS document_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'unknown',
  confidence NUMERIC(3,2) DEFAULT 0.00 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  is_auto_detected BOOLEAN DEFAULT false,
  is_confirmed BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cluster documents junction table
CREATE TABLE IF NOT EXISTS cluster_documents (
  cluster_id UUID NOT NULL REFERENCES document_clusters(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cluster_id, document_id)
);

-- Create indexes for cluster tables
CREATE INDEX idx_cluster_type ON document_clusters(type);
CREATE INDEX idx_cluster_user ON document_clusters(user_id);
CREATE INDEX idx_cluster_documents_doc ON cluster_documents(document_id);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id UUID REFERENCES document_clusters(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'domestic',
  status VARCHAR(50) DEFAULT 'planning',
  metadata JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '{}',
  completeness JSONB DEFAULT '{}',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trip documents table
CREATE TABLE IF NOT EXISTS trip_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'supporting' CHECK (role IN ('primary', 'supporting', 'optional')),
  sequence INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique document per trip
  CONSTRAINT unique_trip_document UNIQUE (trip_id, document_id)
);

-- Create indexes for trip tables
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_type ON trips(type);
CREATE INDEX idx_trip_documents_trip ON trip_documents(trip_id);
CREATE INDEX idx_trip_documents_doc ON trip_documents(document_id);

-- Trip dossiers table
CREATE TABLE IF NOT EXISTS trip_dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  sections JSONB DEFAULT '{}',
  summary JSONB DEFAULT '{}',
  checklist JSONB DEFAULT '[]',
  contacts JSONB DEFAULT '{}',
  emergency_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- One dossier per trip
  CONSTRAINT unique_trip_dossier UNIQUE (trip_id)
);

-- Relationship confidence scores table (for tracking confidence changes)
CREATE TABLE IF NOT EXISTS relationship_confidence_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES document_relationships(id) ON DELETE CASCADE,
  confidence NUMERIC(3,2) NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index for confidence history
CREATE INDEX idx_confidence_history_rel ON relationship_confidence_history(relationship_id);

-- Functions for relationship management

-- Function to create bidirectional relationships
CREATE OR REPLACE FUNCTION create_bidirectional_relationship(
  p_type VARCHAR(50),
  p_source_id UUID,
  p_target_id UUID,
  p_confidence NUMERIC(3,2),
  p_metadata JSONB,
  p_user_id UUID
) RETURNS TABLE (
  relationship_id UUID,
  inverse_id UUID
) AS $$
DECLARE
  v_relationship_id UUID;
  v_inverse_id UUID;
  v_is_bidirectional BOOLEAN;
BEGIN
  -- Check if relationship type is bidirectional
  SELECT bidirectional INTO v_is_bidirectional
  FROM relationship_types
  WHERE id = p_type;
  
  -- Create primary relationship
  INSERT INTO document_relationships (
    type, source_id, target_id, confidence, metadata, user_id
  ) VALUES (
    p_type, p_source_id, p_target_id, p_confidence, p_metadata, p_user_id
  ) RETURNING id INTO v_relationship_id;
  
  -- Create inverse relationship if bidirectional
  IF v_is_bidirectional THEN
    INSERT INTO document_relationships (
      type, source_id, target_id, confidence, metadata, user_id
    ) VALUES (
      p_type, p_target_id, p_source_id, p_confidence, p_metadata, p_user_id
    ) RETURNING id INTO v_inverse_id;
  END IF;
  
  RETURN QUERY SELECT v_relationship_id, v_inverse_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find connected documents
CREATE OR REPLACE FUNCTION find_connected_documents(
  p_document_id UUID,
  p_max_depth INTEGER DEFAULT 3
) RETURNS TABLE (
  document_id UUID,
  depth INTEGER,
  path UUID[]
) AS $$
WITH RECURSIVE connected_docs AS (
  -- Base case: starting document
  SELECT 
    p_document_id AS document_id,
    0 AS depth,
    ARRAY[p_document_id] AS path
  
  UNION ALL
  
  -- Recursive case: find connected documents
  SELECT 
    CASE 
      WHEN r.source_id = cd.document_id THEN r.target_id
      ELSE r.source_id
    END AS document_id,
    cd.depth + 1,
    cd.path || CASE 
      WHEN r.source_id = cd.document_id THEN r.target_id
      ELSE r.source_id
    END
  FROM connected_docs cd
  JOIN document_relationships r ON (
    (r.source_id = cd.document_id OR r.target_id = cd.document_id)
    AND r.confidence >= 0.5
  )
  WHERE cd.depth < p_max_depth
    AND NOT (CASE 
      WHEN r.source_id = cd.document_id THEN r.target_id
      ELSE r.source_id
    END = ANY(cd.path))
)
SELECT DISTINCT document_id, MIN(depth) AS depth, path
FROM connected_docs
GROUP BY document_id, path
ORDER BY depth, document_id;
$$ LANGUAGE sql;

-- Function to calculate cluster statistics
CREATE OR REPLACE FUNCTION calculate_cluster_stats(p_cluster_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'document_count', COUNT(DISTINCT cd.document_id),
    'document_types', jsonb_agg(DISTINCT d.type),
    'total_size', COALESCE(SUM(d.file_size), 0),
    'date_range', jsonb_build_object(
      'earliest', MIN(d.created_at),
      'latest', MAX(d.created_at)
    ),
    'users', COUNT(DISTINCT d.user_id)
  ) INTO v_stats
  FROM cluster_documents cd
  JOIN documents d ON d.id = cd.document_id
  WHERE cd.cluster_id = p_cluster_id;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Update timestamp trigger for relationships
CREATE OR REPLACE FUNCTION update_relationship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_relationships_timestamp
  BEFORE UPDATE ON document_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_timestamp();

-- Update timestamp trigger for clusters
CREATE TRIGGER update_clusters_timestamp
  BEFORE UPDATE ON document_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_timestamp();

-- Update timestamp trigger for trips
CREATE TRIGGER update_trips_timestamp
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_timestamp();

-- Views

-- View for relationship statistics
CREATE OR REPLACE VIEW relationship_statistics AS
SELECT 
  rt.id AS type,
  rt.name AS type_name,
  COUNT(dr.id) AS relationship_count,
  AVG(dr.confidence) AS avg_confidence,
  COUNT(DISTINCT dr.source_id) + COUNT(DISTINCT dr.target_id) AS documents_involved,
  SUM(CASE WHEN dr.is_auto_detected THEN 1 ELSE 0 END) AS auto_detected_count,
  SUM(CASE WHEN dr.is_confirmed THEN 1 ELSE 0 END) AS confirmed_count
FROM relationship_types rt
LEFT JOIN document_relationships dr ON dr.type = rt.id
GROUP BY rt.id, rt.name;

-- View for trip summary
CREATE OR REPLACE VIEW trip_summary AS
SELECT 
  t.id,
  t.name,
  t.type,
  t.status,
  t.user_id,
  COUNT(DISTINCT td.document_id) AS document_count,
  t.metadata->>'duration' AS duration_days,
  t.metadata->'destinations' AS destinations,
  t.completeness->>'overall' AS completeness_score,
  t.created_at,
  t.updated_at
FROM trips t
LEFT JOIN trip_documents td ON td.trip_id = t.id
GROUP BY t.id;

-- View for orphaned documents
CREATE OR REPLACE VIEW orphaned_documents AS
SELECT 
  d.id,
  d.type,
  d.name,
  d.user_id,
  d.created_at
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM trip_documents td WHERE td.document_id = d.id
)
AND NOT EXISTS (
  SELECT 1 FROM cluster_documents cd WHERE cd.document_id = d.id
)
AND NOT EXISTS (
  SELECT 1 FROM document_relationships dr 
  WHERE dr.source_id = d.id OR dr.target_id = d.id
);

-- Add comments
COMMENT ON TABLE document_relationships IS 'Stores relationships between documents';
COMMENT ON TABLE document_clusters IS 'Groups of related documents';
COMMENT ON TABLE trips IS 'Organized trips with associated documents';
COMMENT ON TABLE trip_documents IS 'Documents associated with trips';
COMMENT ON TABLE trip_dossiers IS 'Compiled information for trips';
COMMENT ON COLUMN document_relationships.confidence IS 'Confidence score of the relationship (0-1)';
COMMENT ON COLUMN document_clusters.type IS 'Type of cluster (trip, booking, document_set, etc.)';
COMMENT ON COLUMN trips.status IS 'Trip status (planning, booked, upcoming, in_progress, completed)';
COMMENT ON COLUMN trips.completeness IS 'JSON object with completeness scores by category';