CREATE TABLE IF NOT EXISTS certificates (
  token TEXT PRIMARY KEY,
  tracking_id TEXT,
  status TEXT NOT NULL DEFAULT 'Issued',
  values_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_certificates_tracking ON certificates(tracking_id);
