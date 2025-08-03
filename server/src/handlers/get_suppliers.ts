
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type Supplier } from '../schema';

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const results = await db.select()
      .from(suppliersTable)
      .orderBy(suppliersTable.name)
      .execute();

    return results.map(supplier => ({
      ...supplier,
      // No numeric conversions needed - all fields are text, integer, or timestamp
    }));
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    throw error;
  }
};
