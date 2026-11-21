CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  budget TEXT NOT NULL DEFAULT '',
  timeline TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  source_path TEXT NOT NULL,
  service_context TEXT NOT NULL,
  town_context TEXT NOT NULL DEFAULT '',
  referral_owner TEXT NOT NULL,
  partner_id TEXT NOT NULL DEFAULT 'unassigned',
  request_kind TEXT NOT NULL DEFAULT 'project',
  consent_version TEXT NOT NULL,
  photo_keys TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new',
  notification_state TEXT NOT NULL DEFAULT 'pending',
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_lock_until INTEGER NOT NULL DEFAULT 0,
  notified_at TEXT
);
CREATE INDEX IF NOT EXISTS leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS leads_notifications ON leads(notification_state, notification_attempts);
CREATE INDEX IF NOT EXISTS leads_partner ON leads(partner_id, status);
