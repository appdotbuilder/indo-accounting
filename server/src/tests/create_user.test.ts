
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].role).toEqual('user');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different roles', async () => {
    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      password: 'adminpass123'
    };

    const accountantInput: CreateUserInput = {
      email: 'accountant@example.com',
      name: 'Accountant User',
      role: 'accountant',
      password: 'accountpass123'
    };

    const adminResult = await createUser(adminInput);
    const accountantResult = await createUser(accountantInput);

    expect(adminResult.role).toEqual('admin');
    expect(accountantResult.role).toEqual('accountant');

    // Verify in database
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'admin'))
      .execute();

    const accountantUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'accountant'))
      .execute();

    expect(adminUsers).toHaveLength(1);
    expect(accountantUsers).toHaveLength(1);
    expect(adminUsers[0].email).toEqual('admin@example.com');
    expect(accountantUsers[0].email).toEqual('accountant@example.com');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com',
      name: 'Another User',
      role: 'admin',
      password: 'differentpass'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});
