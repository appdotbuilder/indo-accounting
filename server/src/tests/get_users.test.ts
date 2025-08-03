
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        email: 'admin@test.com',
        name: 'Admin User',
        password_hash: 'hashedpassword123',
        role: 'admin'
      },
      {
        email: 'user@test.com',
        name: 'Regular User',
        password_hash: 'hashedpassword456',
        role: 'user'
      },
      {
        email: 'accountant@test.com',
        name: 'Accountant User',
        password_hash: 'hashedpassword789',
        role: 'accountant',
        is_active: false
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check first user
    expect(result[0].email).toEqual('admin@test.com');
    expect(result[0].name).toEqual('Admin User');
    expect(result[0].role).toEqual('admin');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second user
    expect(result[1].email).toEqual('user@test.com');
    expect(result[1].name).toEqual('Regular User');
    expect(result[1].role).toEqual('user');
    expect(result[1].is_active).toBe(true);

    // Check third user (inactive)
    expect(result[2].email).toEqual('accountant@test.com');
    expect(result[2].name).toEqual('Accountant User');
    expect(result[2].role).toEqual('accountant');
    expect(result[2].is_active).toBe(false);
  });

  it('should return users with all required fields', async () => {
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashedpassword',
      role: 'user'
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required schema fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different user roles correctly', async () => {
    await db.insert(usersTable).values([
      {
        email: 'admin@test.com',
        name: 'Admin',
        password_hash: 'hash1',
        role: 'admin'
      },
      {
        email: 'accountant@test.com',
        name: 'Accountant',
        password_hash: 'hash2',
        role: 'accountant'
      },
      {
        email: 'user@test.com',
        name: 'User',
        password_hash: 'hash3',
        role: 'user'
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    const roles = result.map(user => user.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('accountant');
    expect(roles).toContain('user');
  });
});
