
import { db } from '../db';
import { accountsTable } from '../db/schema';
import { type CreateAccountInput, type Account } from '../schema';
import { eq } from 'drizzle-orm';

export const createAccount = async (input: CreateAccountInput): Promise<Account> => {
  try {
    // Validate parent account exists if parent_id is provided
    if (input.parent_id) {
      const parentAccount = await db.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, input.parent_id))
        .execute();

      if (parentAccount.length === 0) {
        throw new Error(`Parent account with ID ${input.parent_id} does not exist`);
      }
    }

    // Insert account record
    const result = await db.insert(accountsTable)
      .values({
        code: input.code,
        name: input.name,
        type: input.type,
        parent_id: input.parent_id
      })
      .returning()
      .execute();

    const account = result[0];
    return account;
  } catch (error) {
    console.error('Account creation failed:', error);
    throw error;
  }
};
