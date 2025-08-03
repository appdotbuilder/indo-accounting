
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  accountsTable, 
  journalEntriesTable, 
  journalLinesTable 
} from '../db/schema';
import { type ReportPeriodInput } from '../schema';
import { generateIncomeStatement } from '../handlers/generate_income_statement';

describe('generateIncomeStatement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate empty income statement for period with no transactions', async () => {
    const input: ReportPeriodInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateIncomeStatement(input);

    expect(result.revenues).toHaveLength(0);
    expect(result.expenses).toHaveLength(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(0);
    expect(result.period_start).toEqual(input.start_date);
    expect(result.period_end).toEqual(input.end_date);
  });

  it('should calculate income statement with revenue and expense accounts', async () => {
    // Create test user
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

    // Create revenue and expense accounts
    const revenueAccount = await db.insert(accountsTable)
      .values({
        code: '4000',
        name: 'Sales Revenue',
        type: 'revenue'
      })
      .returning()
      .execute();

    const expenseAccount = await db.insert(accountsTable)
      .values({
        code: '5000',
        name: 'Office Expenses',
        type: 'expense'
      })
      .returning()
      .execute();

    const assetAccount = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    // Create journal entry with revenue transaction
    const journalEntry1 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-001',
        date: new Date('2024-01-15'),
        description: 'Sales transaction',
        transaction_type: 'sale',
        status: 'posted',
        created_by: userId
      })
      .returning()
      .execute();

    // Journal lines for revenue transaction (Cash debit, Revenue credit)
    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry1[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '1000.00',
          credit_amount: '0.00',
          description: 'Cash received'
        },
        {
          journal_entry_id: journalEntry1[0].id,
          account_id: revenueAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '1000.00',
          description: 'Sales revenue'
        }
      ])
      .execute();

    // Create journal entry with expense transaction
    const journalEntry2 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-002',
        date: new Date('2024-01-20'),
        description: 'Office expense',
        transaction_type: 'expense',
        status: 'posted',
        created_by: userId
      })
      .returning()
      .execute();

    // Journal lines for expense transaction (Expense debit, Cash credit)
    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry2[0].id,
          account_id: expenseAccount[0].id,
          debit_amount: '300.00',
          credit_amount: '0.00',
          description: 'Office supplies'
        },
        {
          journal_entry_id: journalEntry2[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '300.00',
          description: 'Cash payment'
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateIncomeStatement(input);

    // Check revenues
    expect(result.revenues).toHaveLength(1);
    expect(result.revenues[0].account_id).toEqual(revenueAccount[0].id);
    expect(result.revenues[0].account_name).toEqual('Sales Revenue');
    expect(result.revenues[0].amount).toEqual(1000);

    // Check expenses
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].account_id).toEqual(expenseAccount[0].id);
    expect(result.expenses[0].account_name).toEqual('Office Expenses');
    expect(result.expenses[0].amount).toEqual(300);

    // Check totals
    expect(result.total_revenue).toEqual(1000);
    expect(result.total_expenses).toEqual(300);
    expect(result.net_income).toEqual(700);
    expect(result.period_start).toEqual(input.start_date);
    expect(result.period_end).toEqual(input.end_date);
  });

  it('should only include posted journal entries within specified period', async () => {
    // Create test user
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

    // Create revenue account
    const revenueAccount = await db.insert(accountsTable)
      .values({
        code: '4000',
        name: 'Sales Revenue',
        type: 'revenue'
      })
      .returning()
      .execute();

    const assetAccount = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    // Create journal entry BEFORE period (should be excluded)
    const journalEntry1 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-001',
        date: new Date('2023-12-31'),
        description: 'Revenue before period',
        transaction_type: 'sale',
        status: 'posted',
        created_by: userId
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry1[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '500.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: journalEntry1[0].id,
          account_id: revenueAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '500.00'
        }
      ])
      .execute();

    // Create journal entry in DRAFT status (should be excluded)
    const journalEntry2 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-002',
        date: new Date('2024-01-15'),
        description: 'Draft revenue',
        transaction_type: 'sale',
        status: 'draft',
        created_by: userId
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry2[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '750.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: journalEntry2[0].id,
          account_id: revenueAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '750.00'
        }
      ])
      .execute();

    // Create journal entry WITHIN period and POSTED (should be included)
    const journalEntry3 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-003',
        date: new Date('2024-01-20'),
        description: 'Valid revenue',
        transaction_type: 'sale',
        status: 'posted',
        created_by: userId
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry3[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '1200.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: journalEntry3[0].id,
          account_id: revenueAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '1200.00'
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateIncomeStatement(input);

    // Should only include the posted entry within the period
    expect(result.revenues).toHaveLength(1);
    expect(result.revenues[0].amount).toEqual(1200);
    expect(result.total_revenue).toEqual(1200);
    expect(result.net_income).toEqual(1200);
  });

  it('should handle accounts with zero balances correctly', async () => {
    // Create test user
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

    // Create revenue account
    const revenueAccount = await db.insert(accountsTable)
      .values({
        code: '4000',
        name: 'Sales Revenue',
        type: 'revenue'
      })
      .returning()
      .execute();

    const assetAccount = await db.insert(accountsTable)
      .values({
        code: '1000',
        name: 'Cash',
        type: 'asset'
      })
      .returning()
      .execute();

    // Create journal entry that cancels itself out (net zero)
    const journalEntry1 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-001',
        date: new Date('2024-01-15'),
        description: 'Revenue entry',
        transaction_type: 'sale',
        status: 'posted',
        created_by: userId
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry1[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '1000.00',
          credit_amount: '0.00'
        },
        {
          journal_entry_id: journalEntry1[0].id,
          account_id: revenueAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '1000.00'
        }
      ])
      .execute();

    // Create a reversal entry
    const journalEntry2 = await db.insert(journalEntriesTable)
      .values({
        entry_number: 'JE-002',
        date: new Date('2024-01-20'),
        description: 'Revenue reversal',
        transaction_type: 'manual',
        status: 'posted',
        created_by: userId
      })
      .returning()
      .execute();

    await db.insert(journalLinesTable)
      .values([
        {
          journal_entry_id: journalEntry2[0].id,
          account_id: assetAccount[0].id,
          debit_amount: '0.00',
          credit_amount: '1000.00'
        },
        {
          journal_entry_id: journalEntry2[0].id,
          account_id: revenueAccount[0].id,
          debit_amount: '1000.00',
          credit_amount: '0.00'
        }
      ])
      .execute();

    const input: ReportPeriodInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateIncomeStatement(input);

    // Should exclude accounts with zero balance
    expect(result.revenues).toHaveLength(0);
    expect(result.expenses).toHaveLength(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(0);
  });
});
