
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  accountsTable, 
  journalEntriesTable, 
  journalLinesTable 
} from '../db/schema';
import { type BalanceSheetInput } from '../schema';
import { generateBalanceSheet } from '../handlers/generate_balance_sheet';

describe('generateBalanceSheet', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate balance sheet with proper account groupings', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test accounts
    const [cashAccount] = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    const [revenueAccount] = await db.insert(accountsTable)
      .values({
        code: '4000',
        name: 'Sales Revenue',
        type: 'revenue'
      })
      .returning()
      .execute();

    const [liabilityAccount] = await db.insert(accountsTable)
      .values({
        code: '2000',
        name: 'Accounts Payable',
        type: 'liability'
      })
      .returning()
      .execute();

    const [equityAccount] = await db.insert(accountsTable)
      .values({
        code: '3000',
        name: 'Owner Equity',
        type: 'equity'
      })
      .returning()
      .execute();

    // Create journal entry with posted status
    const testDate = new Date('2024-01-15');
    const [journalEntry] = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE001',
        date: testDate,
        description: 'Test Entry',
        transaction_type: 'manual',
        status: 'posted',
        created_by: user.id
      })
      .returning()
      .execute();

    // Create journal lines
    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry.id,
          account_id: cashAccount.id,
          debit_amount: '1000.00',
          credit_amount: '0.00',
          description: 'Cash received'
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: liabilityAccount.id,
          debit_amount: '0.00',
          credit_amount: '500.00',
          description: 'Liability increase'
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: equityAccount.id,
          debit_amount: '0.00',
          credit_amount: '500.00',
          description: 'Equity increase'
        }
      ])
      .execute();

    const input: BalanceSheetInput = {
      as_of_date: new Date('2024-01-31')
    };

    const result = await generateBalanceSheet(input);

    // Verify structure
    expect(result.as_of_date).toEqual(input.as_of_date);
    expect(result.assets).toHaveLength(1);
    expect(result.liabilities).toHaveLength(1);
    expect(result.equity).toHaveLength(1);

    // Verify asset account
    expect(result.assets[0].account_id).toEqual(cashAccount.id);
    expect(result.assets[0].account_name).toEqual('Cash');
    expect(result.assets[0].balance).toEqual(1000);

    // Verify liability account
    expect(result.liabilities[0].account_id).toEqual(liabilityAccount.id);
    expect(result.liabilities[0].account_name).toEqual('Accounts Payable');
    expect(result.liabilities[0].balance).toEqual(500);

    // Verify equity account
    expect(result.equity[0].account_id).toEqual(equityAccount.id);
    expect(result.equity[0].account_name).toEqual('Owner Equity');
    expect(result.equity[0].balance).toEqual(500);

    // Verify totals
    expect(result.total_assets).toEqual(1000);
    expect(result.total_liabilities).toEqual(500);  
    expect(result.total_equity).toEqual(500);

    // Verify accounting equation: Assets = Liabilities + Equity
    expect(result.total_assets).toEqual(result.total_liabilities + result.total_equity);
  });

  it('should only include posted journal entries', async () => {
    // Create test user and accounts
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        role: 'admin'
      })
      .returning()
      .execute();

    const [cashAccount] = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    const [equityAccount] = await db.insert(accountsTable)
      .values({
        code: '3000',
        name: 'Owner Equity',
        type: 'equity'
      })
      .returning()
      .execute();

    // Create draft journal entry (should be excluded)
    const [draftEntry] = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE001',
        date: new Date('2024-01-10'),
        description: 'Draft Entry',
        transaction_type: 'manual',
        status: 'draft',
        created_by: user.id
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: draftEntry.id,
          account_id: cashAccount.id,
          debit_amount: '500.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: draftEntry.id,
          account_id: equityAccount.id,
          debit_amount: '0.00',
          credit_amount: '500.00'
        }
      ])
      .execute();

    const input: BalanceSheetInput = {
      as_of_date: new Date('2024-01-31')
    };

    const result = await generateBalanceSheet(input);

    // Should have no balances since draft entries are excluded
    expect(result.assets).toHaveLength(0);
    expect(result.liabilities).toHaveLength(0);
    expect(result.equity).toHaveLength(0);
    expect(result.total_assets).toEqual(0);
    expect(result.total_liabilities).toEqual(0);
    expect(result.total_equity).toEqual(0);
  });

  it('should filter by date correctly', async () => {
    // Create test user and accounts
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        role: 'admin'
      })
      .returning()
      .execute();

    const [cashAccount] = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    const [equityAccount] = await db.insert(accountsTable)
      .values({
        code: '3000',
        name: 'Owner Equity',
        type: 'equity'
      })
      .returning()
      .execute();

    // Create entry before cutoff date
    const [earlyEntry] = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE001',
        date: new Date('2024-01-10'),
        description: 'Early Entry',
        transaction_type: 'manual',
        status: 'posted',
        created_by: user.id
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: earlyEntry.id,
          account_id: cashAccount.id,
          debit_amount: '300.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: earlyEntry.id,
          account_id: equityAccount.id,
          debit_amount: '0.00',
          credit_amount: '300.00'
        }
      ])
      .execute();

    // Create entry after cutoff date (should be excluded)
    const [lateEntry] = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE002',
        date: new Date('2024-02-05'),
        description: 'Late Entry',
        transaction_type: 'manual',
        status: 'posted',
        created_by: user.id
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: lateEntry.id,
          account_id: cashAccount.id,
          debit_amount: '200.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: lateEntry.id,
          account_id: equityAccount.id,
          debit_amount: '0.00',
          credit_amount: '200.00'
        }
      ])
      .execute();

    const input: BalanceSheetInput = {
      as_of_date: new Date('2024-01-31')
    };

    const result = await generateBalanceSheet(input);

    // Should only include the early entry
    expect(result.assets).toHaveLength(1);
    expect(result.equity).toHaveLength(1);
    expect(result.assets[0].balance).toEqual(300);
    expect(result.equity[0].balance).toEqual(300);
    expect(result.total_assets).toEqual(300);
    expect(result.total_equity).toEqual(300);
  });

  it('should exclude zero balance accounts', async () => {
    // Create test user and accounts
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        role: 'admin'
      })
      .returning()
      .execute();

    const [cashAccount] = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    const [zeroBalanceAccount] = await db.insert(accountsTable)
      .values({
        code: '1100',
        name: 'Inventory',
        type: 'asset'
      })
      .returning()
      .execute();

    const [equityAccount] = await db.insert(accountsTable)
      .values({
        code: '3000',
        name: 'Owner Equity',
        type: 'equity'
      })
      .returning()
      .execute();

    // Create entry that gives cash account a balance
    const [journalEntry] = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE001',
        date: new Date('2024-01-15'),
        description: 'Test Entry',
        transaction_type: 'manual',
        status: 'posted',
        created_by: user.id
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry.id,
          account_id: cashAccount.id,
          debit_amount: '1000.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: equityAccount.id,
          debit_amount: '0.00',
          credit_amount: '1000.00'
        }
      ])
      .execute();

    const input: BalanceSheetInput = {
      as_of_date: new Date('2024-01-31')
    };

    const result = await generateBalanceSheet(input);

    // Should only include accounts with non-zero balances
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].account_name).toEqual('Cash');
    
    // Zero balance inventory account should not appear
    const inventoryInResults = result.assets.find(a => a.account_name === 'Inventory');
    expect(inventoryInResults).toBeUndefined();
  });
});
