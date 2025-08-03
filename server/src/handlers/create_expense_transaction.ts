
import { db } from '../db';
import { expenseTransactionsTable, journalEntriesTable, journalLinesTable, accountsTable, suppliersTable, usersTable } from '../db/schema';
import { type CreateExpenseTransactionInput, type ExpenseTransaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function createExpenseTransaction(input: CreateExpenseTransactionInput): Promise<ExpenseTransaction> {
  try {
    // Verify that the account exists and is an expense account
    const account = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, input.account_id))
      .execute();

    if (account.length === 0) {
      throw new Error('Account not found');
    }

    if (account[0].type !== 'expense') {
      throw new Error('Account must be of type expense');
    }

    // Verify supplier exists if provided
    if (input.supplier_id) {
      const supplier = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, input.supplier_id))
        .execute();

      if (supplier.length === 0) {
        throw new Error('Supplier not found');
      }
    }

    // Get the cash account (assuming first asset account created is cash)
    const cashAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.type, 'asset'))
      .limit(1)
      .execute();

    if (cashAccount.length === 0) {
      throw new Error('Cash account not found');
    }

    // Get a user for creating journal entries (use first available user)
    const user = await db.select()
      .from(usersTable)
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('No user available to create journal entry');
    }

    // Create the expense transaction first
    const expenseResult = await db.insert(expenseTransactionsTable)
      .values({
        description: input.description,
        amount: input.amount.toString(),
        date: input.date,
        account_id: input.account_id,
        supplier_id: input.supplier_id,
        reference: input.reference,
        status: 'draft'
      })
      .returning()
      .execute();

    const expense = expenseResult[0];

    // Generate journal entry number (simple format: EXP-{expense_id})
    const entryNumber = `EXP-${expense.id}`;

    // Create journal entry for the expense transaction
    // DR: Expense Account (increase expense)
    // CR: Cash/Accounts Payable (decrease cash or increase liability)
    const journalEntryResult = await db.insert(journalEntriesTable)
      .values({
        entry_number: entryNumber,
        date: input.date,
        description: `Expense: ${input.description}`,
        reference: input.reference,
        transaction_type: 'expense',
        status: 'posted',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const journalEntry = journalEntryResult[0];

    // Create journal lines
    // Debit the expense account
    await db.insert(journalLinesTable)
      .values({
        journal_entry_id: journalEntry.id,
        account_id: input.account_id,
        debit_amount: input.amount.toString(),
        credit_amount: '0',
        description: input.description
      })
      .execute();

    // Credit the cash account
    await db.insert(journalLinesTable)
      .values({
        journal_entry_id: journalEntry.id,
        account_id: cashAccount[0].id,
        debit_amount: '0',
        credit_amount: input.amount.toString(),
        description: `Payment for: ${input.description}`
      })
      .execute();

    // Update expense transaction with journal entry reference
    await db.update(expenseTransactionsTable)
      .set({
        journal_entry_id: journalEntry.id,
        status: 'posted'
      })
      .where(eq(expenseTransactionsTable.id, expense.id))
      .execute();

    // Return the completed expense transaction
    return {
      ...expense,
      amount: parseFloat(expense.amount),
      journal_entry_id: journalEntry.id,
      status: 'posted'
    };
  } catch (error) {
    console.error('Expense transaction creation failed:', error);
    throw error;
  }
}
