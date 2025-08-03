
import { db } from '../db';
import { journalEntriesTable, journalLinesTable, accountsTable } from '../db/schema';
import { type CreateJournalEntryInput, type JournalEntry } from '../schema';
import { eq, sql, inArray } from 'drizzle-orm';

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
  try {
    // Validate double-entry accounting: debits must equal credits
    const totalDebits = input.lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredits = input.lines.reduce((sum, line) => sum + line.credit_amount, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow for small floating point differences
      throw new Error('Journal entry is not balanced: debits must equal credits');
    }

    // Validate that each line has either debit or credit (but not both)
    for (const line of input.lines) {
      if (line.debit_amount > 0 && line.credit_amount > 0) {
        throw new Error('Journal line cannot have both debit and credit amounts');
      }
      if (line.debit_amount === 0 && line.credit_amount === 0) {
        throw new Error('Journal line must have either debit or credit amount');
      }
    }

    // Validate that all referenced accounts exist
    const accountIds = input.lines.map(line => line.account_id);
    const uniqueAccountIds = [...new Set(accountIds)];
    
    const existingAccounts = await db.select({ id: accountsTable.id })
      .from(accountsTable)
      .where(inArray(accountsTable.id, uniqueAccountIds))
      .execute();

    if (existingAccounts.length !== uniqueAccountIds.length) {
      throw new Error('One or more referenced accounts do not exist');
    }

    // Generate unique entry number
    const lastEntry = await db.select({ entry_number: journalEntriesTable.entry_number })
      .from(journalEntriesTable)
      .orderBy(sql`${journalEntriesTable.id} DESC`)
      .limit(1)
      .execute();

    let nextNumber = 1;
    if (lastEntry.length > 0) {
      const lastNumber = parseInt(lastEntry[0].entry_number.replace('JE-', ''));
      nextNumber = lastNumber + 1;
    }
    const entryNumber = `JE-${nextNumber.toString().padStart(7, '0')}`;

    // Create journal entry
    const journalEntryResult = await db.insert(journalEntriesTable)
      .values({
        entry_number: entryNumber,
        date: input.date,
        description: input.description,
        reference: input.reference,
        transaction_type: input.transaction_type,
        status: 'draft',
        created_by: 1 // TODO: Get from authenticated user context
      })
      .returning()
      .execute();

    const journalEntry = journalEntryResult[0];

    // Create journal lines
    const lineValues = input.lines.map(line => ({
      journal_entry_id: journalEntry.id,
      account_id: line.account_id,
      debit_amount: line.debit_amount.toString(),
      credit_amount: line.credit_amount.toString(),
      description: line.description
    }));

    await db.insert(journalLinesTable)
      .values(lineValues)
      .execute();

    return journalEntry;
  } catch (error) {
    console.error('Journal entry creation failed:', error);
    throw error;
  }
}
