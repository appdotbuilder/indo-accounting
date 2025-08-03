
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  try {
    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        sku: input.sku,
        name: input.name,
        description: input.description,
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity, // Integer column - no conversion needed
        minimum_stock: input.minimum_stock, // Integer column - no conversion needed
        unit: input.unit
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      unit_price: parseFloat(product.unit_price), // Convert string back to number
      cost_price: parseFloat(product.cost_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};
