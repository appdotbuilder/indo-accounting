
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { journalEntriesTable, usersTable } from '../db/schema';
import { getJournalEntries } from '../handlers/get_journal_entries';

describe('getJournalEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no journal entries exist', async () => {
    const result = await getJournalEntries();
    expect(result).toEqual([]);
  });

  it('should return all journal entries', async () => {
    // Create a user first (required for created_by foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test journal entries
    const testEntries = [
      {
        entry_number: 'JE001',
        date: new Date('2024-01-15'),
        description: 'Opening Balance',
        reference: 'REF001',
        transaction_type: 'manual' as const,
        status: 'posted' as const,
        created_by: userId
      },
      {
        entry_number: 'JE002',
        date: new Date('2024-01-16'),
        description: 'Cash Sale',
        reference: null,
        transaction_type: 'sale' as const,
        status: 'draft' as const,
        created_by: userId
      }
    ];

    await db.insert(journalEntriesTable)
      .values(testEntries)
      .execute();

    const result = await getJournalEntries();

    expect(result).toHaveLength(2);
    
    // Check first entry
    const firstEntry = result.find(e => e.entry_number === 'JE001');
    expect(firstEntry).toBeDefined();
    expect(firstEntry!.description).toBe('Opening Balance');
    expect(firstEntry!.reference).toBe('REF001');
    expect(firstEntry!.transaction_type).toBe('manual');
    expect(firstEntry!.status).toBe('posted');
    expect(firstEntry!.created_by).toBe(userId);
    expect(firstEntry!.date).toBeInstanceOf(Date);
    expect(firstEntry!.created_at).toBeInstanceOf(Date);
    expect(firstEntry!.updated_at).toBeInstanceOf(Date);

    // Check second entry
    const secondEntry = result.find(e => e.entry_number === 'JE002');
    expect(secondEntry).toBeDefined();
    expect(secondEntry!.description).toBe('Cash Sale');
    expect(secondEntry!.reference).toBeNull();
    expect(secondEntry!.transaction_type).toBe('sale');
    expect(secondEntry!.status).toBe('draft');
    expect(secondEntry!.created_by).toBe(userId);
  });

  it('should handle different transaction types and statuses', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'accountant'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create entries with different types and statuses
    const testEntries = [
      {
        entry_number: 'JE003',
        date: new Date('2024-01-17'),
        description: 'Purchase Transaction',
        transaction_type: 'purchase' as const,
        status: 'posted' as const,
        created_by: userId
      },
      {
        entry_number: 'JE004',
        date: new Date('2024-01-18'),
        description: 'Expense Transaction',
        transaction_type: 'expense' as const,
        status: 'cancelled' as const,
        created_by: userId
      }
    ];

    await db.insert(journalEntriesTable)
      .values(testEntries)
      .execute();

    const result = await getJournalEntries();

    expect(result).toHaveLength(2);
    
    const purchaseEntry = result.find(e => e.transaction_type === 'purchase');
    expect(purchaseEntry).toBeDefined();
    expect(purchaseEntry!.status).toBe('posted');

    const expenseEntry = result.find(e => e.transaction_type === 'expense');
    expect(expenseEntry).toBeDefined();
    expect(expenseEntry!.status).toBe('cancelled');
  });
});
