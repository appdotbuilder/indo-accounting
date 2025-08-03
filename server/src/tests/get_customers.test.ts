
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { getCustomers } from '../handlers/get_customers';

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();
    expect(result).toEqual([]);
  });

  it('should return all customers', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([
        {
          name: 'Customer One',
          email: 'customer1@example.com',
          phone: '123456789',
          address: '123 Main St',
          tax_id: 'TAX001'
        },
        {
          name: 'Customer Two',
          email: 'customer2@example.com',
          phone: null,
          address: null,
          tax_id: null
        }
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Verify first customer
    expect(result[0].name).toEqual('Customer One');
    expect(result[0].email).toEqual('customer1@example.com');
    expect(result[0].phone).toEqual('123456789');
    expect(result[0].address).toEqual('123 Main St');
    expect(result[0].tax_id).toEqual('TAX001');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify second customer with null fields
    expect(result[1].name).toEqual('Customer Two');
    expect(result[1].email).toEqual('customer2@example.com');
    expect(result[1].phone).toBeNull();
    expect(result[1].address).toBeNull();
    expect(result[1].tax_id).toBeNull();
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should return customers ordered by creation date', async () => {
    // Create customers with slight delay to ensure different timestamps
    await db.insert(customersTable)
      .values({
        name: 'First Customer',
        email: 'first@example.com',
        phone: null,
        address: null,
        tax_id: null
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(customersTable)
      .values({
        name: 'Second Customer',
        email: 'second@example.com',
        phone: null,
        address: null,
        tax_id: null
      })
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Customer');
    expect(result[1].name).toEqual('Second Customer');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
