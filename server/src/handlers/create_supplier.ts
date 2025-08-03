
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput, type Supplier } from '../schema';

export const createSupplier = async (input: CreateSupplierInput): Promise<Supplier> => {
  try {
    // Insert supplier record
    const result = await db.insert(suppliersTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        tax_id: input.tax_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplier creation failed:', error);
    throw error;
  }
};
