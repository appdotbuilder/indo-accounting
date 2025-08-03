
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { createSupplier } from '../handlers/create_supplier';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateSupplierInput = {
  name: 'Test Supplier Ltd',
  email: 'supplier@test.com',
  phone: '+62-21-1234567',
  address: '123 Business District, Jakarta',
  tax_id: 'TAX123456789'
};

// Test input with nullable fields
const minimalInput: CreateSupplierInput = {
  name: 'Minimal Supplier',
  email: null,
  phone: null,
  address: null,
  tax_id: null
};

describe('createSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplier with all fields', async () => {
    const result = await createSupplier(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Supplier Ltd');
    expect(result.email).toEqual('supplier@test.com');
    expect(result.phone).toEqual('+62-21-1234567');
    expect(result.address).toEqual('123 Business District, Jakarta');
    expect(result.tax_id).toEqual('TAX123456789');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a supplier with minimal fields', async () => {
    const result = await createSupplier(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Minimal Supplier');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.tax_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save supplier to database', async () => {
    const result = await createSupplier(testInput);

    // Query using proper drizzle syntax
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, result.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toEqual('Test Supplier Ltd');
    expect(suppliers[0].email).toEqual('supplier@test.com');
    expect(suppliers[0].phone).toEqual('+62-21-1234567');
    expect(suppliers[0].address).toEqual('123 Business District, Jakarta');
    expect(suppliers[0].tax_id).toEqual('TAX123456789');
    expect(suppliers[0].created_at).toBeInstanceOf(Date);
    expect(suppliers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple suppliers correctly', async () => {
    // Create first supplier
    const result1 = await createSupplier(testInput);
    
    // Create second supplier with different data
    const secondInput: CreateSupplierInput = {
      name: 'Second Supplier Co',
      email: 'second@test.com',
      phone: '+62-21-9876543',
      address: '456 Commerce Street, Surabaya',
      tax_id: 'TAX987654321'
    };
    const result2 = await createSupplier(secondInput);

    // Verify both suppliers exist and have different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Test Supplier Ltd');
    expect(result2.name).toEqual('Second Supplier Co');

    // Verify database contains both records
    const allSuppliers = await db.select()
      .from(suppliersTable)
      .execute();

    expect(allSuppliers).toHaveLength(2);
    const supplierNames = allSuppliers.map(s => s.name).sort();
    expect(supplierNames).toEqual(['Second Supplier Co', 'Test Supplier Ltd']);
  });
});
