
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expenseTransactionsTable, accountsTable, suppliersTable, journalEntriesTable, journalLinesTable, usersTable } from '../db/schema';
import { type CreateExpenseTransactionInput } from '../schema';
import { createExpenseTransaction } from '../handlers/create_expense_transaction';
import { eq, and } from 'drizzle-orm';

describe('createExpenseTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an expense transaction with journal entry', async () => {
    // Create prerequisite data
    // Create a user first
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .execute();

    // Create a cash account (asset)
    const cashAccountResult = await db.insert(accountsTable)
      .values({
        code: '1001',
        name: 'Cash',
        type: 'asset',
        parent_id: null
      })
      .returning()
      .execute();

    // Create an expense account
    const expenseAccountResult = await db.insert(accountsTable)
      .values({
        code: '5001',
        name: 'Office Supplies',
        type: 'expense',
        parent_id: null
      })
      .returning()
      .execute();

    const expenseAccount = expenseAccountResult[0];

    const testInput: CreateExpenseTransactionInput = {
      description: 'Office supplies purchase',
      amount: 150.00,
      date: new Date('2024-01-15'),
      account_id: expenseAccount.id,
      supplier_id: null,
      reference: 'INV-001'
    };

    const result = await createExpenseTransaction(testInput);

    // Verify expense transaction fields
    expect(result.description).toEqual('Office supplies purchase');
    expect(result.amount).toEqual(150.00);
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.account_id).toEqual(expenseAccount.id);
    expect(result.supplier_id).toBeNull();
    expect(result.reference).toEqual('INV-001');
    expect(result.status).toEqual('posted');
    expect(result.journal_entry_id).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create expense transaction with supplier', async () => {
    // Create prerequisite data
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .execute();

    const cashAccountResult = await db.insert(accountsTable)
      .values({
        code: '1001',
        name: 'Cash',
        type: 'asset',
        parent_id: null
      })
      .returning()
      .execute();

    const expenseAccountResult = await db.insert(accountsTable)
      .values({
        code: '5002',
        name: 'Utilities',
        type: 'expense',
        parent_id: null
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Electric Company',
        email: 'billing@electric.com',
        phone: '123-456-7890',
        address: '123 Main St',
        tax_id: 'TAX123'
      })
      .returning()
      .execute();

    const testInput: CreateExpenseTransactionInput = {
      description: 'Monthly electricity bill',
      amount: 250.75,
      date: new Date('2024-01-20'),
      account_id: expenseAccountResult[0].id,
      supplier_id: supplierResult[0].id,
      reference: 'ELEC-001'
    };

    const result = await createExpenseTransaction(testInput);

    expect(result.supplier_id).toEqual(supplierResult[0].id);
    expect(result.amount).toEqual(250.75);
    expect(typeof result.amount).toEqual('number');
  });

  it('should create proper journal entries for expense transaction', async () => {
    // Create prerequisite data
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .execute();

    const cashAccountResult = await db.insert(accountsTable)
      .values({
        code: '1001',
        name: 'Cash',
        type: 'asset',
        parent_id: null
      })
      .returning()
      .execute();

    const expenseAccountResult = await db.insert(accountsTable)
      .values({
        code: '5003',
        name: 'Travel Expenses',
        type: 'expense',
        parent_id: null
      })
      .returning()
      .execute();

    const testInput: CreateExpenseTransactionInput = {
      description: 'Business travel',
      amount: 500.00,
      date: new Date('2024-01-25'),
      account_id: expenseAccountResult[0].id,
      supplier_id: null,
      reference: 'TRAVEL-001'
    };

    const result = await createExpenseTransaction(testInput);

    // Verify journal entry was created
    const journalEntries = await db.select()
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.id, result.journal_entry_id!))
      .execute();

    expect(journalEntries).toHaveLength(1);
    const journalEntry = journalEntries[0];
    expect(journalEntry.entry_number).toEqual(`EXP-${result.id}`);
    expect(journalEntry.transaction_type).toEqual('expense');
    expect(journalEntry.status).toEqual('posted');
    expect(journalEntry.description).toEqual('Expense: Business travel');

    // Verify journal lines
    const journalLines = await db.select()
      .from(journalLinesTable)
      .where(eq(journalLinesTable.journal_entry_id, journalEntry.id))
      .execute();

    expect(journalLines).toHaveLength(2);

    // Find debit and credit lines
    const debitLine = journalLines.find(line => parseFloat(line.debit_amount) > 0);
    const creditLine = journalLines.find(line => parseFloat(line.credit_amount) > 0);

    expect(debitLine).toBeDefined();
    expect(creditLine).toBeDefined();

    // Verify debit line (expense account)
    expect(debitLine!.account_id).toEqual(expenseAccountResult[0].id);
    expect(parseFloat(debitLine!.debit_amount)).toEqual(500.00);
    expect(parseFloat(debitLine!.credit_amount)).toEqual(0);

    // Verify credit line (cash account)
    expect(creditLine!.account_id).toEqual(cashAccountResult[0].id);
    expect(parseFloat(creditLine!.debit_amount)).toEqual(0);
    expect(parseFloat(creditLine!.credit_amount)).toEqual(500.00);
  });

  it('should reject expense with non-existent account', async () => {
    const testInput: CreateExpenseTransactionInput = {
      description: 'Invalid expense',
      amount: 100.00,
      date: new Date('2024-01-15'),
      account_id: 999, // Non-existent account
      supplier_id: null,
      reference: 'INV-999'
    };

    expect(createExpenseTransaction(testInput)).rejects.toThrow(/account not found/i);
  });

  it('should reject expense with non-expense account type', async () => {
    // Create an asset account instead of expense
    const assetAccountResult = await db.insert(accountsTable)
      .values({
        code: '1002',
        name: 'Bank Account',
        type: 'asset',
        parent_id: null
      })
      .returning()
      .execute();

    const testInput: CreateExpenseTransactionInput = {
      description: 'Invalid expense',
      amount: 100.00,
      date: new Date('2024-01-15'),
      account_id: assetAccountResult[0].id,
      supplier_id: null,
      reference: 'INV-999'
    };

    expect(createExpenseTransaction(testInput)).rejects.toThrow(/account must be of type expense/i);
  });

  it('should reject expense with non-existent supplier', async () => {
    // Create expense account
    const expenseAccountResult = await db.insert(accountsTable)
      .values({
        code: '5004',
        name: 'Marketing',
        type: 'expense',
        parent_id: null
      })
      .returning()
      .execute();

    const testInput: CreateExpenseTransactionInput = {
      description: 'Marketing expense',
      amount: 200.00,
      date: new Date('2024-01-15'),
      account_id: expenseAccountResult[0].id,
      supplier_id: 999, // Non-existent supplier
      reference: 'MKT-001'
    };

    expect(createExpenseTransaction(testInput)).rejects.toThrow(/supplier not found/i);
  });
});
