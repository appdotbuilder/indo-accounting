
import { db } from '../db';
import { expenseTransactionsTable } from '../db/schema';
import { type ExpenseTransaction } from '../schema';

export const getExpenseTransactions = async (): Promise<ExpenseTransaction[]> => {
  try {
    const results = await db.select()
      .from(expenseTransactionsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch expense transactions:', error);
    throw error;
  }
};
