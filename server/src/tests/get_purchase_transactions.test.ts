
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable, purchaseTransactionsTable } from '../db/schema';
import { type CreateSupplierInput, type CreatePurchaseTransactionInput } from '../schema';
import { getPurchaseTransactions } from '../handlers/get_purchase_transactions';

// Test data setup
const testSupplier: CreateSupplierInput = {
  name: 'Test Supplier',
  email: 'supplier@test.com',
  phone: '+1234567890',
  address: '123 Supplier St',
  tax_id: 'TAX123456'
};

const testPurchaseTransaction: CreatePurchaseTransactionInput = {
  supplier_id: 1, // Will be set after creating supplier
  date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  invoice_number: 'PO-2024-001',
  items: [
    {
      product_id: 1,
      quantity: 10,
      unit_cost: 25.50
    }
  ],
  tax_rate: 0.11
};

describe('getPurchaseTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no purchase transactions exist', async () => {
    const result = await getPurchaseTransactions();
    expect(result).toEqual([]);
  });

  it('should return all purchase transactions', async () => {
    // Create a supplier first
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: testSupplier.name,
        email: testSupplier.email,
        phone: testSupplier.phone,
        address: testSupplier.address,
        tax_id: testSupplier.tax_id
      })
      .returning()
      .execute();

    const supplierId = supplierResult[0].id;

    // Create purchase transaction
    await db.insert(purchaseTransactionsTable)
      .values({
        invoice_number: testPurchaseTransaction.invoice_number,
        supplier_id: supplierId,
        date: testPurchaseTransaction.date,
        due_date: testPurchaseTransaction.due_date,
        subtotal: '255.00', // 10 * 25.50
        tax_amount: '28.05', // 255.00 * 0.11
        total_amount: '283.05', // 255.00 + 28.05
        status: 'draft'
      })
      .execute();

    const result = await getPurchaseTransactions();

    expect(result).toHaveLength(1);
    
    const transaction = result[0];
    expect(transaction.invoice_number).toBe('PO-2024-001');
    expect(transaction.supplier_id).toBe(supplierId);
    expect(transaction.date).toEqual(new Date('2024-01-15'));
    expect(transaction.due_date).toEqual(new Date('2024-02-15'));
    expect(transaction.subtotal).toBe(255.00);
    expect(transaction.tax_amount).toBe(28.05);
    expect(transaction.total_amount).toBe(283.05);
    expect(transaction.status).toBe('draft');
    expect(transaction.id).toBeDefined();
    expect(transaction.created_at).toBeInstanceOf(Date);
    expect(transaction.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple purchase transactions in correct order', async () => {
    // Create a supplier first
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: testSupplier.name,
        email: testSupplier.email,
        phone: testSupplier.phone,
        address: testSupplier.address,
        tax_id: testSupplier.tax_id
      })
      .returning()
      .execute();

    const supplierId = supplierResult[0].id;

    // Create multiple purchase transactions
    await db.insert(purchaseTransactionsTable)
      .values([
        {
          invoice_number: 'PO-2024-001',
          supplier_id: supplierId,
          date: new Date('2024-01-15'),
          due_date: new Date('2024-02-15'),
          subtotal: '100.00',
          tax_amount: '11.00',
          total_amount: '111.00',
          status: 'draft'
        },
        {
          invoice_number: 'PO-2024-002',
          supplier_id: supplierId,
          date: new Date('2024-01-20'),
          due_date: new Date('2024-02-20'),
          subtotal: '200.00',
          tax_amount: '22.00',
          total_amount: '222.00',
          status: 'posted'
        }
      ])
      .execute();

    const result = await getPurchaseTransactions();

    expect(result).toHaveLength(2);
    
    // Verify numeric conversions
    result.forEach(transaction => {
      expect(typeof transaction.subtotal).toBe('number');
      expect(typeof transaction.tax_amount).toBe('number');
      expect(typeof transaction.total_amount).toBe('number');
    });

    // Find transactions by invoice number
    const transaction1 = result.find(t => t.invoice_number === 'PO-2024-001');
    const transaction2 = result.find(t => t.invoice_number === 'PO-2024-002');

    expect(transaction1).toBeDefined();
    expect(transaction1!.subtotal).toBe(100.00);
    expect(transaction1!.status).toBe('draft');

    expect(transaction2).toBeDefined();
    expect(transaction2!.subtotal).toBe(200.00);
    expect(transaction2!.status).toBe('posted');
  });

  it('should handle null due_date correctly', async () => {
    // Create a supplier first
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: testSupplier.name,
        email: testSupplier.email,
        phone: testSupplier.phone,
        address: testSupplier.address,
        tax_id: testSupplier.tax_id
      })
      .returning()
      .execute();

    const supplierId = supplierResult[0].id;

    // Create purchase transaction without due_date
    await db.insert(purchaseTransactionsTable)
      .values({
        invoice_number: 'PO-2024-003',
        supplier_id: supplierId,
        date: new Date('2024-01-15'),
        due_date: null,
        subtotal: '150.00',
        tax_amount: '16.50',
        total_amount: '166.50',
        status: 'draft'
      })
      .execute();

    const result = await getPurchaseTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBeNull();
    expect(result[0].subtotal).toBe(150.00);
  });
});
