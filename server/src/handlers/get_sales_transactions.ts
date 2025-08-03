
import { db } from '../db';
import { salesTransactionsTable } from '../db/schema';
import { type SalesTransaction } from '../schema';

export async function getSalesTransactions(): Promise<SalesTransaction[]> {
  try {
    const results = await db.select()
      .from(salesTransactionsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      total_amount: parseFloat(transaction.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch sales transactions:', error);
    throw error;
  }
}
