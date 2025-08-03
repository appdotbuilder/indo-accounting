
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      unit_price: parseFloat(product.unit_price),
      cost_price: parseFloat(product.cost_price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};
