
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accountsTable } from '../db/schema';
import { type CreateAccountInput } from '../schema';
import { createAccount } from '../handlers/create_account';
import { eq } from 'drizzle-orm';

describe('createAccount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an account without parent', async () => {
    const testInput: CreateAccountInput = {
      code: '1000',
      name: 'Cash',
      type: 'asset',
      parent_id: null
    };

    const result = await createAccount(testInput);

    expect(result.code).toEqual('1000');
    expect(result.name).toEqual('Cash');
    expect(result.type).toEqual('asset');
    expect(result.parent_id).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an account with parent', async () => {
    // Create parent account first
    const parentInput: CreateAccountInput = {
      code: '1000',
      name: 'Current Assets',
      type: 'asset',
      parent_id: null
    };
    const parentAccount = await createAccount(parentInput);

    // Create child account
    const childInput: CreateAccountInput = {
      code: '1001',
      name: 'Cash in Bank',
      type: 'asset',
      parent_id: parentAccount.id
    };

    const result = await createAccount(childInput);

    expect(result.code).toEqual('1001');
    expect(result.name).toEqual('Cash in Bank');
    expect(result.type).toEqual('asset');
    expect(result.parent_id).toEqual(parentAccount.id);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
  });

  it('should save account to database', async () => {
    const testInput: CreateAccountInput = {
      code: '2000',
      name: 'Accounts Payable',
      type: 'liability',
      parent_id: null
    };

    const result = await createAccount(testInput);

    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, result.id))
      .execute();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].code).toEqual('2000');
    expect(accounts[0].name).toEqual('Accounts Payable');
    expect(accounts[0].type).toEqual('liability');
    expect(accounts[0].is_active).toBe(true);
  });

  it('should throw error for non-existent parent account', async () => {
    const testInput: CreateAccountInput = {
      code: '1001',
      name: 'Sub Account',
      type: 'asset',
      parent_id: 999 // Non-existent parent ID
    };

    await expect(createAccount(testInput)).rejects.toThrow(/Parent account with ID 999 does not exist/i);
  });

  it('should create accounts with different types', async () => {
    const assetInput: CreateAccountInput = {
      code: '1100',
      name: 'Inventory',
      type: 'asset',
      parent_id: null
    };

    const liabilityInput: CreateAccountInput = {
      code: '2100',
      name: 'Notes Payable',
      type: 'liability',
      parent_id: null
    };

    const equityInput: CreateAccountInput = {
      code: '3000',
      name: 'Owner Equity',
      type: 'equity',
      parent_id: null
    };

    const revenueInput: CreateAccountInput = {
      code: '4000',
      name: 'Sales Revenue',
      type: 'revenue',
      parent_id: null
    };

    const expenseInput: CreateAccountInput = {
      code: '5000',
      name: 'Office Expenses',
      type: 'expense',
      parent_id: null
    };

    const assetAccount = await createAccount(assetInput);
    const liabilityAccount = await createAccount(liabilityInput);
    const equityAccount = await createAccount(equityInput);
    const revenueAccount = await createAccount(revenueInput);
    const expenseAccount = await createAccount(expenseInput);

    expect(assetAccount.type).toEqual('asset');
    expect(liabilityAccount.type).toEqual('liability');
    expect(equityAccount.type).toEqual('equity');
    expect(revenueAccount.type).toEqual('revenue');
    expect(expenseAccount.type).toEqual('expense');
  });

  it('should enforce unique account codes', async () => {
    const firstInput: CreateAccountInput = {
      code: '1000',
      name: 'First Account',
      type: 'asset',
      parent_id: null
    };

    const duplicateInput: CreateAccountInput = {
      code: '1000',
      name: 'Duplicate Account',
      type: 'asset',
      parent_id: null
    };

    await createAccount(firstInput);
    await expect(createAccount(duplicateInput)).rejects.toThrow();
  });
});
