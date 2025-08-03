
import { db } from '../db';
import { purchaseTransactionsTable } from '../db/schema';
import { type PurchaseTransaction } from '../schema';

export async function getPurchaseTransactions(): Promise<PurchaseTransaction[]> {
  try {
    const results = await db.select()
      .from(purchaseTransactionsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      total_amount: parseFloat(transaction.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch purchase transactions:', error);
    throw error;
  }
}
