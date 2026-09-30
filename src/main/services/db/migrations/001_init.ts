export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  default_branch TEXT,
  description TEXT,
  fetched_at TEXT,
  UNIQUE(owner, name)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  repo_id INTEGER REFERENCES repos(id),
  branch TEXT NOT NULL,
  title TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user','assistant','tool','system')),
  content TEXT,
  tool_calls TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS repo_trees (
  repo_id INTEGER REFERENCES repos(id),
  branch TEXT,
  commit_sha TEXT,
  tree_json TEXT,
  fetched_at TEXT,
  PRIMARY KEY (repo_id, branch, commit_sha)
);

CREATE TABLE IF NOT EXISTS file_cache (
  repo_id INTEGER REFERENCES repos(id),
  branch TEXT,
  commit_sha TEXT,
  path TEXT,
  content TEXT,
  truncated INTEGER DEFAULT 0,
  PRIMARY KEY (repo_id, branch, commit_sha, path)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_encrypted BLOB
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);
`
