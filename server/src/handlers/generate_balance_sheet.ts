
import { db } from '../db';
import { accountsTable, journalLinesTable, journalEntriesTable } from '../db/schema';
import { type BalanceSheetInput, type BalanceSheet } from '../schema';
import { eq, lte, and, sql } from 'drizzle-orm';

export async function generateBalanceSheet(input: BalanceSheetInput): Promise<BalanceSheet> {
  try {
    // Get all active accounts
    const accounts = await db
      .select({
        id: accountsTable.id,
        name: accountsTable.name,
        type: accountsTable.type
      })
      .from(accountsTable)
      .where(eq(accountsTable.is_active, true))
      .execute();

    // Get account balances from posted journal entries up to the specified date
    const accountBalances = await db
      .select({
        account_id: journalLinesTable.account_id,
        debit_total: sql<string>`SUM(${journalLinesTable.debit_amount})`,
        credit_total: sql<string>`SUM(${journalLinesTable.credit_amount})`
      })
      .from(journalLinesTable)
      .innerJoin(journalEntriesTable, eq(journalLinesTable.journal_entry_id, journalEntriesTable.id))
      .where(and(
        lte(journalEntriesTable.date, input.as_of_date),
        eq(journalEntriesTable.status, 'posted')
      ))
      .groupBy(journalLinesTable.account_id)
      .execute();

    // Create a map of account balances for quick lookup
    const balanceMap = new Map();
    accountBalances.forEach(balance => {
      const debitTotal = parseFloat(balance.debit_total);
      const creditTotal = parseFloat(balance.credit_total);
      balanceMap.set(balance.account_id, { debitTotal, creditTotal });
    });

    // Calculate net balance for each account based on account type
    const processedAccounts = accounts.map(account => {
      const balanceData = balanceMap.get(account.id);
      
      if (!balanceData) {
        // Account has no transactions, balance is 0
        return {
          account_id: account.id,
          account_name: account.name,
          account_type: account.type,
          balance: 0
        };
      }

      const { debitTotal, creditTotal } = balanceData;
      
      // For balance sheet accounts:
      // Assets have normal debit balance (debit - credit)
      // Liabilities and Equity have normal credit balance (credit - debit)
      let balance: number;
      if (account.type === 'asset') {
        balance = debitTotal - creditTotal;
      } else if (account.type === 'liability' || account.type === 'equity') {
        balance = creditTotal - debitTotal;
      } else {
        // Revenue and expense accounts don't appear on balance sheet
        balance = 0;
      }

      return {
        account_id: account.id,
        account_name: account.name,
        account_type: account.type,
        balance
      };
    });

    // Filter and group accounts by type, excluding zero balances
    const assets = processedAccounts
      .filter(account => account.account_type === 'asset' && account.balance !== 0)
      .map(({ account_id, account_name, balance }) => ({ account_id, account_name, balance }));

    const liabilities = processedAccounts
      .filter(account => account.account_type === 'liability' && account.balance !== 0)
      .map(({ account_id, account_name, balance }) => ({ account_id, account_name, balance }));

    const equity = processedAccounts
      .filter(account => account.account_type === 'equity' && account.balance !== 0)
      .map(({ account_id, account_name, balance }) => ({ account_id, account_name, balance }));

    // Calculate totals
    const total_assets = assets.reduce((sum, account) => sum + account.balance, 0);
    const total_liabilities = liabilities.reduce((sum, account) => sum + account.balance, 0);
    const total_equity = equity.reduce((sum, account) => sum + account.balance, 0);

    return {
      assets,
      liabilities,
      equity,
      total_assets,
      total_liabilities,
      total_equity,
      as_of_date: input.as_of_date
    };
  } catch (error) {
    console.error('Balance sheet generation failed:', error);
    throw error;
  }
}
