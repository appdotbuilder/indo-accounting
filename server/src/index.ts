
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  createCustomerInputSchema,
  createSupplierInputSchema,
  createAccountInputSchema,
  createProductInputSchema,
  createJournalEntryInputSchema,
  createSalesTransactionInputSchema,
  createPurchaseTransactionInputSchema,
  createExpenseTransactionInputSchema,
  balanceSheetInputSchema,
  reportPeriodInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { createSupplier } from './handlers/create_supplier';
import { getSuppliers } from './handlers/get_suppliers';
import { createAccount } from './handlers/create_account';
import { getAccounts } from './handlers/get_accounts';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { createJournalEntry } from './handlers/create_journal_entry';
import { getJournalEntries } from './handlers/get_journal_entries';
import { createSalesTransaction } from './handlers/create_sales_transaction';
import { getSalesTransactions } from './handlers/get_sales_transactions';
import { createPurchaseTransaction } from './handlers/create_purchase_transaction';
import { getPurchaseTransactions } from './handlers/get_purchase_transactions';
import { createExpenseTransaction } from './handlers/create_expense_transaction';
import { getExpenseTransactions } from './handlers/get_expense_transactions';
import { generateBalanceSheet } from './handlers/generate_balance_sheet';
import { generateIncomeStatement } from './handlers/generate_income_statement';
import { generateCashFlowStatement } from './handlers/generate_cash_flow_statement';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Customer management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  getCustomers: publicProcedure
    .query(() => getCustomers()),

  // Supplier management
  createSupplier: publicProcedure
    .input(createSupplierInputSchema)
    .mutation(({ input }) => createSupplier(input)),
  getSuppliers: publicProcedure
    .query(() => getSuppliers()),

  // Chart of Accounts
  createAccount: publicProcedure
    .input(createAccountInputSchema)
    .mutation(({ input }) => createAccount(input)),
  getAccounts: publicProcedure
    .query(() => getAccounts()),

  // Inventory/Products
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  getProducts: publicProcedure
    .query(() => getProducts()),

  // Journal Entries
  createJournalEntry: publicProcedure
    .input(createJournalEntryInputSchema)
    .mutation(({ input }) => createJournalEntry(input)),
  getJournalEntries: publicProcedure
    .query(() => getJournalEntries()),

  // Sales Transactions
  createSalesTransaction: publicProcedure
    .input(createSalesTransactionInputSchema)
    .mutation(({ input }) => createSalesTransaction(input)),
  getSalesTransactions: publicProcedure
    .query(() => getSalesTransactions()),

  // Purchase Transactions
  createPurchaseTransaction: publicProcedure
    .input(createPurchaseTransactionInputSchema)
    .mutation(({ input }) => createPurchaseTransaction(input)),
  getPurchaseTransactions: publicProcedure
    .query(() => getPurchaseTransactions()),

  // Expense Transactions
  createExpenseTransaction: publicProcedure
    .input(createExpenseTransactionInputSchema)
    .mutation(({ input }) => createExpenseTransaction(input)),
  getExpenseTransactions: publicProcedure
    .query(() => getExpenseTransactions()),

  // Financial Reports
  generateBalanceSheet: publicProcedure
    .input(balanceSheetInputSchema)
    .query(({ input }) => generateBalanceSheet(input)),
  generateIncomeStatement: publicProcedure
    .input(reportPeriodInputSchema)
    .query(({ input }) => generateIncomeStatement(input)),
  generateCashFlowStatement: publicProcedure
    .input(reportPeriodInputSchema)
    .query(({ input }) => generateCashFlowStatement(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Indonesian SME Accounting TRPC server listening at port: ${port}`);
}

start();
