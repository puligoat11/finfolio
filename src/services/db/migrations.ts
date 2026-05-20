export interface Migration {
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    name: '001_create_positions',
    sql: `
      CREATE TABLE IF NOT EXISTS positions (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shares INTEGER NOT NULL,
        avg_cost REAL NOT NULL,
        account_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(account_id);
    `,
  },
  {
    name: '002_create_trades',
    sql: `
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('buy', 'sell', 'dividend')),
        shares INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        date TEXT NOT NULL,
        account_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
      CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
    `,
  },
  {
    name: '003_create_watchlist',
    sql: `
      CREATE TABLE IF NOT EXISTS watchlist (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        added_at TEXT NOT NULL
      );
    `,
  },
  {
    name: '004_create_quote_cache',
    sql: `
      CREATE TABLE IF NOT EXISTS quote_cache (
        symbol TEXT PRIMARY KEY,
        price REAL NOT NULL,
        change REAL NOT NULL,
        change_percent REAL NOT NULL,
        name TEXT NOT NULL,
        previous_close REAL,
        open_price REAL,
        high REAL,
        low REAL,
        volume INTEGER,
        cached_at INTEGER NOT NULL
      );
    `,
  },
  {
    name: '005_create_accounts',
    sql: `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        cash_balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    name: '006_create_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
];
