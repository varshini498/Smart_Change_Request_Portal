-- Phase 1 indexes for query performance.

CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_request_events_created_at ON request_events(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_request_tags_request_id ON request_tags(request_id);
CREATE INDEX IF NOT EXISTS idx_request_tags_tag ON request_tags(tag);

CREATE INDEX IF NOT EXISTS idx_user_metrics_user_period ON user_metrics(user_id, period);
