
import { db } from '../db';
import { 
  purchaseTransactionsTable, 
  purchaseLineItemsTable, 
  productsTable,
  journalEntriesTable,
  journalLinesTable,
  suppliersTable,
  accountsTable
} from '../db/schema';
import { type CreatePurchaseTransactionInput, type PurchaseTransaction } from '../schema';
import { eq, sql, inArray } from 'drizzle-orm';

export async function createPurchaseTransaction(input: CreatePurchaseTransactionInput): Promise<PurchaseTransaction> {
  try {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Validate supplier exists
      const supplier = await tx.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, input.supplier_id))
        .execute();
      
      if (supplier.length === 0) {
        throw new Error(`Supplier with id ${input.supplier_id} not found`);
      }

      // Validate all products exist
      const productIds = input.items.map(item => item.product_id);
      const products = await tx.select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds))
        .execute();
      
      if (products.length !== productIds.length) {
        throw new Error('One or more products not found');
      }

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_cost), 0
      );
      const taxAmount = subtotal * (input.tax_rate ?? 0.11); // Use nullish coalescing to preserve 0
      const totalAmount = subtotal + taxAmount;

      // Generate entry number
      const entryNumber = `PURCH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create journal entry first
      const journalEntry = await tx.insert(journalEntriesTable)
        .values({
          entry_number: entryNumber,
          date: input.date,
          description: `Purchase from ${supplier[0].name} - Invoice ${input.invoice_number}`,
          reference: input.invoice_number,
          transaction_type: 'purchase' as const,
          status: 'draft' as const,
          created_by: 1 // Default user for now
        })
        .returning()
        .execute();

      const journalEntryId = journalEntry[0].id;

      // Get default accounts (would normally be configurable)
      const accounts = await tx.select()
        .from(accountsTable)
        .where(inArray(accountsTable.code, ['1200', '2100', '1300'])) // Inventory, Accounts Payable, Tax Receivable
        .execute();

      const inventoryAccount = accounts.find(a => a.code === '1200');
      const payableAccount = accounts.find(a => a.code === '2100');
      const taxAccount = accounts.find(a => a.code === '1300');

      if (!inventoryAccount || !payableAccount) {
        throw new Error('Required accounts not found (1200-Inventory, 2100-Accounts Payable)');
      }

      // Create journal lines
      const journalLines = [];

      // DR: Inventory (subtotal)
      journalLines.push({
        journal_entry_id: journalEntryId,
        account_id: inventoryAccount.id,
        debit_amount: subtotal.toString(),
        credit_amount: '0',
        description: 'Inventory purchase'
      });

      // DR: Tax Receivable (if tax account exists and tax > 0)
      if (taxAccount && taxAmount > 0) {
        journalLines.push({
          journal_entry_id: journalEntryId,
          account_id: taxAccount.id,
          debit_amount: taxAmount.toString(),
          credit_amount: '0',
          description: 'Input tax receivable'
        });
      }

      // CR: Accounts Payable (total)
      journalLines.push({
        journal_entry_id: journalEntryId,
        account_id: payableAccount.id,
        debit_amount: '0',
        credit_amount: totalAmount.toString(),
        description: `Payable to ${supplier[0].name}`
      });

      await tx.insert(journalLinesTable)
        .values(journalLines)
        .execute();

      // Create purchase transaction
      const purchaseTransaction = await tx.insert(purchaseTransactionsTable)
        .values({
          invoice_number: input.invoice_number,
          supplier_id: input.supplier_id,
          date: input.date,
          due_date: input.due_date,
          subtotal: subtotal.toString(),
          tax_amount: taxAmount.toString(),
          total_amount: totalAmount.toString(),
          journal_entry_id: journalEntryId,
          status: 'draft' as const
        })
        .returning()
        .execute();

      const transactionId = purchaseTransaction[0].id;

      // Create line items and update product costs/stock
      for (const item of input.items) {
        const totalCost = item.quantity * item.unit_cost;

        // Create line item
        await tx.insert(purchaseLineItemsTable)
          .values({
            purchase_transaction_id: transactionId,
            product_id: item.product_id,
            quantity: item.quantity.toString(),
            unit_cost: item.unit_cost.toString(),
            total_cost: totalCost.toString()
          })
          .execute();

        // Update product stock and cost
        await tx.update(productsTable)
          .set({
            stock_quantity: sql`${productsTable.stock_quantity} + ${item.quantity}`,
            cost_price: item.unit_cost.toString(), // Update to latest cost
            updated_at: sql`NOW()`
          })
          .where(eq(productsTable.id, item.product_id))
          .execute();
      }

      // Return the created transaction with numeric conversions
      return {
        ...purchaseTransaction[0],
        subtotal: parseFloat(purchaseTransaction[0].subtotal),
        tax_amount: parseFloat(purchaseTransaction[0].tax_amount),
        total_amount: parseFloat(purchaseTransaction[0].total_amount)
      };
    });
  } catch (error) {
    console.error('Purchase transaction creation failed:', error);
    throw error;
  }
}
