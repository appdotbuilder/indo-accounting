
import { z } from 'zod';

// User and Role schemas
export const userRoleSchema = z.enum(['admin', 'accountant', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  password: z.string().min(8)
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Customer schemas
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  tax_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  tax_id: z.string().nullable()
});
export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Supplier schemas
export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  tax_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  tax_id: z.string().nullable()
});
export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

// Account schemas for Chart of Accounts
export const accountTypeSchema = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  parent_id: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Account = z.infer<typeof accountSchema>;

export const createAccountInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  parent_id: z.number().nullable()
});
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

// Product/Inventory schemas
export const productSchema = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit_price: z.number(),
  cost_price: z.number(),
  stock_quantity: z.number().int(),
  minimum_stock: z.number().int(),
  unit: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit_price: z.number().positive(),
  cost_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  minimum_stock: z.number().int().nonnegative(),
  unit: z.string()
});
export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Transaction type schemas
export const transactionTypeSchema = z.enum(['sale', 'purchase', 'expense', 'manual']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionStatusSchema = z.enum(['draft', 'posted', 'cancelled']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

// Journal Entry schemas
export const journalEntrySchema = z.object({
  id: z.number(),
  entry_number: z.string(),
  date: z.coerce.date(),
  description: z.string(),
  reference: z.string().nullable(),
  transaction_type: transactionTypeSchema,
  status: transactionStatusSchema,
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const journalLineSchema = z.object({
  id: z.number(),
  journal_entry_id: z.number(),
  account_id: z.number(),
  debit_amount: z.number(),
  credit_amount: z.number(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const createJournalEntryInputSchema = z.object({
  date: z.coerce.date(),
  description: z.string(),
  reference: z.string().nullable(),
  transaction_type: transactionTypeSchema,
  lines: z.array(z.object({
    account_id: z.number(),
    debit_amount: z.number().nonnegative(),
    credit_amount: z.number().nonnegative(),
    description: z.string().nullable()
  })).min(2) // At least 2 lines for double-entry
});
export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;

// Sales Transaction schemas
export const salesTransactionSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  customer_id: z.number(),
  date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  journal_entry_id: z.number().nullable(),
  status: transactionStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type SalesTransaction = z.infer<typeof salesTransactionSchema>;

export const salesLineItemSchema = z.object({
  id: z.number(),
  sales_transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});
export type SalesLineItem = z.infer<typeof salesLineItemSchema>;

export const createSalesTransactionInputSchema = z.object({
  customer_id: z.number(),
  date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().positive(),
    unit_price: z.number().positive()
  })).min(1),
  tax_rate: z.number().nonnegative().default(0.11) // Default 11% VAT for Indonesia
});
export type CreateSalesTransactionInput = z.infer<typeof createSalesTransactionInputSchema>;

// Purchase Transaction schemas
export const purchaseTransactionSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  supplier_id: z.number(),
  date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  journal_entry_id: z.number().nullable(),
  status: transactionStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type PurchaseTransaction = z.infer<typeof purchaseTransactionSchema>;

export const purchaseLineItemSchema = z.object({
  id: z.number(),
  purchase_transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number(),
  unit_cost: z.number(),
  total_cost: z.number(),
  created_at: z.coerce.date()
});
export type PurchaseLineItem = z.infer<typeof purchaseLineItemSchema>;

export const createPurchaseTransactionInputSchema = z.object({
  supplier_id: z.number(),
  date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  invoice_number: z.string(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().positive(),
    unit_cost: z.number().positive()
  })).min(1),
  tax_rate: z.number().nonnegative().default(0.11)
});
export type CreatePurchaseTransactionInput = z.infer<typeof createPurchaseTransactionInputSchema>;

// Expense Transaction schemas
export const expenseTransactionSchema = z.object({
  id: z.number(),
  description: z.string(),
  amount: z.number(),
  date: z.coerce.date(),
  account_id: z.number(),
  supplier_id: z.number().nullable(),
  reference: z.string().nullable(),
  journal_entry_id: z.number().nullable(),
  status: transactionStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type ExpenseTransaction = z.infer<typeof expenseTransactionSchema>;

export const createExpenseTransactionInputSchema = z.object({
  description: z.string(),
  amount: z.number().positive(),
  date: z.coerce.date(),
  account_id: z.number(),
  supplier_id: z.number().nullable(),
  reference: z.string().nullable()
});
export type CreateExpenseTransactionInput = z.infer<typeof createExpenseTransactionInputSchema>;

// Financial Report schemas
export const balanceSheetSchema = z.object({
  assets: z.array(z.object({
    account_id: z.number(),
    account_name: z.string(),
    balance: z.number()
  })),
  liabilities: z.array(z.object({
    account_id: z.number(),
    account_name: z.string(),
    balance: z.number()
  })),
  equity: z.array(z.object({
    account_id: z.number(),
    account_name: z.string(),
    balance: z.number()
  })),
  total_assets: z.number(),
  total_liabilities: z.number(),
  total_equity: z.number(),
  as_of_date: z.coerce.date()
});
export type BalanceSheet = z.infer<typeof balanceSheetSchema>;

export const incomeStatementSchema = z.object({
  revenues: z.array(z.object({
    account_id: z.number(),
    account_name: z.string(),
    amount: z.number()
  })),
  expenses: z.array(z.object({
    account_id: z.number(),
    account_name: z.string(),
    amount: z.number()
  })),
  total_revenue: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});
export type IncomeStatement = z.infer<typeof incomeStatementSchema>;

export const cashFlowStatementSchema = z.object({
  operating_activities: z.array(z.object({
    description: z.string(),
    amount: z.number()
  })),
  investing_activities: z.array(z.object({
    description: z.string(),
    amount: z.number()
  })),
  financing_activities: z.array(z.object({
    description: z.string(),
    amount: z.number()
  })),
  net_operating_cash: z.number(),
  net_investing_cash: z.number(),
  net_financing_cash: z.number(),
  net_cash_flow: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});
export type CashFlowStatement = z.infer<typeof cashFlowStatementSchema>;

// Report input schemas
export const reportPeriodInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});
export type ReportPeriodInput = z.infer<typeof reportPeriodInputSchema>;

export const balanceSheetInputSchema = z.object({
  as_of_date: z.coerce.date()
});
export type BalanceSheetInput = z.infer<typeof balanceSheetInputSchema>;
