
import { db } from '../db';
import { 
  salesTransactionsTable, 
  salesLineItemsTable, 
  productsTable,
  customersTable,
  journalEntriesTable,
  journalLinesTable,
  accountsTable
} from '../db/schema';
import { type CreateSalesTransactionInput, type SalesTransaction } from '../schema';
import { eq, sql, inArray } from 'drizzle-orm';

export async function createSalesTransaction(input: CreateSalesTransactionInput): Promise<SalesTransaction> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Verify customer exists
      const customer = await tx.select().from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();
      
      if (customer.length === 0) {
        throw new Error(`Customer with ID ${input.customer_id} not found`);
      }

      // 2. Verify all products exist and have sufficient stock
      const productIds = input.items.map(item => item.product_id);
      const products = await tx.select().from(productsTable)
        .where(inArray(productsTable.id, productIds))
        .execute();
      
      if (products.length !== input.items.length) {
        throw new Error('One or more products not found');
      }

      // Check stock availability
      for (const item of input.items) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
        }
      }

      // 3. Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * input.tax_rate;
      const totalAmount = subtotal + taxAmount;

      // 4. Generate unique invoice number
      const invoiceCount = await tx.select({ count: sql<number>`count(*)` })
        .from(salesTransactionsTable)
        .execute();
      const invoiceNumber = `INV-${String(Number(invoiceCount[0].count) + 1).padStart(7, '0')}`;

      // 5. Create sales transaction
      const salesTransactionResult = await tx.insert(salesTransactionsTable)
        .values({
          invoice_number: invoiceNumber,
          customer_id: input.customer_id,
          date: input.date,
          due_date: input.due_date,
          subtotal: subtotal.toString(),
          tax_amount: taxAmount.toString(),
          total_amount: totalAmount.toString(),
          status: 'draft'
        })
        .returning()
        .execute();

      const salesTransaction = salesTransactionResult[0];

      // 6. Create line items and update stock
      for (const item of input.items) {
        const totalPrice = item.quantity * item.unit_price;
        
        // Create line item
        await tx.insert(salesLineItemsTable)
          .values({
            sales_transaction_id: salesTransaction.id,
            product_id: item.product_id,
            quantity: item.quantity.toString(),
            unit_price: item.unit_price.toString(),
            total_price: totalPrice.toString()
          })
          .execute();

        // Update product stock
        await tx.update(productsTable)
          .set({
            stock_quantity: sql`${productsTable.stock_quantity} - ${item.quantity}`,
            updated_at: sql`now()`
          })
          .where(eq(productsTable.id, item.product_id))
          .execute();
      }

      // 7. Find required accounts for journal entry
      const accounts = await tx.select().from(accountsTable)
        .where(inArray(accountsTable.code, ['1200', '4000', '2300']))
        .execute();

      const accountsReceivable = accounts.find(a => a.code === '1200');
      const salesRevenue = accounts.find(a => a.code === '4000');
      const taxPayable = accounts.find(a => a.code === '2300');

      if (!accountsReceivable || !salesRevenue || !taxPayable) {
        throw new Error('Required accounts not found. Please ensure accounts with codes 1200 (Accounts Receivable), 4000 (Sales Revenue), and 2300 (Tax Payable) exist');
      }

      // 8. Create journal entry
      const journalEntryCount = await tx.select({ count: sql<number>`count(*)` })
        .from(journalEntriesTable)
        .execute();
      const entryNumber = `JE-${String(Number(journalEntryCount[0].count) + 1).padStart(7, '0')}`;

      const journalEntryResult = await tx.insert(journalEntriesTable)
        .values({
          entry_number: entryNumber,
          date: input.date,
          description: `Sales Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          transaction_type: 'sale',
          status: 'posted',
          created_by: 1 // Default user ID - should be from auth context in real app
        })
        .returning()
        .execute();

      const journalEntry = journalEntryResult[0];

      // 9. Create journal lines
      await tx.insert(journalLinesTable)
        .values([
          {
            journal_entry_id: journalEntry.id,
            account_id: accountsReceivable.id,
            debit_amount: totalAmount.toString(),
            credit_amount: '0',
            description: `Sales to customer`
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: salesRevenue.id,
            debit_amount: '0',
            credit_amount: subtotal.toString(),
            description: `Sales revenue`
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: taxPayable.id,
            debit_amount: '0',
            credit_amount: taxAmount.toString(),
            description: `Tax payable`
          }
        ])
        .execute();

      // 10. Update sales transaction with journal entry ID
      await tx.update(salesTransactionsTable)
        .set({
          journal_entry_id: journalEntry.id,
          updated_at: sql`now()`
        })
        .where(eq(salesTransactionsTable.id, salesTransaction.id))
        .execute();

      // Return with converted numeric fields
      return {
        ...salesTransaction,
        subtotal: parseFloat(salesTransaction.subtotal),
        tax_amount: parseFloat(salesTransaction.tax_amount),
        total_amount: parseFloat(salesTransaction.total_amount),
        journal_entry_id: journalEntry.id
      };
    });
  } catch (error) {
    console.error('Sales transaction creation failed:', error);
    throw error;
  }
}
