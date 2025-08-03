
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, salesTransactionsTable } from '../db/schema';
import { getSalesTransactions } from '../handlers/get_sales_transactions';

describe('getSalesTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales transactions exist', async () => {
    const result = await getSalesTransactions();
    expect(result).toEqual([]);
  });

  it('should return all sales transactions', async () => {
    // Create a customer first
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@test.com'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create sales transactions
    await db.insert(salesTransactionsTable)
      .values([
        {
          invoice_number: 'INV-001',
          customer_id: customerId,
          date: new Date('2024-01-15'),
          due_date: new Date('2024-02-15'),
          subtotal: '100.00',
          tax_amount: '11.00',
          total_amount: '111.00',
          status: 'posted'
        },
        {
          invoice_number: 'INV-002',
          customer_id: customerId,
          date: new Date('2024-01-20'),
          subtotal: '250.50',
          tax_amount: '27.56',
          total_amount: '278.06',
          status: 'draft'
        }
      ])
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(2);
    
    // Verify first transaction
    const firstTransaction = result.find(t => t.invoice_number === 'INV-001');
    expect(firstTransaction).toBeDefined();
    expect(firstTransaction!.customer_id).toEqual(customerId);
    expect(firstTransaction!.subtotal).toEqual(100.00);
    expect(firstTransaction!.tax_amount).toEqual(11.00);
    expect(firstTransaction!.total_amount).toEqual(111.00);
    expect(firstTransaction!.status).toEqual('posted');
    expect(firstTransaction!.date).toBeInstanceOf(Date);
    expect(firstTransaction!.due_date).toBeInstanceOf(Date);
    expect(typeof firstTransaction!.subtotal).toBe('number');
    expect(typeof firstTransaction!.tax_amount).toBe('number');
    expect(typeof firstTransaction!.total_amount).toBe('number');

    // Verify second transaction
    const secondTransaction = result.find(t => t.invoice_number === 'INV-002');
    expect(secondTransaction).toBeDefined();
    expect(secondTransaction!.customer_id).toEqual(customerId);
    expect(secondTransaction!.subtotal).toEqual(250.50);
    expect(secondTransaction!.tax_amount).toEqual(27.56);
    expect(secondTransaction!.total_amount).toEqual(278.06);
    expect(secondTransaction!.status).toEqual('draft');
    expect(secondTransaction!.due_date).toBeNull();
  });

  it('should handle transactions with null due dates', async () => {
    // Create a customer first
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create transaction without due date
    await db.insert(salesTransactionsTable)
      .values({
        invoice_number: 'INV-003',
        customer_id: customerId,
        date: new Date('2024-01-25'),
        due_date: null,
        subtotal: '75.25',
        tax_amount: '8.28',
        total_amount: '83.53',
        status: 'draft'
      })
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBeNull();
    expect(result[0].subtotal).toEqual(75.25);
    expect(result[0].tax_amount).toEqual(8.28);
    expect(result[0].total_amount).toEqual(83.53);
  });

  it('should return transactions with all required fields', async () => {
    // Create a customer first
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create transaction
    await db.insert(salesTransactionsTable)
      .values({
        invoice_number: 'INV-004',
        customer_id: customerId,
        date: new Date('2024-01-30'),
        subtotal: '500.00',
        tax_amount: '55.00',
        total_amount: '555.00'
      })
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(1);
    const transaction = result[0];
    
    // Verify all required fields are present
    expect(transaction.id).toBeDefined();
    expect(transaction.invoice_number).toBeDefined();
    expect(transaction.customer_id).toBeDefined();
    expect(transaction.date).toBeInstanceOf(Date);
    expect(transaction.subtotal).toBeDefined();
    expect(transaction.tax_amount).toBeDefined();
    expect(transaction.total_amount).toBeDefined();
    expect(transaction.status).toBeDefined();
    expect(transaction.created_at).toBeInstanceOf(Date);
    expect(transaction.updated_at).toBeInstanceOf(Date);
  });
});
