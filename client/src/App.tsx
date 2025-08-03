
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { 
  Product, 
  Customer, 
  Supplier, 
  User, 
  Account,
  SalesTransaction,
  PurchaseTransaction,
  ExpenseTransaction,
  JournalEntry
} from '../../server/src/schema';

// Import components
import { ProductManagement } from '@/components/ProductManagement';
import { CustomerManagement } from '@/components/CustomerManagement';
import { SupplierManagement } from '@/components/SupplierManagement';
import { UserManagement } from '@/components/UserManagement';
import { AccountManagement } from '@/components/AccountManagement';
import { SalesManagement } from '@/components/SalesManagement';
import { PurchaseManagement } from '@/components/PurchaseManagement';
import { ExpenseManagement } from '@/components/ExpenseManagement';
import { JournalManagement } from '@/components/JournalManagement';
import { FinancialReports } from '@/components/FinancialReports';
import { Dashboard } from '@/components/Dashboard';

function App() {
  // State for all main data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [purchaseTransactions, setPurchaseTransactions] = useState<PurchaseTransaction[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<ExpenseTransaction[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Current user state (in real app, this would come from auth)
  const [currentUser] = useState<User>({
    id: 1,
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  // Sample data for demo mode
  const loadSampleData = useCallback(() => {
    setProducts([
      {
        id: 1,
        sku: 'PROD001',
        name: 'Sample Product A',
        description: 'High-quality sample product for demonstration',
        unit_price: 150000,
        cost_price: 100000,
        stock_quantity: 25,
        minimum_stock: 10,
        unit: 'pcs',
        created_at: new Date('2024-01-15'),
        updated_at: new Date()
      },
      {
        id: 2,
        sku: 'PROD002',
        name: 'Sample Product B',
        description: 'Another sample product',
        unit_price: 250000,
        cost_price: 180000,
        stock_quantity: 8,
        minimum_stock: 15,
        unit: 'pcs',
        created_at: new Date('2024-01-20'),
        updated_at: new Date()
      }
    ]);

    setCustomers([
      {
        id: 1,
        name: 'PT Maju Jaya',
        email: 'info@majujaya.co.id',
        phone: '+62 21 1234 5678',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat',
        tax_id: '01.234.567.8-901.000',
        created_at: new Date('2024-01-10'),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'CV Berkah Mandiri',
        email: 'contact@berkahmandiri.com',
        phone: '+62 22 8765 4321',
        address: 'Jl. Asia Afrika No. 456, Bandung',
        tax_id: '02.345.678.9-012.000',
        created_at: new Date('2024-01-12'),
        updated_at: new Date()
      }
    ]);

    setSuppliers([
      {
        id: 1,
        name: 'PT Supplier Utama',
        email: 'sales@supplierutama.co.id',
        phone: '+62 21 9876 5432',
        address: 'Jl. Gatot Subroto No. 789, Jakarta Selatan',
        tax_id: '03.456.789.0-123.000',
        created_at: new Date('2024-01-05'),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'CV Distributor Prima',
        email: 'order@distributorprima.com',
        phone: '+62 31 5555 6666',
        address: 'Jl. Basuki Rachmat No. 321, Surabaya',
        tax_id: '04.567.890.1-234.000',
        created_at: new Date('2024-01-08'),
        updated_at: new Date()
      }
    ]);

    setAccounts([
      {
        id: 1,
        code: '1100',
        name: 'Cash in Bank - BCA',
        type: 'asset',
        parent_id: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      },
      {
        id: 2,
        code: '1200',
        name: 'Accounts Receivable',
        type: 'asset',
        parent_id: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      },
      {
        id: 3,
        code: '4100',
        name: 'Sales Revenue',
        type: 'revenue',
        parent_id: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      },
      {
        id: 4,
        code: '5100',
        name: 'Office Supplies Expense',
        type: 'expense',
        parent_id: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      },
      {
        id: 5,
        code: '5200',
        name: 'Utilities Expense',
        type: 'expense',
        parent_id: null,
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      }
    ]);

    setSalesTransactions([
      {
        id: 1,
        invoice_number: 'INV-2024-001',
        customer_id: 1,
        date: new Date('2024-02-15'),
        due_date: new Date('2024-03-15'),
        subtotal: 2250000,
        tax_amount: 247500,
        total_amount: 2497500,
        journal_entry_id: 1,
        status: 'posted',
        created_at: new Date('2024-02-15'),
        updated_at: new Date('2024-02-15')
      },
      {
        id: 2,
        invoice_number: 'INV-2024-002',
        customer_id: 2,
        date: new Date('2024-02-18'),
        due_date: new Date('2024-03-18'),
        subtotal: 1500000,
        tax_amount: 165000,
        total_amount: 1665000,
        journal_entry_id: 2,
        status: 'posted',
        created_at: new Date('2024-02-18'),
        updated_at: new Date('2024-02-18')
      }
    ]);

    setPurchaseTransactions([
      {
        id: 1,
        invoice_number: 'PURC-2024-001',
        supplier_id: 1,
        date: new Date('2024-02-10'),
        due_date: new Date('2024-03-10'),
        subtotal: 1800000,
        tax_amount: 198000,
        total_amount: 1998000,
        journal_entry_id: 3,
        status: 'posted',
        created_at: new Date('2024-02-10'),
        updated_at: new Date('2024-02-10')
      }
    ]);

    setExpenseTransactions([
      {
        id: 1,
        description: 'Office Supplies - Stationery',
        amount: 750000,
        date: new Date('2024-02-12'),
        account_id: 4,
        supplier_id: 2,
        reference: 'EXP-001',
        journal_entry_id: 4,
        status: 'posted',
        created_at: new Date('2024-02-12'),
        updated_at: new Date('2024-02-12')
      },
      {
        id: 2,
        description: 'Electricity Bill - February',
        amount: 1250000,
        date: new Date('2024-02-20'),
        account_id: 5,
        supplier_id: null,
        reference: 'PLN-FEB-2024',
        journal_entry_id: 5,
        status: 'posted',
        created_at: new Date('2024-02-20'),
        updated_at: new Date('2024-02-20')
      }
    ]);

    setJournalEntries([
      {
        id: 1,
        entry_number: 'JE-2024-001',
        date: new Date('2024-02-15'),
        description: 'Sales Invoice INV-2024-001',
        reference: 'INV-2024-001',
        transaction_type: 'sale',
        status: 'posted',
        created_by: 1,
        created_at: new Date('2024-02-15'),
        updated_at: new Date('2024-02-15')
      },
      {
        id: 2,
        entry_number: 'JE-2024-002',
        date: new Date('2024-02-12'),
        description: 'Office Supplies Purchase',
        reference: 'EXP-001',
        transaction_type: 'expense',
        status: 'posted',
        created_by: 1,
        created_at: new Date('2024-02-12'),
        updated_at: new Date('2024-02-12')
      }
    ]);

    setUsers([currentUser]);
    setIsDemoMode(true);
  }, [currentUser]);

  // Load all data with enhanced error handling
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsDemoMode(false);
    
    try {
      // Try to load data with individual error handling
      const promises = [
        trpc.getProducts.query().catch(() => null),
        trpc.getCustomers.query().catch(() => null),
        trpc.getSuppliers.query().catch(() => null),
        trpc.getUsers.query().catch(() => null),
        trpc.getAccounts.query().catch(() => null),
        trpc.getSalesTransactions.query().catch(() => null),
        trpc.getPurchaseTransactions.query().catch(() => null),
        trpc.getExpenseTransactions.query().catch(() => null),
        trpc.getJournalEntries.query().catch(() => null)
      ];

      const results = await Promise.all(promises);
      
      // Check if any requests failed
      const hasFailures = results.some(result => result === null);
      
      if (hasFailures) {
        throw new Error('Server connection failed');
      }

      const [
        productsData,
        customersData,
        suppliersData,
        usersData,
        accountsData,
        salesData,
        purchaseData,
        expenseData,
        journalData
      ] = results;

      setProducts(productsData as Product[]);
      setCustomers(customersData as Customer[]);
      setSuppliers(suppliersData as Supplier[]);
      setUsers(usersData as User[]);
      setAccounts(accountsData as Account[]);
      setSalesTransactions(salesData as SalesTransaction[]);
      setPurchaseTransactions(purchaseData as PurchaseTransaction[]);
      setExpenseTransactions(expenseData as ExpenseTransaction[]);
      setJournalEntries(journalData as JournalEntry[]);

    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Unable to connect to the server. Running in demo mode with sample data.');
      loadSampleData();
    } finally {
      setIsLoading(false);
    }
  }, [loadSampleData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Calculate dashboard metrics
  const lowStockProducts = products.filter((p: Product) => p.stock_quantity <= p.minimum_stock);
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const monthlyRevenue = salesTransactions
    .filter((t: SalesTransaction) => {
      const transactionDate = new Date(t.date);
      const now = new Date();
      return transactionDate.getMonth() === now.getMonth() && 
             transactionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, t: SalesTransaction) => sum + t.total_amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">SME Accounting System</h2>
          <p className="text-gray-600">Loading your business dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Setting up modules and data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 SME Accounting</h1>
              <p className="text-sm text-gray-600">Sistem Akuntansi UMKM Indonesia</p>
            </div>
            <div className="flex items-center gap-4">
              {isDemoMode && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  🚀 Demo Mode
                </Badge>
              )}
              {lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  ⚠️ {lowStockProducts.length} Low Stock
                </Badge>
              )}
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-gray-600 capitalize">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="container mx-auto px-4 pt-4">
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              🚀 <strong>Demo Mode Active:</strong> You're exploring the SME Accounting System with sample data. 
              All features are fully functional for demonstration purposes.
              <Button variant="link" onClick={loadAllData} className="ml-2 p-0 h-auto text-blue-600">
                Try connecting to server
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Error Alert */}
      {error && !isDemoMode && (
        <div className="container mx-auto px-4 pt-4">
          <Alert className="mb-4">
            <AlertDescription>
              {error}
              <Button variant="link" onClick={loadAllData} className="ml-2 p-0 h-auto">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="dashboard" className="text-xs">🏠 Dashboard</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs">💰 Sales</TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs">🛒 Purchases</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs">💸 Expenses</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs">📋 Journal</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">📦 Inventory</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs">👥 Customers</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs">🏢 Suppliers</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs">📚 Accounts</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">📈 Reports</TabsTrigger>
            {currentUser.role === 'admin' && (
              <TabsTrigger value="users" className="text-xs">⚙️ Users</TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <Dashboard
              products={products}
              customers={customers}
              suppliers={suppliers}
              salesTransactions={salesTransactions}
              purchaseTransactions={purchaseTransactions}
              expenseTransactions={expenseTransactions}
              lowStockProducts={lowStockProducts}
              totalCustomers={totalCustomers}
              totalSuppliers={totalSuppliers}
              monthlyRevenue={monthlyRevenue}
            />
          </TabsContent>

          {/* Sales Transactions */}
          <TabsContent value="sales">
            <SalesManagement
              salesTransactions={salesTransactions}
              setSalesTransactions={setSalesTransactions}
              customers={customers}
              products={products}
            />
          </TabsContent>

          {/* Purchase Transactions */}
          <TabsContent value="purchases">
            <PurchaseManagement
              purchaseTransactions={purchaseTransactions}
              setPurchaseTransactions={setPurchaseTransactions}
              suppliers={suppliers}
              products={products}
            />
          </TabsContent>

          {/* Expense Transactions */}
          <TabsContent value="expenses">
            <ExpenseManagement
              expenseTransactions={expenseTransactions}
              setExpenseTransactions={setExpenseTransactions}
              accounts={accounts.filter((a: Account) => a.type === 'expense')}
              suppliers={suppliers}
            />
          </TabsContent>

          {/* Journal Entries */}
          <TabsContent value="journal">
            <JournalManagement
              journalEntries={journalEntries}
              setJournalEntries={setJournalEntries}
              accounts={accounts}
            />
          </TabsContent>

          {/* Inventory Management */}
          <TabsContent value="inventory">
            <ProductManagement
              products={products}
              setProducts={setProducts}
            />
          </TabsContent>

          {/* Customer Management */}
          <TabsContent value="customers">
            <CustomerManagement
              customers={customers}
              setCustomers={setCustomers}
            />
          </TabsContent>

          {/* Supplier Management */}
          <TabsContent value="suppliers">
            <SupplierManagement
              suppliers={suppliers}
              setSuppliers={setSuppliers}
            />
          </TabsContent>

          {/* Chart of Accounts */}
          <TabsContent value="accounts">
            <AccountManagement
              accounts={accounts}
              setAccounts={setAccounts}
            />
          </TabsContent>

          {/* Financial Reports */}
          <TabsContent value="reports">
            <FinancialReports />
          </TabsContent>

          {/* User Management (Admin only) */}
          {currentUser.role === 'admin' && (
            <TabsContent value="users">
              <UserManagement
                users={users}
                setUsers={setUsers}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
