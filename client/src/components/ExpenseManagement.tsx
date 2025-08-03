
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { ExpenseTransaction, CreateExpenseTransactionInput, Account, Supplier } from '../../../server/src/schema';

interface ExpenseManagementProps {
  expenseTransactions: ExpenseTransaction[];
  setExpenseTransactions: React.Dispatch<React.SetStateAction<ExpenseTransaction[]>>;
  accounts: Account[];
  suppliers: Supplier[];
}

export function ExpenseManagement({ 
  expenseTransactions, 
  setExpenseTransactions, 
  accounts, 
  suppliers 
}: ExpenseManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<CreateExpenseTransactionInput>({
    description: '',
    amount: 0,
    date: new Date(),
    account_id: 0,
    supplier_id: null,
    reference: null
  });

  const filteredTransactions = expenseTransactions.filter((transaction: ExpenseTransaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createExpenseTransaction.mutate(formData);
      setExpenseTransactions((prev: ExpenseTransaction[]) => [...prev, response]);
      setFormData({
        description: '',
        amount: 0,
        date: new Date(),
        account_id: 0,
        supplier_id: null,
        reference: null
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create expense transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountName = (accountId: number) => {
    const account = accounts.find((a: Account) => a.id === accountId);
    return account ? `${account.code} - ${account.name}` : 'Unknown Account';
  };

  const getSupplierName = (supplierId: number | null) => {
    if (!supplierId) return null;
    const supplier = suppliers.find((s: Supplier) => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'posted': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const thisMonthExpenses = expenseTransactions
    .filter((t: ExpenseTransaction) => {
      const transactionDate = new Date(t.date);
      const now = new Date();
      return transactionDate.getMonth() === now.getMonth() && 
             transactionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, t: ExpenseTransaction) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">💸 Expense Management</h2>
          <p className="text-gray-600">Track and manage business expenses and operating costs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ New Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
              <DialogDescription>
                Add a new business expense transaction.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateExpenseTransactionInput) => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))
                  }
                  placeholder="Office supplies, utilities, etc."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (Rp) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateExpenseTransactionInput) => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateExpenseTransactionInput) => ({
                        ...prev,
                        date: new Date(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="account">Expense Account *</Label>
                <Select
                  value={formData.account_id ? formData.account_id.toString() : 'select_account'}
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateExpenseTransactionInput) => ({
                      ...prev,
                      account_id: value === 'select_account' ? 0 : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select_account" disabled>Select expense account</SelectItem>
                    {accounts.map((account: Account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Select
                  value={formData.supplier_id?.toString() || 'no_supplier'}
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateExpenseTransactionInput) => ({
                      ...prev,
                      supplier_id: value === 'no_supplier' ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_supplier">No supplier</SelectItem>
                    {suppliers.map((supplier: Supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={formData.reference || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateExpenseTransactionInput) => ({
                      ...prev,
                      reference: e.target.value || null
                    }))
                  }
                  placeholder="Receipt number, invoice, etc."
                />
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={isLoading || formData.account_id === 0}
                >
                  {isLoading ? 'Recording...' : 'Record Expense'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly Summary */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">This Month's Expenses</h3>
              <p className="text-sm text-gray-600">Total expenses recorded this month</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">
                Rp {thisMonthExpenses.toLocaleString('id-ID')}
              </div>
              <p className="text-sm text-gray-600">{expenseTransactions.length} total transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search by description or reference..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Expense Transactions */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">💸</div>
            <p className="text-gray-500">
              {searchTerm ? 'No expenses found matching your search.' : 'No expense transactions yet. Record one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((transaction: ExpenseTransaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{transaction.description}</CardTitle>
                    <CardDescription>
                      {getAccountName(transaction.account_id)} • 
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-red-600">
                      -Rp {transaction.amount.toLocaleString('id-ID')}
                    </div>
                    <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                      {transaction.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Supplier:</span>
                    <div className="font-medium">
                      {getSupplierName(transaction.supplier_id) || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Reference:</span>
                    <div className="font-medium">
                      {transaction.reference || 'Not specified'}
                    </div>
                  </div>
                </div>
                {transaction.reference && (
                  <div className="mt-2 text-xs text-gray-500">
                    Ref: {transaction.reference}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
