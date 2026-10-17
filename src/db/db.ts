import { open, type DB } from '@op-engineering/op-sqlite';
import { CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION } from './schema';

let db: DB | null = null;

export function getDb(): DB {
  if (db) {
    return db;
  }
  const instance = open({ name: 'telebot_backup.sqlite' });
  instance.executeSync('PRAGMA foreign_keys = ON');
  const versionRow = instance.executeSync('PRAGMA user_version').rows[0];
  const current = Number(versionRow?.user_version ?? 0);
  if (current < SCHEMA_VERSION) {
    for (const statement of CREATE_TABLES) {
      instance.executeSync(statement);
    }
    for (const statement of MIGRATIONS) {
      try {
        instance.executeSync(statement);
      } catch {
        // column already exists (fresh install) — safe to ignore
      }
    }
    instance.executeSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  db = instance;
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
