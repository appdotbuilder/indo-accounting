
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  suppliersTable, 
  productsTable, 
  purchaseTransactionsTable,
  purchaseLineItemsTable,
  journalEntriesTable,
  journalLinesTable,
  accountsTable,
  usersTable
} from '../db/schema';
import { type CreatePurchaseTransactionInput } from '../schema';
import { createPurchaseTransaction } from '../handlers/create_purchase_transaction';
import { eq } from 'drizzle-orm';

describe('createPurchaseTransaction', () => {
  let supplierId: number;
  let productId1: number;
  let productId2: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        role: 'admin'
      })
      .execute();

    // Create test supplier
    const supplier = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        email: 'supplier@test.com',
        phone: '123456789',
        address: 'Supplier Address',
        tax_id: 'TAX001'
      })
      .returning()
      .execute();
    supplierId = supplier[0].id;

    // Create test products
    const product1 = await db.insert(productsTable)
      .values({
        sku: 'PROD001',
        name: 'Product 1',
        description: 'Test product 1',
        unit_price: '25.00',
        cost_price: '15.00',
        stock_quantity: 10,
        minimum_stock: 5,
        unit: 'pcs'
      })
      .returning()
      .execute();
    productId1 = product1[0].id;

    const product2 = await db.insert(productsTable)
      .values({
        sku: 'PROD002',
        name: 'Product 2',
        description: 'Test product 2',
        unit_price: '50.00',
        cost_price: '30.00',
        stock_quantity: 20,
        minimum_stock: 10,
        unit: 'pcs'
      })
      .returning()
      .execute();
    productId2 = product2[0].id;

    // Create required accounts
    await db.insert(accountsTable)
      .values([
        {
          code: '1200',
          name: 'Inventory',
          type: 'asset'
        },
        {
          code: '2100',
          name: 'Accounts Payable',
          type: 'liability'
        },
        {
          code: '1300',
          name: 'Tax Receivable',
          type: 'asset'
        }
      ])
      .execute();
  });

  afterEach(resetDB);

  it('should create a purchase transaction with line items', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: supplierId,
      date: new Date('2024-01-15'),
      due_date: new Date('2024-02-15'),
      invoice_number: 'INV-2024-001',
      items: [
        {
          product_id: productId1,
          quantity: 5,
          unit_cost: 18.00
        },
        {
          product_id: productId2,
          quantity: 3,
          unit_cost: 35.00
        }
      ],
      tax_rate: 0.11
    };

    const result = await createPurchaseTransaction(input);

    // Verify transaction fields
    expect(result.invoice_number).toBe('INV-2024-001');
    expect(result.supplier_id).toBe(supplierId);
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.due_date).toEqual(new Date('2024-02-15'));
    expect(result.status).toBe('draft');
    expect(result.id).toBeDefined();
    expect(result.journal_entry_id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify calculations
    const expectedSubtotal = (5 * 18.00) + (3 * 35.00); // 90 + 105 = 195
    const expectedTax = expectedSubtotal * 0.11; // 21.45
    const expectedTotal = expectedSubtotal + expectedTax; // 216.45

    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.tax_amount).toBe(expectedTax);
    expect(result.total_amount).toBe(expectedTotal);
  });

  it('should create line items for the transaction', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: supplierId,
      date: new Date('2024-01-15'),
      due_date: new Date('2024-02-15'),
      invoice_number: 'INV-2024-002',
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_cost: 20.00
        }
      ],
      tax_rate: 0.11
    };

    const result = await createPurchaseTransaction(input);

    const lineItems = await db.select()
      .from(purchaseLineItemsTable)
      .where(eq(purchaseLineItemsTable.purchase_transaction_id, result.id))
      .execute();

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].product_id).toBe(productId1);
    expect(parseFloat(lineItems[0].quantity)).toBe(2);
    expect(parseFloat(lineItems[0].unit_cost)).toBe(20.00);
    expect(parseFloat(lineItems[0].total_cost)).toBe(40.00);
  });

  it('should update product stock quantities and costs', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: supplierId,
      date: new Date('2024-01-15'),
      due_date: null,
      invoice_number: 'INV-2024-003',
      items: [
        {
          product_id: productId1,
          quantity: 8,
          unit_cost: 22.00
        }
      ],
      tax_rate: 0.11
    };

    await createPurchaseTransaction(input);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId1))
      .execute();

    expect(updatedProduct[0].stock_quantity).toBe(18); // 10 + 8
    expect(parseFloat(updatedProduct[0].cost_price)).toBe(22.00);
    expect(updatedProduct[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create corresponding journal entry and lines', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: supplierId,
      date: new Date('2024-01-15'),
      due_date: null,
      invoice_number: 'INV-2024-004',
      items: [
        {
          product_id: productId1,
          quantity: 4,
          unit_cost: 16.00
        }
      ],
      tax_rate: 0.10
    };

    const result = await createPurchaseTransaction(input);

    // Verify journal entry
    const journalEntry = await db.select()
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.id, result.journal_entry_id!))
      .execute();

    expect(journalEntry).toHaveLength(1);
    expect(journalEntry[0].transaction_type).toBe('purchase');
    expect(journalEntry[0].status).toBe('draft');
    expect(journalEntry[0].reference).toBe('INV-2024-004');

    // Verify journal lines
    const journalLines = await db.select()
      .from(journalLinesTable)
      .where(eq(journalLinesTable.journal_entry_id, result.journal_entry_id!))
      .execute();

    expect(journalLines.length).toBeGreaterThanOrEqual(2); // At least DR Inventory, CR Payable

    // Calculate expected amounts
    const subtotal = 4 * 16.00; // 64
    const taxAmount = subtotal * 0.10; // 6.4
    const totalAmount = subtotal + taxAmount; // 70.4

    // Verify debit/credit balance
    const totalDebits = journalLines.reduce((sum, line) => 
      sum + parseFloat(line.debit_amount), 0
    );
    const totalCredits = journalLines.reduce((sum, line) => 
      sum + parseFloat(line.credit_amount), 0
    );

    expect(totalDebits).toBe(totalCredits);
    expect(totalCredits).toBe(totalAmount);
  });

  it('should throw error for non-existent supplier', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: 99999, // Non-existent
      date: new Date('2024-01-15'),
      due_date: null,
      invoice_number: 'INV-2024-005',
      items: [
        {
          product_id: productId1,
          quantity: 1,
          unit_cost: 15.00
        }
      ],
      tax_rate: 0.11
    };

    await expect(createPurchaseTransaction(input))
      .rejects.toThrow(/Supplier with id 99999 not found/i);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: supplierId,
      date: new Date('2024-01-15'),
      due_date: null,
      invoice_number: 'INV-2024-006',
      items: [
        {
          product_id: 99999, // Non-existent
          quantity: 1,
          unit_cost: 15.00
        }
      ],
      tax_rate: 0.11
    };

    await expect(createPurchaseTransaction(input))
      .rejects.toThrow(/One or more products not found/i);
  });

  it('should handle zero tax rate correctly', async () => {
    const input: CreatePurchaseTransactionInput = {
      supplier_id: supplierId,
      date: new Date('2024-01-15'),
      due_date: null,
      invoice_number: 'INV-2024-007',
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_cost: 25.00
        }
      ],
      tax_rate: 0
    };

    const result = await createPurchaseTransaction(input);

    expect(result.subtotal).toBe(50.00);
    expect(result.tax_amount).toBe(0);
    expect(result.total_amount).toBe(50.00);
  });
});
