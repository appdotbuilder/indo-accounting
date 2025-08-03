
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCustomerInput = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '+1234567890',
  address: '123 Test Street',
  tax_id: 'TAX123456'
};

// Test input with null fields
const minimalInput: CreateCustomerInput = {
  name: 'Minimal Customer',
  email: null,
  phone: null,
  address: null,
  tax_id: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Customer');
    expect(result.email).toEqual('test@example.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.address).toEqual('123 Test Street');
    expect(result.tax_id).toEqual('TAX123456');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields (nulls)', async () => {
    const result = await createCustomer(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Minimal Customer');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.tax_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Test Customer');
    expect(customers[0].email).toEqual('test@example.com');
    expect(customers[0].phone).toEqual('+1234567890');
    expect(customers[0].address).toEqual('123 Test Street');
    expect(customers[0].tax_id).toEqual('TAX123456');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate email addresses', async () => {
    // Create first customer
    await createCustomer(testInput);

    // Attempt to create another customer with same email
    const duplicateInput: CreateCustomerInput = {
      name: 'Another Customer',
      email: 'test@example.com', // Same email
      phone: '+9876543210',
      address: '456 Another Street',
      tax_id: 'TAX789012'
    };

    // Should still succeed since email is not unique constraint in schema
    const result = await createCustomer(duplicateInput);
    expect(result.name).toEqual('Another Customer');
    expect(result.email).toEqual('test@example.com');
  });

  it('should generate unique IDs for multiple customers', async () => {
    const customer1 = await createCustomer(testInput);
    const customer2 = await createCustomer(minimalInput);

    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.id).toBeGreaterThan(0);
    expect(customer2.id).toBeGreaterThan(0);
  });
});
