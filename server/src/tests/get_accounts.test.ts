
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accountsTable } from '../db/schema';
import { getAccounts } from '../handlers/get_accounts';
import { type AccountType } from '../schema';

describe('getAccounts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no accounts exist', async () => {
    const result = await getAccounts();
    expect(result).toEqual([]);
  });

  it('should return all accounts ordered by code', async () => {
    // Create test accounts in different order
    await db.insert(accountsTable).values([
      {
        code: '2000',
        name: 'Accounts Payable',
        type: 'liability' as AccountType,
        parent_id: null
      },
      {
        code: '1000',
        name: 'Cash',
        type: 'asset' as AccountType,
        parent_id: null
      },
      {
        code: '1100',
        name: 'Bank Account',
        type: 'asset' as AccountType,
        parent_id: null
      }
    ]).execute();

    const result = await getAccounts();

    expect(result).toHaveLength(3);
    
    // Should be ordered by code
    expect(result[0].code).toBe('1000');
    expect(result[0].name).toBe('Cash');
    expect(result[0].type).toBe('asset');
    
    expect(result[1].code).toBe('1100');
    expect(result[1].name).toBe('Bank Account');
    expect(result[1].type).toBe('asset');
    
    expect(result[2].code).toBe('2000');
    expect(result[2].name).toBe('Accounts Payable');
    expect(result[2].type).toBe('liability');
  });

  it('should return accounts with all required fields', async () => {
    await db.insert(accountsTable).values({
      code: '1000',
      name: 'Cash',
      type: 'asset' as AccountType,
      parent_id: null
    }).execute();

    const result = await getAccounts();

    expect(result).toHaveLength(1);
    const account = result[0];
    
    expect(account.id).toBeDefined();
    expect(typeof account.id).toBe('number');
    expect(account.code).toBe('1000');
    expect(account.name).toBe('Cash');
    expect(account.type).toBe('asset');
    expect(account.parent_id).toBeNull();
    expect(account.is_active).toBe(true); // Default value
    expect(account.created_at).toBeInstanceOf(Date);
    expect(account.updated_at).toBeInstanceOf(Date);
  });

  it('should return both active and inactive accounts', async () => {
    await db.insert(accountsTable).values([
      {
        code: '1000',
        name: 'Active Cash',
        type: 'asset' as AccountType,
        parent_id: null,
        is_active: true
      },
      {
        code: '1001',
        name: 'Inactive Cash',
        type: 'asset' as AccountType,
        parent_id: null,
        is_active: false
      }
    ]).execute();

    const result = await getAccounts();

    expect(result).toHaveLength(2);
    expect(result[0].is_active).toBe(true);
    expect(result[1].is_active).toBe(false);
  });

  it('should handle hierarchical accounts with parent_id', async () => {
    // Insert parent account first
    const parentResult = await db.insert(accountsTable).values({
      code: '1000',
      name: 'Current Assets',
      type: 'asset' as AccountType,
      parent_id: null
    }).returning().execute();

    const parentId = parentResult[0].id;

    // Insert child account
    await db.insert(accountsTable).values({
      code: '1100',
      name: 'Cash',
      type: 'asset' as AccountType,
      parent_id: parentId
    }).execute();

    const result = await getAccounts();

    expect(result).toHaveLength(2);
    
    const parent = result.find(a => a.code === '1000');
    const child = result.find(a => a.code === '1100');
    
    expect(parent?.parent_id).toBeNull();
    expect(child?.parent_id).toBe(parentId);
  });

  it('should handle all account types', async () => {
    const accountTypes: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    
    await db.insert(accountsTable).values(
      accountTypes.map((type, index) => ({
        code: `${1000 + index}`,
        name: `Test ${type}`,
        type: type,
        parent_id: null
      }))
    ).execute();

    const result = await getAccounts();

    expect(result).toHaveLength(5);
    
    accountTypes.forEach(type => {
      const account = result.find(a => a.type === type);
      expect(account).toBeDefined();
      expect(account?.name).toBe(`Test ${type}`);
    });
  });
});
