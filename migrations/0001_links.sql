CREATE TABLE links (
  id TEXT PRIMARY KEY NOT NULL,
  design_json TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
