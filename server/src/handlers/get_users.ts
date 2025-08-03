
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results.map(user => ({
      ...user,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}
