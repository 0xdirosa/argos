-- Tabel jobs: menyimpan setiap permintaan analisis
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query        TEXT NOT NULL,
  query_type   TEXT NOT NULL CHECK (query_type IN ('wallet','token','contract')),
  target       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'QUEUED'
               CHECK (status IN ('QUEUED','PROCESSING','VALIDATING','COMPLETED','FAILED')),
  result       JSONB,
  result_hash  TEXT,
  arc_tx_hash  TEXT,
  payment_in   NUMERIC(18,6) DEFAULT 0,
  payment_out  NUMERIC(18,6) DEFAULT 0,
  net          NUMERIC(18,6) GENERATED ALWAYS AS (payment_in - payment_out) STORED,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Tabel agent_state: satu baris, menyimpan state kumulatif agent
CREATE TABLE IF NOT EXISTS agent_state (
  id              INT PRIMARY KEY DEFAULT 1,
  total_earned    NUMERIC(18,6) DEFAULT 0,
  total_spent     NUMERIC(18,6) DEFAULT 0,
  job_count       INT DEFAULT 0,
  arc_agent_id    TEXT,
  arc_contract    TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed satu baris agent_state
INSERT INTO agent_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
