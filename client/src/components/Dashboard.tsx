
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { 
  Product, 
  Customer, 
  Supplier, 
  SalesTransaction,
  PurchaseTransaction,
  ExpenseTransaction
} from '../../../server/src/schema';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesTransactions: SalesTransaction[];
  purchaseTransactions: PurchaseTransaction[];
  expenseTransactions: ExpenseTransaction[];
  lowStockProducts: Product[];
  totalCustomers: number;
  totalSuppliers: number;
  monthlyRevenue: number;
}

export function Dashboard({
  products,
  salesTransactions,
  purchaseTransactions,
  expenseTransactions,
  lowStockProducts,
  totalCustomers,
  totalSuppliers,
  monthlyRevenue
}: DashboardProps) {
  // Calculate additional metrics
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce((sum: number, p: Product) => 
    sum + (p.stock_quantity * p.cost_price), 0
  );

  const monthlyExpenses = expenseTransactions
    .filter((t: ExpenseTransaction) => {
      const transactionDate = new Date(t.date);
      const now = new Date();
      return transactionDate.getMonth() === now.getMonth() && 
             transactionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, t: ExpenseTransaction) => sum + t.amount, 0);

  const monthlyPurchases = purchaseTransactions
    .filter((t: PurchaseTransaction) => {
      const transactionDate = new Date(t.date);
      const now = new Date();
      return transactionDate.getMonth() === now.getMonth() && 
             transactionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, t: PurchaseTransaction) => sum + t.total_amount, 0);

  const netIncome = monthlyRevenue - monthlyExpenses - monthlyPurchases;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">📊 Dashboard</h2>
        <p className="text-gray-600">Overview of your business performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {monthlyRevenue.toLocaleString('id-ID')}
            </div>
            <p className="text-blue-100 text-xs">This month's sales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {netIncome.toLocaleString('id-ID')}
            </div>
            <p className="text-green-100 text-xs">Revenue - Expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalInventoryValue.toLocaleString('id-ID')}
            </div>
            <p className="text-purple-100 text-xs">{totalProducts} products</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {monthlyExpenses.toLocaleString('id-ID')}
            </div>
            <p className="text-orange-100 text-xs">This month's costs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>🏢 Business Overview</CardTitle>
            <CardDescription>Key business metrics and relationships</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCustomers}</div>
                <p className="text-sm text-gray-600">Customers</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalSuppliers}</div>
                <p className="text-sm text-gray-600">Suppliers</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalProducts}</div>
                <p className="text-sm text-gray-600">Products</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Sales Transactions</span>
                  <span>{salesTransactions.length} total</span>
                </div>
                <Progress value={(salesTransactions.length / Math.max(salesTransactions.length, 10)) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Purchase Orders</span>
                  <span>{purchaseTransactions.length} total</span>
                </div>
                <Progress value={(purchaseTransactions.length / Math.max(purchaseTransactions.length, 10)) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>⚠️ Alerts</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lowStockProducts.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-red-600">Low Stock Items</h4>
                  <Badge variant="destructive">{lowStockProducts.length}</Badge>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStockProducts.slice(0, 5).map((product: Product) => (
                    <div key={product.id} className="flex justify-between items-center text-sm">
                      <span className="truncate">{product.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {product.stock_quantity} left
                      </Badge>
                    </div>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{lowStockProducts.length - 5} more items
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm text-gray-600">All inventory levels look good!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Recent Activity</CardTitle>
          <CardDescription>Latest transactions and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {salesTransactions.slice(0, 5).map((transaction: SalesTransaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Sale #{transaction.invoice_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    +Rp {transaction.total_amount.toLocaleString('id-ID')}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            {expenseTransactions.slice(0, 3).map((transaction: ExpenseTransaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">
                    -Rp {transaction.amount.toLocaleString('id-ID')}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}

            {salesTransactions.length === 0 && expenseTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
