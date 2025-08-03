
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable, 
  productsTable, 
  salesTransactionsTable, 
  salesLineItemsTable,
  journalEntriesTable,
  journalLinesTable,
  accountsTable,
  usersTable
} from '../db/schema';
import { type CreateSalesTransactionInput } from '../schema';
import { createSalesTransaction } from '../handlers/create_sales_transaction';
import { eq, inArray } from 'drizzle-orm';

// Test data
const testCustomer = {
  name: 'Test Customer',
  email: 'customer@test.com',
  phone: '123-456-7890',
  address: '123 Main St',
  tax_id: 'TAX123'
};

const testProduct1 = {
  sku: 'PROD001',
  name: 'Test Product 1',
  description: 'First test product',
  unit_price: '25.00',
  cost_price: '15.00',
  stock_quantity: 100,
  minimum_stock: 10,
  unit: 'pcs'
};

const testProduct2 = {
  sku: 'PROD002',
  name: 'Test Product 2',
  description: 'Second test product',
  unit_price: '50.00',
  cost_price: '30.00',
  stock_quantity: 50,
  minimum_stock: 5,
  unit: 'pcs'
};

const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  password_hash: 'hashedpassword',
  role: 'admin' as const,
  is_active: true
};

// Required accounts for journal entries
const testAccounts = [
  {
    code: '1200',
    name: 'Accounts Receivable',
    type: 'asset' as const,
    parent_id: null,
    is_active: true
  },
  {
    code: '4000',
    name: 'Sales Revenue',
    type: 'revenue' as const,
    parent_id: null,
    is_active: true
  },
  {
    code: '2300',
    name: 'Tax Payable',
    type: 'liability' as const,
    parent_id: null,
    is_active: true
  }
];

describe('createSalesTransaction', () => {
  let customerId: number;
  let product1Id: number;
  let product2Id: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create test accounts
    await db.insert(accountsTable).values(testAccounts).execute();

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    product1Id = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values(testProduct2)
      .returning()
      .execute();
    product2Id = product2Result[0].id;
  });

  afterEach(resetDB);

  it('should create a sales transaction with line items', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date('2024-01-15'),
      due_date: new Date('2024-02-15'),
      items: [
        {
          product_id: product1Id,
          quantity: 5,
          unit_price: 25.00
        },
        {
          product_id: product2Id,
          quantity: 2,
          unit_price: 50.00
        }
      ],
      tax_rate: 0.11
    };

    const result = await createSalesTransaction(input);

    // Verify sales transaction
    expect(result.customer_id).toEqual(customerId);
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.due_date).toEqual(new Date('2024-02-15'));
    expect(result.subtotal).toEqual(225.00); // (5 * 25) + (2 * 50)
    expect(result.tax_amount).toEqual(24.75); // 225 * 0.11
    expect(result.total_amount).toEqual(249.75); // 225 + 24.75
    expect(result.status).toEqual('draft');
    expect(result.invoice_number).toMatch(/^INV-\d{7}$/);
    expect(result.journal_entry_id).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('should create line items correctly', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: product1Id,
          quantity: 3,
          unit_price: 25.00
        }
      ],
      tax_rate: 0.10
    };

    const result = await createSalesTransaction(input);

    const lineItems = await db.select()
      .from(salesLineItemsTable)
      .where(eq(salesLineItemsTable.sales_transaction_id, result.id))
      .execute();

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].product_id).toEqual(product1Id);
    expect(parseFloat(lineItems[0].quantity)).toEqual(3);
    expect(parseFloat(lineItems[0].unit_price)).toEqual(25.00);
    expect(parseFloat(lineItems[0].total_price)).toEqual(75.00);
  });

  it('should update product stock quantities', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: product1Id,
          quantity: 10,
          unit_price: 25.00
        },
        {
          product_id: product2Id,
          quantity: 5,
          unit_price: 50.00
        }
      ],
      tax_rate: 0.11
    };

    await createSalesTransaction(input);

    const products = await db.select()
      .from(productsTable)
      .where(inArray(productsTable.id, [product1Id, product2Id]))
      .execute();

    const product1 = products.find(p => p.id === product1Id);
    const product2 = products.find(p => p.id === product2Id);

    expect(product1?.stock_quantity).toEqual(90); // 100 - 10
    expect(product2?.stock_quantity).toEqual(45); // 50 - 5
  });

  it('should create journal entry with correct lines', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: product1Id,
          quantity: 4,
          unit_price: 25.00
        }
      ],
      tax_rate: 0.11
    };

    const result = await createSalesTransaction(input);

    // Verify journal entry exists
    const journalEntry = await db.select()
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.id, result.journal_entry_id!))
      .execute();

    expect(journalEntry).toHaveLength(1);
    expect(journalEntry[0].transaction_type).toEqual('sale');
    expect(journalEntry[0].status).toEqual('posted');
    expect(journalEntry[0].reference).toEqual(result.invoice_number);

    // Verify journal lines
    const journalLines = await db.select()
      .from(journalLinesTable)
      .where(eq(journalLinesTable.journal_entry_id, result.journal_entry_id!))
      .execute();

    expect(journalLines).toHaveLength(3);

    // Find lines by amounts
    const debitLine = journalLines.find(line => parseFloat(line.debit_amount) > 0);
    const salesCreditLine = journalLines.find(line => 
      parseFloat(line.credit_amount) === 100.00 && parseFloat(line.debit_amount) === 0
    );
    const taxCreditLine = journalLines.find(line => 
      parseFloat(line.credit_amount) === 11.00 && parseFloat(line.debit_amount) === 0
    );

    expect(debitLine).toBeDefined();
    expect(parseFloat(debitLine!.debit_amount)).toEqual(111.00); // Total amount
    expect(parseFloat(debitLine!.credit_amount)).toEqual(0);

    expect(salesCreditLine).toBeDefined();
    expect(parseFloat(salesCreditLine!.credit_amount)).toEqual(100.00); // Subtotal

    expect(taxCreditLine).toBeDefined();
    expect(parseFloat(taxCreditLine!.credit_amount)).toEqual(11.00); // Tax amount
  });

  it('should throw error for non-existent customer', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: 99999,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: product1Id,
          quantity: 1,
          unit_price: 25.00
        }
      ],
      tax_rate: 0.11
    };

    expect(createSalesTransaction(input)).rejects.toThrow(/Customer with ID 99999 not found/i);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: 99999,
          quantity: 1,
          unit_price: 25.00
        }
      ],
      tax_rate: 0.11
    };

    expect(createSalesTransaction(input)).rejects.toThrow(/One or more products not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: product1Id,
          quantity: 150, // More than available stock (100)
          unit_price: 25.00
        }
      ],
      tax_rate: 0.11
    };

    expect(createSalesTransaction(input)).rejects.toThrow(/Insufficient stock/i);
  });

  it('should generate unique invoice numbers', async () => {
    const input: CreateSalesTransactionInput = {
      customer_id: customerId,
      date: new Date(),
      due_date: null,
      items: [
        {
          product_id: product1Id,
          quantity: 1,
          unit_price: 25.00
        }
      ],
      tax_rate: 0.11
    };

    const result1 = await createSalesTransaction(input);
    const result2 = await createSalesTransaction(input);

    expect(result1.invoice_number).not.toEqual(result2.invoice_number);
    expect(result1.invoice_number).toMatch(/^INV-\d{7}$/);
    expect(result2.invoice_number).toMatch(/^INV-\d{7}$/);
  });
});
