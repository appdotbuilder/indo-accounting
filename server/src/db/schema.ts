
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  foreignKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'accountant', 'user']);
export const accountTypeEnum = pgEnum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'purchase', 'expense', 'manual']);
export const transactionStatusEnum = pgEnum('transaction_status', ['draft', 'posted', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  tax_id: text('tax_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  tax_id: text('tax_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Chart of Accounts table
export const accountsTable = pgTable('accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  parent_id: integer('parent_id'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  parentReference: foreignKey({
    columns: [table.parent_id],
    foreignColumns: [table.id],
    name: "accounts_parent_fk"
  })
}));

// Products/Inventory table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  cost_price: numeric('cost_price', { precision: 15, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  minimum_stock: integer('minimum_stock').notNull().default(0),
  unit: text('unit').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Journal Entries table
export const journalEntriesTable = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  entry_number: text('entry_number').notNull().unique(),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  status: transactionStatusEnum('status').notNull().default('draft'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Journal Lines table
export const journalLinesTable = pgTable('journal_lines', {
  id: serial('id').primaryKey(),
  journal_entry_id: integer('journal_entry_id').notNull().references(() => journalEntriesTable.id),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  debit_amount: numeric('debit_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  credit_amount: numeric('credit_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Sales Transactions table
export const salesTransactionsTable = pgTable('sales_transactions', {
  id: serial('id').primaryKey(),
  invoice_number: text('invoice_number').notNull().unique(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  date: timestamp('date').notNull(),
  due_date: timestamp('due_date'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 15, scale: 2 }).notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  journal_entry_id: integer('journal_entry_id').references(() => journalEntriesTable.id),
  status: transactionStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales Line Items table
export const salesLineItemsTable = pgTable('sales_line_items', {
  id: serial('id').primaryKey(),
  sales_transaction_id: integer('sales_transaction_id').notNull().references(() => salesTransactionsTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Purchase Transactions table
export const purchaseTransactionsTable = pgTable('purchase_transactions', {
  id: serial('id').primaryKey(),
  invoice_number: text('invoice_number').notNull(),
  supplier_id: integer('supplier_id').notNull().references(() => suppliersTable.id),
  date: timestamp('date').notNull(),
  due_date: timestamp('due_date'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 15, scale: 2 }).notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  journal_entry_id: integer('journal_entry_id').references(() => journalEntriesTable.id),
  status: transactionStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Purchase Line Items table
export const purchaseLineItemsTable = pgTable('purchase_line_items', {
  id: serial('id').primaryKey(),
  purchase_transaction_id: integer('purchase_transaction_id').notNull().references(() => purchaseTransactionsTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit_cost: numeric('unit_cost', { precision: 15, scale: 2 }).notNull(),
  total_cost: numeric('total_cost', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Expense Transactions table
export const expenseTransactionsTable = pgTable('expense_transactions', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  date: timestamp('date').notNull(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  supplier_id: integer('supplier_id').references(() => suppliersTable.id),
  reference: text('reference'),
  journal_entry_id: integer('journal_entry_id').references(() => journalEntriesTable.id),
  status: transactionStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  journalEntries: many(journalEntriesTable)
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  salesTransactions: many(salesTransactionsTable)
}));

export const suppliersRelations = relations(suppliersTable, ({ many }) => ({
  purchaseTransactions: many(purchaseTransactionsTable),
  expenseTransactions: many(expenseTransactionsTable)
}));

export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  parent: one(accountsTable, {
    fields: [accountsTable.parent_id],
    references: [accountsTable.id]
  }),
  children: many(accountsTable),
  journalLines: many(journalLinesTable),
  expenseTransactions: many(expenseTransactionsTable)
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  salesLineItems: many(salesLineItemsTable),
  purchaseLineItems: many(purchaseLineItemsTable)
}));

export const journalEntriesRelations = relations(journalEntriesTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [journalEntriesTable.created_by],
    references: [usersTable.id]
  }),
  lines: many(journalLinesTable),
  salesTransaction: one(salesTransactionsTable),
  purchaseTransaction: one(purchaseTransactionsTable),
  expenseTransaction: one(expenseTransactionsTable)
}));

export const journalLinesRelations = relations(journalLinesTable, ({ one }) => ({
  journalEntry: one(journalEntriesTable, {
    fields: [journalLinesTable.journal_entry_id],
    references: [journalEntriesTable.id]
  }),
  account: one(accountsTable, {
    fields: [journalLinesTable.account_id],
    references: [accountsTable.id]
  })
}));

export const salesTransactionsRelations = relations(salesTransactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [salesTransactionsTable.customer_id],
    references: [customersTable.id]
  }),
  journalEntry: one(journalEntriesTable, {
    fields: [salesTransactionsTable.journal_entry_id],
    references: [journalEntriesTable.id]
  }),
  lineItems: many(salesLineItemsTable)
}));

export const salesLineItemsRelations = relations(salesLineItemsTable, ({ one }) => ({
  salesTransaction: one(salesTransactionsTable, {
    fields: [salesLineItemsTable.sales_transaction_id],
    references: [salesTransactionsTable.id]
  }),
  product: one(productsTable, {
    fields: [salesLineItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const purchaseTransactionsRelations = relations(purchaseTransactionsTable, ({ one, many }) => ({
  supplier: one(suppliersTable, {
    fields: [purchaseTransactionsTable.supplier_id],
    references: [suppliersTable.id]
  }),
  journalEntry: one(journalEntriesTable, {
    fields: [purchaseTransactionsTable.journal_entry_id],
    references: [journalEntriesTable.id]
  }),
  lineItems: many(purchaseLineItemsTable)
}));

export const purchaseLineItemsRelations = relations(purchaseLineItemsTable, ({ one }) => ({
  purchaseTransaction: one(purchaseTransactionsTable, {
    fields: [purchaseLineItemsTable.purchase_transaction_id],
    references: [purchaseTransactionsTable.id]
  }),
  product: one(productsTable, {
    fields: [purchaseLineItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const expenseTransactionsRelations = relations(expenseTransactionsTable, ({ one }) => ({
  account: one(accountsTable, {
    fields: [expenseTransactionsTable.account_id],
    references: [accountsTable.id]
  }),
  supplier: one(suppliersTable, {
    fields: [expenseTransactionsTable.supplier_id],
    references: [suppliersTable.id]
  }),
  journalEntry: one(journalEntriesTable, {
    fields: [expenseTransactionsTable.journal_entry_id],
    references: [journalEntriesTable.id]
  })
}));

// Export all tables
export const tables = {
  users: usersTable,
  customers: customersTable,
  suppliers: suppliersTable,
  accounts: accountsTable,
  products: productsTable,
  journalEntries: journalEntriesTable,
  journalLines: journalLinesTable,
  salesTransactions: salesTransactionsTable,
  salesLineItems: salesLineItemsTable,
  purchaseTransactions: purchaseTransactionsTable,
  purchaseLineItems: purchaseLineItemsTable,
  expenseTransactions: expenseTransactionsTable
};
