
import { db } from '../db';
import { journalEntriesTable } from '../db/schema';
import { type JournalEntry } from '../schema';

export const getJournalEntries = async (): Promise<JournalEntry[]> => {
  try {
    const results = await db.select()
      .from(journalEntriesTable)
      .execute();

    return results.map(entry => ({
      ...entry,
      // Convert date fields to proper Date objects
      date: new Date(entry.date),
      created_at: new Date(entry.created_at),
      updated_at: new Date(entry.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch journal entries:', error);
    throw error;
  }
};
