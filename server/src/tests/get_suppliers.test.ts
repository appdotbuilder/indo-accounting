
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { getSuppliers } from '../handlers/get_suppliers';

const testSupplier1: CreateSupplierInput = {
  name: 'ABC Electronics',
  email: 'contact@abcelectronics.com',
  phone: '+1234567890',
  address: '123 Main St, City, State',
  tax_id: 'TAX123456'
};

const testSupplier2: CreateSupplierInput = {
  name: 'XYZ Components',
  email: 'info@xyzcomponents.com',
  phone: '+0987654321',
  address: '456 Oak Ave, City, State',
  tax_id: 'TAX789012'
};

const testSupplierMinimal: CreateSupplierInput = {
  name: 'Basic Supplier',
  email: null,
  phone: null,
  address: null,
  tax_id: null
};

describe('getSuppliers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no suppliers exist', async () => {
    const result = await getSuppliers();
    expect(result).toEqual([]);
  });

  it('should return all suppliers', async () => {
    // Create test suppliers
    await db.insert(suppliersTable).values([
      testSupplier1,
      testSupplier2,
      testSupplierMinimal
    ]).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    
    // Verify all suppliers are returned
    const supplierNames = result.map(s => s.name);
    expect(supplierNames).toContain('ABC Electronics');
    expect(supplierNames).toContain('XYZ Components');
    expect(supplierNames).toContain('Basic Supplier');
  });

  it('should return suppliers with correct structure', async () => {
    await db.insert(suppliersTable).values(testSupplier1).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    const supplier = result[0];

    // Verify required fields
    expect(supplier.id).toBeDefined();
    expect(typeof supplier.id).toBe('number');
    expect(supplier.name).toBe('ABC Electronics');
    expect(supplier.email).toBe('contact@abcelectronics.com');
    expect(supplier.phone).toBe('+1234567890');
    expect(supplier.address).toBe('123 Main St, City, State');
    expect(supplier.tax_id).toBe('TAX123456');
    expect(supplier.created_at).toBeInstanceOf(Date);
    expect(supplier.updated_at).toBeInstanceOf(Date);
  });

  it('should handle suppliers with null fields correctly', async () => {
    await db.insert(suppliersTable).values(testSupplierMinimal).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    const supplier = result[0];

    expect(supplier.name).toBe('Basic Supplier');
    expect(supplier.email).toBeNull();
    expect(supplier.phone).toBeNull();
    expect(supplier.address).toBeNull();
    expect(supplier.tax_id).toBeNull();
  });

  it('should return suppliers ordered by name', async () => {
    // Insert in reverse alphabetical order
    await db.insert(suppliersTable).values([
      testSupplier2, // XYZ Components
      testSupplier1, // ABC Electronics
      testSupplierMinimal // Basic Supplier
    ]).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    
    // Should be ordered alphabetically by name
    expect(result[0].name).toBe('ABC Electronics');
    expect(result[1].name).toBe('Basic Supplier');
    expect(result[2].name).toBe('XYZ Components');
  });
});
