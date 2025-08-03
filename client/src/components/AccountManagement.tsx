
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Account, CreateAccountInput, AccountType } from '../../../server/src/schema';

interface AccountManagementProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}

export function AccountManagement({ accounts, setAccounts }: AccountManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [formData, setFormData] = useState<CreateAccountInput>({
    code: '',
    name: '',
    type: 'asset',
    parent_id: null
  });

  const filteredAccounts = accounts.filter((account: Account) => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || account.type === filterType;
    return matchesSearch && matchesType;
  });

  const activeAccounts = accounts.filter((a: Account) => a.is_active);
  const parentAccounts = activeAccounts.filter((a: Account) => a.parent_id === null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createAccount.mutate(formData);
      setAccounts((prev: Account[]) => [...prev, response]);
      setFormData({
        code: '',
        name: '',
        type: 'asset',
        parent_id: null
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case 'asset': return 'default';
      case 'liability': return 'destructive';
      case 'equity': return 'secondary';
      case 'revenue': return 'default';
      case 'expense': return 'outline';
      default: return 'outline';
    }
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'asset': return '🏦';
      case 'liability': return '💳';
      case 'equity': return '🏛️';
      case 'revenue': return '💰';
      case 'expense': return '💸';
      default: return '📄';
    }
  };

  const getParentAccountName = (parentId: number | null) => {
    if (!parentId) return null;
    const parent = accounts.find((a: Account) => a.id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">📚 Chart of Accounts</h2>
          <p className="text-gray-600">Manage your accounting structure and account codes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Create a new account in your chart of accounts.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Account Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateAccountInput) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="1000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Account Type *</Label>
                  <Select
                    value={formData.type || 'asset'}
                    onValueChange={(value: AccountType) =>
                      setFormData((prev: CreateAccountInput) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">🏦 Asset</SelectItem>
                      <SelectItem value="liability">💳 Liability</SelectItem>
                      <SelectItem value="equity">🏛️ Equity</SelectItem>
                      <SelectItem value="revenue">💰 Revenue</SelectItem>
                      <SelectItem value="expense">💸 Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateAccountInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Cash in Bank"
                  required
                />
              </div>

              <div>
                <Label htmlFor="parent">Parent Account</Label>
                <Select
                  value={formData.parent_id?.toString() || 'none'}
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateAccountInput) => ({
                      ...prev,
                      parent_id: value === 'none' ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent account</SelectItem>
                    {parentAccounts.map((account: Account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search accounts by name or code..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Select value={filterType} onValueChange={(value: AccountType | 'all') => setFilterType(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="asset">🏦 Assets</SelectItem>
            <SelectItem value="liability">💳 Liabilities</SelectItem>
            <SelectItem value="equity">🏛️ Equity</SelectItem>
            <SelectItem value="revenue">💰 Revenue</SelectItem>
            <SelectItem value="expense">💸 Expenses</SelectItem>
          </SelectContent>
        
        </Select>
      </div>

      {/* Account Type Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => {
          const typeAccounts = accounts.filter((a: Account) => a.type === type);
          return (
            <Card key={type} className="text-center">
              <CardContent className="pt-4">
                <div className="text-2xl mb-2">{getAccountTypeIcon(type as AccountType)}</div>
                <div className="text-lg font-semibold">{typeAccounts.length}</div>
                <div className="text-sm text-gray-600 capitalize">{type}s</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'No accounts found matching your criteria.' 
                : 'No accounts yet. Add one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAccounts.map((account: Account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-xl">
                      {getAccountTypeIcon(account.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{account.code}</h3>
                        <span className="text-gray-400">-</span>
                        <h3 className="font-semibold">{account.name}</h3>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getAccountTypeColor(account.type)} className="text-xs">
                          {account.type.toUpperCase()}
                        </Badge>
                        {account.parent_id && (
                          <span className="text-sm text-gray-500">
                            Parent: {getParentAccountName(account.parent_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={account.is_active ? 'default' : 'secondary'} className="text-xs">
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(account.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
