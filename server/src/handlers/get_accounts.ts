
import { db } from '../db';
import { accountsTable } from '../db/schema';
import { type Account } from '../schema';
import { asc } from 'drizzle-orm';

export async function getAccounts(): Promise<Account[]> {
  try {
    // Select all accounts ordered by code for consistent output
    const results = await db.select()
      .from(accountsTable)
      .orderBy(asc(accountsTable.code))
      .execute();

    // Convert numeric fields and return
    return results.map(account => ({
      ...account,
      // No numeric conversions needed - all fields are already in correct types
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parent_id: account.parent_id,
      is_active: account.is_active,
      created_at: account.created_at,
      updated_at: account.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    throw error;
  }
}
