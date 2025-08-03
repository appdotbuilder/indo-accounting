
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProducts } from '../handlers/get_products';

const testProduct: CreateProductInput = {
  sku: 'TEST-001',
  name: 'Test Product',
  description: 'A product for testing',
  unit_price: 19.99,
  cost_price: 15.50,
  stock_quantity: 100,
  minimum_stock: 10,
  unit: 'pcs'
};

const testProduct2: CreateProductInput = {
  sku: 'TEST-002',
  name: 'Another Test Product',
  description: null,
  unit_price: 25.00,
  cost_price: 20.00,
  stock_quantity: 0,
  minimum_stock: 5,
  unit: 'kg'
};

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products with correct field types', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        ...testProduct,
        unit_price: testProduct.unit_price.toString(),
        cost_price: testProduct.cost_price.toString()
      },
      {
        ...testProduct2,
        unit_price: testProduct2.unit_price.toString(),
        cost_price: testProduct2.cost_price.toString()
      }
    ]).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);

    // Verify first product
    const product1 = result.find(p => p.sku === 'TEST-001');
    expect(product1).toBeDefined();
    expect(product1!.name).toEqual('Test Product');
    expect(product1!.description).toEqual('A product for testing');
    expect(product1!.unit_price).toEqual(19.99);
    expect(typeof product1!.unit_price).toBe('number');
    expect(product1!.cost_price).toEqual(15.50);
    expect(typeof product1!.cost_price).toBe('number');
    expect(product1!.stock_quantity).toEqual(100);
    expect(product1!.minimum_stock).toEqual(10);
    expect(product1!.unit).toEqual('pcs');
    expect(product1!.id).toBeDefined();
    expect(product1!.created_at).toBeInstanceOf(Date);
    expect(product1!.updated_at).toBeInstanceOf(Date);

    // Verify second product with null description and zero stock
    const product2 = result.find(p => p.sku === 'TEST-002');
    expect(product2).toBeDefined();
    expect(product2!.name).toEqual('Another Test Product');
    expect(product2!.description).toBeNull();
    expect(product2!.unit_price).toEqual(25.00);
    expect(typeof product2!.unit_price).toBe('number');
    expect(product2!.cost_price).toEqual(20.00);
    expect(typeof product2!.cost_price).toBe('number');
    expect(product2!.stock_quantity).toEqual(0);
    expect(product2!.minimum_stock).toEqual(5);
    expect(product2!.unit).toEqual('kg');
  });

  it('should return products sorted by creation order', async () => {
    // Create products in specific order
    await db.insert(productsTable).values({
      ...testProduct,
      unit_price: testProduct.unit_price.toString(),
      cost_price: testProduct.cost_price.toString()
    }).execute();

    await db.insert(productsTable).values({
      ...testProduct2,
      unit_price: testProduct2.unit_price.toString(),
      cost_price: testProduct2.cost_price.toString()
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].sku).toEqual('TEST-001');
    expect(result[1].sku).toEqual('TEST-002');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
