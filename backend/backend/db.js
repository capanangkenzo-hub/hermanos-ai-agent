import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export function initDB(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
      email TEXT, service TEXT NOT NULL, date TEXT NOT NULL,
      time TEXT NOT NULL, notes TEXT, status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, visitor_id TEXT,
      messages TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function createAppointment(db, { name, phone, email, service, date, time, notes }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO appointments (id, name, phone, email, service, date, time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, phone, email || null, service, date, time, notes || null);
  return { id, name, phone, email, service, date, time, notes };
}

export function getAppointments(db, date) {
  if (date) return db.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY time').all(date);
  return db.prepare('SELECT * FROM appointments ORDER BY date, time').all();
}

export function getAvailableSlots(db, date) {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const hours = {
    0: { open: '09:00', close: '18:00' },
    1: { open: '09:00', close: '20:00' },
    2: { open: '09:00', close: '20:00' },
    3: { open: '09:00', close: '20:00' },
    4: { open: '09:00', close: '20:00' },
    5: { open: '09:00', close: '20:00' },
    6: { open: '08:00', close: '21:00' },
  };
  const { open, close } = hours[dayOfWeek];
  const allSlots = [];
  let [h, m] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  while (h < closeH || (h === closeH && m < closeM)) {
    allSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  const booked = db.prepare('SELECT time FROM appointments WHERE date = ? AND status != ?').all(date, 'cancelled').map(r => r.time);
  return allSlots.filter(slot => !booked.includes(slot));
}

export function saveConversation(db, visitorId, messages) {
  const existing = db.prepare('SELECT id FROM conversations WHERE visitor_id = ?').get(visitorId);
  if (existing) {
    db.prepare('UPDATE conversations SET messages = ?, updated_at = datetime(\'now\') WHERE visitor_id = ?').run(JSON.stringify(messages), visitorId);
    return existing.id;
  } else {
    const id = randomUUID();
    db.prepare('INSERT INTO conversations (id, visitor_id, messages) VALUES (?, ?, ?)').run(id, visitorId, JSON.stringify(messages));
    return id;
  }
}
