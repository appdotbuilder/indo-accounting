
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';

export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const results = await db.select()
      .from(customersTable)
      .execute();

    // Convert timestamp fields to Date objects and return as Customer type
    return results.map(customer => ({
      ...customer,
      created_at: new Date(customer.created_at),
      updated_at: new Date(customer.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
};
