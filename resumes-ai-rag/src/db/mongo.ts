import { MongoClient, Db } from 'mongodb';
import config from '../config';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongo(uri?: string, dbName?: string) {
  const mongoUri = uri || config.mongodbUri;
  const name = dbName || config.mongodbDb;
  if (client && db) return { client, db };

  client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db(name);
  return { client, db };
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not connected');
  return db;
}

export async function pingDb(): Promise<number> {
  if (!client) throw new Error('MongoDB client not connected');
  const start = Date.now();
  // ping command
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await client.db().command({ ping: 1 });
  return Date.now() - start;
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
