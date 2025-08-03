
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { journalEntriesTable, journalLinesTable, usersTable, accountsTable } from '../db/schema';
import { type CreateJournalEntryInput } from '../schema';
import { createJournalEntry } from '../handlers/create_journal_entry';
import { eq, sql } from 'drizzle-orm';

describe('createJournalEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Setup test data
  const setupTestData = async () => {
    // Create test user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashed_password',
      role: 'accountant'
    }).execute();

    // Create test accounts
    await db.insert(accountsTable).values([
      { code: '1000', name: 'Cash', type: 'asset' },
      { code: '4000', name: 'Sales Revenue', type: 'revenue' },
      { code: '5000', name: 'Office Expenses', type: 'expense' },
      { code: '2000', name: 'Accounts Payable', type: 'liability' }
    ]).execute();

    // Get account IDs for testing
    const accounts = await db.select().from(accountsTable).execute();
    return {
      cashAccount: accounts.find(a => a.code === '1000')!,
      revenueAccount: accounts.find(a => a.code === '4000')!,
      expenseAccount: accounts.find(a => a.code === '5000')!,
      payableAccount: accounts.find(a => a.code === '2000')!
    };
  };

  it('should create a balanced journal entry', async () => {
    const { cashAccount, revenueAccount } = await setupTestData();

    const testInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'Cash sale recorded',
      reference: 'INV-001',
      transaction_type: 'sale',
      lines: [
        {
          account_id: cashAccount.id,
          debit_amount: 1000,
          credit_amount: 0,
          description: 'Cash received'
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 0,
          credit_amount: 1000,
          description: 'Sales revenue'
        }
      ]
    };

    const result = await createJournalEntry(testInput);

    // Verify journal entry fields
    expect(result.description).toEqual('Cash sale recorded');
    expect(result.reference).toEqual('INV-001');
    expect(result.transaction_type).toEqual('sale');
    expect(result.status).toEqual('draft');
    expect(result.created_by).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.entry_number).toMatch(/^JE-\d{7}$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save journal entry and lines to database', async () => {
    const { cashAccount, revenueAccount } = await setupTestData();

    const testInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'Test transaction',
      reference: null,
      transaction_type: 'manual',
      lines: [
        {
          account_id: cashAccount.id,
          debit_amount: 500,
          credit_amount: 0,
          description: 'Debit entry'
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 0,
          credit_amount: 500,
          description: 'Credit entry'
        }
      ]
    };

    const result = await createJournalEntry(testInput);

    // Verify journal entry was saved
    const savedEntry = await db.select()
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.id, result.id))
      .execute();

    expect(savedEntry).toHaveLength(1);
    expect(savedEntry[0].description).toEqual('Test transaction');
    expect(savedEntry[0].transaction_type).toEqual('manual');

    // Verify journal lines were saved
    const savedLines = await db.select()
      .from(journalLinesTable)
      .where(eq(journalLinesTable.journal_entry_id, result.id))
      .execute();

    expect(savedLines).toHaveLength(2);
    
    const debitLine = savedLines.find(line => parseFloat(line.debit_amount) > 0);
    const creditLine = savedLines.find(line => parseFloat(line.credit_amount) > 0);

    expect(debitLine).toBeDefined();
    expect(parseFloat(debitLine!.debit_amount)).toEqual(500);
    expect(debitLine!.account_id).toEqual(cashAccount.id);
    expect(debitLine!.description).toEqual('Debit entry');

    expect(creditLine).toBeDefined();
    expect(parseFloat(creditLine!.credit_amount)).toEqual(500);
    expect(creditLine!.account_id).toEqual(revenueAccount.id);
    expect(creditLine!.description).toEqual('Credit entry');
  });

  it('should generate unique entry numbers', async () => {
    const { cashAccount, revenueAccount } = await setupTestData();

    const testInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'First entry',
      reference: null,
      transaction_type: 'manual',
      lines: [
        {
          account_id: cashAccount.id,
          debit_amount: 100,
          credit_amount: 0,
          description: null
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 0,
          credit_amount: 100,
          description: null
        }
      ]
    };

    const firstEntry = await createJournalEntry(testInput);
    const secondEntry = await createJournalEntry({
      ...testInput,
      description: 'Second entry'
    });

    expect(firstEntry.entry_number).toEqual('JE-0000001');
    expect(secondEntry.entry_number).toEqual('JE-0000002');
    expect(firstEntry.entry_number).not.toEqual(secondEntry.entry_number);
  });

  it('should reject unbalanced journal entries', async () => {
    const { cashAccount, revenueAccount } = await setupTestData();

    const unbalancedInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'Unbalanced entry',
      reference: null,
      transaction_type: 'manual',
      lines: [
        {
          account_id: cashAccount.id,
          debit_amount: 1000,
          credit_amount: 0,
          description: 'Too much debit'
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 0,
          credit_amount: 500,
          description: 'Not enough credit'
        }
      ]
    };

    await expect(createJournalEntry(unbalancedInput)).rejects.toThrow(/not balanced/i);
  });

  it('should reject entries with both debit and credit on same line', async () => {
    const { cashAccount, revenueAccount } = await setupTestData();

    const invalidInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'Invalid entry',
      reference: null,
      transaction_type: 'manual',
      lines: [
        {
          account_id: cashAccount.id,
          debit_amount: 500,
          credit_amount: 500, // Both debit and credit - invalid
          description: 'Invalid line'
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 0,
          credit_amount: 0,
          description: 'Zero amounts'
        }
      ]
    };

    await expect(createJournalEntry(invalidInput)).rejects.toThrow(/cannot have both/i);
  });

  it('should reject entries with zero amounts on both sides', async () => {
    const { cashAccount, revenueAccount } = await setupTestData();

    const zeroAmountInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'Zero amount entry',
      reference: null,
      transaction_type: 'manual',
      lines: [
        {
          account_id: cashAccount.id,
          debit_amount: 0,
          credit_amount: 0, // Both zero - invalid
          description: 'Zero line'
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 500,
          credit_amount: 0,
          description: 'Valid debit'
        },
        {
          account_id: revenueAccount.id,
          debit_amount: 0,
          credit_amount: 500,
          description: 'Valid credit to balance'
        }
      ]
    };

    await expect(createJournalEntry(zeroAmountInput)).rejects.toThrow(/must have either debit or credit/i);
  });

  it('should reject entries referencing non-existent accounts', async () => {
    await setupTestData();

    const invalidAccountInput: CreateJournalEntryInput = {
      date: new Date('2024-01-15'),
      description: 'Invalid account reference',
      reference: null,
      transaction_type: 'manual',
      lines: [
        {
          account_id: 99999, // Non-existent account ID
          debit_amount: 500,
          credit_amount: 0,
          description: 'Invalid account'
        },
        {
          account_id: 99998, // Another non-existent account ID
          debit_amount: 0,
          credit_amount: 500,
          description: 'Another invalid account'
        }
      ]
    };

    await expect(createJournalEntry(invalidAccountInput)).rejects.toThrow(/accounts do not exist/i);
  });
});
