let pool = null;

export function getPool() {
  return pool;
}

export async function initPostgres() {
  try {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) {
      console.log('[PG] DATABASE_URL not provided, skipping Postgres init');
      return null;
    }
    const { Pool } = await import('pg');
    pool = new Pool({ connectionString: url, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false });
    await pool.query('SELECT 1');
    console.log('[PG] Connected');
    await createTables();
    return pool;
  } catch (e) {
    console.warn('[PG] init failed:', e.message);
    pool = null;
    return null;
  }
}

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        full_name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        referral_code TEXT UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        visits INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        total_commissions INTEGER DEFAULT 0,
        role TEXT DEFAULT 'agent'
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        original_price INTEGER NOT NULL,
        category TEXT,
        stock INTEGER DEFAULT 0,
        image TEXT,
        purchase_type TEXT DEFAULT 'group',
        groupbuy_is_active BOOLEAN DEFAULT TRUE,
        groupbuy_current_participants INTEGER DEFAULT 0,
        groupbuy_min_participants INTEGER DEFAULT 0,
        groupbuy_max_participants INTEGER DEFAULT 0,
        groupbuy_end_date TIMESTAMP,
        shipping_cost INTEGER DEFAULT 0,
        shipping_delivery_days INTEGER DEFAULT 3,
        details JSONB
      );

      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        agent_id INTEGER REFERENCES agents(id),
        name TEXT,
        email TEXT,
        phone TEXT,
        referral_code TEXT,
        joined_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        agent_id INTEGER REFERENCES agents(id),
        quantity INTEGER DEFAULT 1,
        total_amount INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        product_id INTEGER REFERENCES products(id),
        amount INTEGER NOT NULL,
        commission INTEGER NOT NULL,
        date TIMESTAMP DEFAULT NOW(),
        customer TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('[PG] Schema ensured');
  } finally {
    client.release();
  }
}
