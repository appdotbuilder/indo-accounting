
import { db } from '../db';
import { journalLinesTable, journalEntriesTable, accountsTable } from '../db/schema';
import { type ReportPeriodInput, type IncomeStatement } from '../schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function generateIncomeStatement(input: ReportPeriodInput): Promise<IncomeStatement> {
  try {
    // Query to get account balances for revenue and expense accounts within the period
    // For income statement:
    // - Revenue accounts: credit balance is positive (credit_amount - debit_amount)
    // - Expense accounts: debit balance is positive (debit_amount - credit_amount)
    const accountBalances = await db
      .select({
        account_id: accountsTable.id,
        account_name: accountsTable.name,
        account_type: accountsTable.type,
        total_debit: sql<string>`COALESCE(SUM(${journalLinesTable.debit_amount}), 0)`,
        total_credit: sql<string>`COALESCE(SUM(${journalLinesTable.credit_amount}), 0)`
      })
      .from(accountsTable)
      .leftJoin(journalLinesTable, eq(journalLinesTable.account_id, accountsTable.id))
      .leftJoin(journalEntriesTable, eq(journalEntriesTable.id, journalLinesTable.journal_entry_id))
      .where(
        and(
          // Only include revenue and expense accounts
          sql`${accountsTable.type} IN ('revenue', 'expense')`,
          // Only include posted journal entries within the period
          eq(journalEntriesTable.status, 'posted'),
          gte(journalEntriesTable.date, input.start_date),
          lte(journalEntriesTable.date, input.end_date)
        )
      )
      .groupBy(accountsTable.id, accountsTable.name, accountsTable.type)
      .execute();

    // Process the results to calculate proper balances
    const revenues: Array<{ account_id: number; account_name: string; amount: number }> = [];
    const expenses: Array<{ account_id: number; account_name: string; amount: number }> = [];

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accountBalances) {
      const debitAmount = parseFloat(account.total_debit);
      const creditAmount = parseFloat(account.total_credit);

      if (account.account_type === 'revenue') {
        // Revenue accounts: credit balance is positive
        const revenueAmount = creditAmount - debitAmount;
        if (revenueAmount !== 0) {
          revenues.push({
            account_id: account.account_id,
            account_name: account.account_name,
            amount: revenueAmount
          });
          totalRevenue += revenueAmount;
        }
      } else if (account.account_type === 'expense') {
        // Expense accounts: debit balance is positive
        const expenseAmount = debitAmount - creditAmount;
        if (expenseAmount !== 0) {
          expenses.push({
            account_id: account.account_id,
            account_name: account.account_name,
            amount: expenseAmount
          });
          totalExpenses += expenseAmount;
        }
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    return {
      revenues,
      expenses,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,
      period_start: input.start_date,
      period_end: input.end_date
    };
  } catch (error) {
    console.error('Income statement generation failed:', error);
    throw error;
  }
}
