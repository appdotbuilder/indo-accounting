
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { JournalEntry, CreateJournalEntryInput, Account, TransactionType } from '../../../server/src/schema';

interface JournalManagementProps {
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  accounts: Account[];
}

interface JournalLineInput {
  account_id: number;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
}

export function JournalManagement({ journalEntries, setJournalEntries, accounts }: JournalManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<CreateJournalEntryInput>({
    date: new Date(),
    description: '',
    reference: null,
    transaction_type: 'manual',
    lines: []
  });

  const [currentLine, setCurrentLine] = useState<JournalLineInput>({
    account_id: 0,
    debit_amount: 0,
    credit_amount: 0,
    description: null
  });

  const filteredEntries = journalEntries.filter((entry: JournalEntry) =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addLineToEntry = () => {
    if (currentLine.account_id && (currentLine.debit_amount > 0 || currentLine.credit_amount > 0)) {
      // Ensure only one of debit or credit is set
      const line = {
        ...currentLine,
        debit_amount: currentLine.debit_amount > 0 ? currentLine.debit_amount : 0,
        credit_amount: currentLine.credit_amount > 0 ? currentLine.credit_amount : 0
      };
      
      setFormData((prev: CreateJournalEntryInput) => ({
        ...prev,
        lines: [...prev.lines, line]
      }));
      
      setCurrentLine({
        account_id: 0,
        debit_amount: 0,
        credit_amount: 0,
        description: null
      });
    }
  };

  const removeLineFromEntry = (index: number) => {
    setFormData((prev: CreateJournalEntryInput) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalDebits = () => {
    return formData.lines.reduce((sum, line) => sum + line.debit_amount, 0);
  };

  const calculateTotalCredits = () => {
    return formData.lines.reduce((sum, line) => sum + line.credit_amount, 0);
  };

  const isBalanced = () => {
    const debits = calculateTotalDebits();
    const credits = calculateTotalCredits();
    return Math.abs(debits - credits) < 0.01; // Allow for small rounding differences
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.lines.length < 2 || !isBalanced()) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.createJournalEntry.mutate(formData);
      setJournalEntries((prev: JournalEntry[]) => [...prev, response]);
      setFormData({
        date: new Date(),
        description: '',
        reference: null,
        transaction_type: 'manual',
        lines: []
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create journal entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountName = (accountId: number) => {
    const account = accounts.find((a: Account) => a.id === accountId);
    return account ? `${account.code} - ${account.name}` : 'Unknown Account';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'posted': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'sale': return '💰';
      case 'purchase': return '🛒';
      case 'expense': return '💸';
      case 'manual': return '✏️';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">📋 Journal Entries</h2>
          <p className="text-gray-600">Manual journal entries and transaction records</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ New Journal Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Journal Entry</DialogTitle>
              <DialogDescription>
                Create a manual journal entry with debits and credits that must balance.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Entry Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateJournalEntryInput) => ({
                        ...prev,
                        date: new Date(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="transaction_type">Transaction Type</Label>
                  <Select
                    value={formData.transaction_type || 'manual'}
                    onValueChange={(value: TransactionType) =>
                      setFormData((prev: CreateJournalEntryInput) => ({
                        ...prev,
                        transaction_type: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">✏️ Manual Entry</SelectItem>
                      <SelectItem value="sale">💰 Sale Adjustment</SelectItem>
                      <SelectItem value="purchase">🛒 Purchase Adjustment</SelectItem>
                      <SelectItem value="expense">💸 Expense Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateJournalEntryInput) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  placeholder="Describe the purpose of this journal entry"
                  required
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={formData.reference || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateJournalEntryInput) => ({
                      ...prev,
                      reference: e.target.value || null
                    }))
                  }
                  placeholder="Invoice number, document reference, etc."
                />
              </div>

              {/* Add Journal Lines */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Add Journal Lines</h3>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label>Account</Label>
                    <Select
                      value={currentLine.account_id ? currentLine.account_id.toString() : 'select_account'}
                      onValueChange={(value: string) =>
                        setCurrentLine((prev: JournalLineInput) => ({
                          ...prev,
                          account_id: value === 'select_account' ? 0 : parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select_account" disabled>Select account</SelectItem>
                        {accounts.map((account: Account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Debit (Rp)</Label>
                    <Input
                      type="number"
                      value={currentLine.debit_amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentLine((prev: JournalLineInput) => ({
                          ...prev,
                          debit_amount: parseFloat(e.target.value) || 0,
                          credit_amount: 0 // Clear credit when entering debit
                        }))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Credit (Rp)</Label>
                    <Input
                      type="number"
                      value={currentLine.credit_amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentLine((prev: JournalLineInput) => ({
                          ...prev,
                          credit_amount: parseFloat(e.target.value) || 0,
                          debit_amount: 0 // Clear debit when entering credit
                        }))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={currentLine.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentLine((prev: JournalLineInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      placeholder="Line description"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addLineToEntry}>
                      Add Line
                    </Button>
                  </div>
                </div>
              </div>

              {/* Journal Lines Table */}
              {formData.lines.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>{getAccountName(line.account_id)}</TableCell>
                          <TableCell>{line.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            {line.debit_amount > 0 ? `Rp ${line.debit_amount.toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.credit_amount > 0 ? `Rp ${line.credit_amount.toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeLineFromEntry(index)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Totals and Balance Check */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-end">
                      <div className="text-right space-y-1">
                        <div className="flex justify-between w-64">
                          <span>Total Debits:</span>
                          <span>Rp {calculateTotalDebits().toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between w-64">
                          <span>Total Credits:</span>
                          <span>Rp {calculateTotalCredits().toLocaleString('id-ID')}</span>
                        </div>
                        <div className={`flex justify-between w-64 font-semibold border-t pt-1 ${
                          isBalanced() ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <span>Difference:</span>
                          <span>Rp {Math.abs(calculateTotalDebits() - calculateTotalCredits()).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    {!isBalanced() && formData.lines.length >= 2 && (
                      <Alert className="mt-4">
                        <AlertDescription>
                          ⚠️ Journal entry is not balanced. Debits must equal credits.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={isLoading || formData.lines.length < 2 || !isBalanced()}
                >
                  {isLoading ? 'Creating...' : 'Create Journal Entry'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search by description, entry number, or reference..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Journal Entries */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500">
              {searchTerm ? 'No journal entries found matching your search.' : 'No journal entries yet. Create one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map((entry: JournalEntry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">
                      {getTransactionTypeIcon(entry.transaction_type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">#{entry.entry_number}</CardTitle>
                      <CardDescription>
                        {new Date(entry.date).toLocaleDateString('id-ID')} • 
                        {entry.transaction_type.charAt(0).toUpperCase() + entry.transaction_type.slice(1)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(entry.status)} className="text-xs">
                    {entry.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{entry.description}</p>
                {entry.reference && (
                  <p className="text-xs text-gray-500 mb-2">Reference: {entry.reference}</p>
                )}
                <div className="text-xs text-gray-500">
                  Created: {new Date(entry.created_at).toLocaleDateString('id-ID')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
