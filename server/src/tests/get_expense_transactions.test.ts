
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expenseTransactionsTable, accountsTable, suppliersTable, usersTable } from '../db/schema';
import { getExpenseTransactions } from '../handlers/get_expense_transactions';
import { type CreateExpenseTransactionInput } from '../schema';

describe('getExpenseTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no expense transactions exist', async () => {
    const result = await getExpenseTransactions();
    expect(result).toEqual([]);
  });

  it('should return all expense transactions', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashedpassword',
      role: 'admin'
    }).returning();

    const [account] = await db.insert(accountsTable).values({
      code: '5000',
      name: 'Office Expenses',
      type: 'expense'
    }).returning();

    const [supplier] = await db.insert(suppliersTable).values({
      name: 'Test Supplier',
      email: 'supplier@test.com'
    }).returning();

    // Create test expense transactions
    const expense1Input: CreateExpenseTransactionInput = {
      description: 'Office supplies',
      amount: 150.50,
      date: new Date('2024-01-15'),
      account_id: account.id,
      supplier_id: supplier.id,
      reference: 'REF001'
    };

    const expense2Input: CreateExpenseTransactionInput = {
      description: 'Equipment maintenance',
      amount: 300.75,
      date: new Date('2024-01-20'),
      account_id: account.id,
      supplier_id: null,
      reference: null
    };

    const [expense1, expense2] = await db.insert(expenseTransactionsTable).values([
      {
        description: expense1Input.description,
        amount: expense1Input.amount.toString(),
        date: expense1Input.date,
        account_id: expense1Input.account_id,
        supplier_id: expense1Input.supplier_id,
        reference: expense1Input.reference
      },
      {
        description: expense2Input.description,
        amount: expense2Input.amount.toString(),
        date: expense2Input.date,
        account_id: expense2Input.account_id,
        supplier_id: expense2Input.supplier_id,
        reference: expense2Input.reference
      }
    ]).returning();

    const results = await getExpenseTransactions();

    expect(results).toHaveLength(2);

    // Check first expense
    const result1 = results.find(e => e.id === expense1.id);
    expect(result1).toBeDefined();
    expect(result1!.description).toEqual('Office supplies');
    expect(result1!.amount).toEqual(150.50);
    expect(typeof result1!.amount).toBe('number');
    expect(result1!.date).toBeInstanceOf(Date);
    expect(result1!.account_id).toEqual(account.id);
    expect(result1!.supplier_id).toEqual(supplier.id);
    expect(result1!.reference).toEqual('REF001');
    expect(result1!.status).toEqual('draft');
    expect(result1!.created_at).toBeInstanceOf(Date);
    expect(result1!.updated_at).toBeInstanceOf(Date);

    // Check second expense
    const result2 = results.find(e => e.id === expense2.id);
    expect(result2).toBeDefined();
    expect(result2!.description).toEqual('Equipment maintenance');
    expect(result2!.amount).toEqual(300.75);
    expect(typeof result2!.amount).toBe('number');
    expect(result2!.date).toBeInstanceOf(Date);
    expect(result2!.account_id).toEqual(account.id);
    expect(result2!.supplier_id).toBeNull();
    expect(result2!.reference).toBeNull();
    expect(result2!.status).toEqual('draft');
  });

  it('should handle numeric conversion correctly', async () => {
    // Create prerequisite data
    const [account] = await db.insert(accountsTable).values({
      code: '5100',
      name: 'Travel Expenses',
      type: 'expense'
    }).returning();

    // Create expense with decimal amounts
    await db.insert(expenseTransactionsTable).values({
      description: 'Business travel',
      amount: '1234.56',
      date: new Date('2024-01-25'),
      account_id: account.id,
      supplier_id: null,
      reference: null
    });

    const results = await getExpenseTransactions();

    expect(results).toHaveLength(1);
    expect(results[0].amount).toEqual(1234.56);
    expect(typeof results[0].amount).toBe('number');
  });

  it('should return expenses in database order', async () => {
    // Create prerequisite data
    const [account] = await db.insert(accountsTable).values({
      code: '5200',
      name: 'Utilities',
      type: 'expense'
    }).returning();

    // Create multiple expenses
    await db.insert(expenseTransactionsTable).values([
      {
        description: 'First expense',
        amount: '100.00',
        date: new Date('2024-01-01'),
        account_id: account.id,
        supplier_id: null,
        reference: null
      },
      {
        description: 'Second expense',
        amount: '200.00',
        date: new Date('2024-01-02'),
        account_id: account.id,
        supplier_id: null,
        reference: null
      },
      {
        description: 'Third expense',
        amount: '300.00',
        date: new Date('2024-01-03'),
        account_id: account.id,
        supplier_id: null,
        reference: null
      }
    ]);

    const results = await getExpenseTransactions();

    expect(results).toHaveLength(3);
    expect(results[0].description).toEqual('First expense');
    expect(results[1].description).toEqual('Second expense');
    expect(results[2].description).toEqual('Third expense');
  });
});
