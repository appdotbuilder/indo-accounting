
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  sku: 'TEST-001',
  name: 'Test Product',
  description: 'A product for testing',
  unit_price: 19.99,
  cost_price: 15.50,
  stock_quantity: 100,
  minimum_stock: 10,
  unit: 'pcs'
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.sku).toEqual('TEST-001');
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.unit_price).toEqual(19.99);
    expect(typeof result.unit_price).toBe('number');
    expect(result.cost_price).toEqual(15.50);
    expect(typeof result.cost_price).toBe('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.minimum_stock).toEqual(10);
    expect(result.unit).toEqual('pcs');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].sku).toEqual('TEST-001');
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].description).toEqual('A product for testing');
    expect(parseFloat(products[0].unit_price)).toEqual(19.99);
    expect(parseFloat(products[0].cost_price)).toEqual(15.50);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].minimum_stock).toEqual(10);
    expect(products[0].unit).toEqual('pcs');
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description', async () => {
    const inputWithNullDescription: CreateProductInput = {
      ...testInput,
      description: null
    };

    const result = await createProduct(inputWithNullDescription);

    expect(result.description).toBeNull();
    expect(result.sku).toEqual('TEST-001');
    expect(result.name).toEqual('Test Product');
  });

  it('should create product with zero stock quantities', async () => {
    const inputWithZeroStock: CreateProductInput = {
      ...testInput,
      stock_quantity: 0,
      minimum_stock: 0
    };

    const result = await createProduct(inputWithZeroStock);

    expect(result.stock_quantity).toEqual(0);
    expect(result.minimum_stock).toEqual(0);
    expect(result.unit_price).toEqual(19.99);
    expect(result.cost_price).toEqual(15.50);
  });

  it('should throw error for duplicate SKU', async () => {
    // Create first product
    await createProduct(testInput);

    // Try to create second product with same SKU
    await expect(createProduct(testInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});
