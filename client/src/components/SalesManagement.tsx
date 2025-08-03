
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import type { SalesTransaction, CreateSalesTransactionInput, Customer, Product } from '../../../server/src/schema';

interface SalesManagementProps {
  salesTransactions: SalesTransaction[];
  setSalesTransactions: React.Dispatch<React.SetStateAction<SalesTransaction[]>>;
  customers: Customer[];
  products: Product[];
}

interface SalesLineItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export function SalesManagement({ 
  salesTransactions, 
  setSalesTransactions, 
  customers, 
  products 
}: SalesManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<CreateSalesTransactionInput>({
    customer_id: 0,
    date: new Date(),
    due_date: null,
    items: [],
    tax_rate: 0.11
  });

  const [currentItem, setCurrentItem] = useState<SalesLineItem>({
    product_id: 0,
    quantity: 1,
    unit_price: 0
  });

  const filteredTransactions = salesTransactions.filter((transaction: SalesTransaction) =>
    transaction.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItemToSale = () => {
    if (currentItem.product_id && currentItem.quantity > 0 && currentItem.unit_price > 0) {
      setFormData((prev: CreateSalesTransactionInput) => ({
        ...prev,
        items: [...prev.items, { ...currentItem }]
      }));
      setCurrentItem({ product_id: 0, quantity: 1, unit_price: 0 });
    }
  };

  const removeItemFromSale = (index: number) => {
    setFormData((prev: CreateSalesTransactionInput) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p: Product) => p.id === parseInt(productId));
    if (product) {
      setCurrentItem((prev: SalesLineItem) => ({
        ...prev,
        product_id: product.id,
        unit_price: product.unit_price
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * formData.tax_rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.createSalesTransaction.mutate(formData);
      setSalesTransactions((prev: SalesTransaction[]) => [...prev, response]);
      setFormData({
        customer_id: 0,
        date: new Date(),
        due_date: null,
        items: [],
        tax_rate: 0.11
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create sales transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'posted': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">💰 Sales Management</h2>
          <p className="text-gray-600">Create and manage sales transactions and invoices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Sales Transaction</DialogTitle>
              <DialogDescription>
                Record a new sale with customer information and line items.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer and Date Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer *</Label>
                  <Select
                    value={formData.customer_id.toString()}
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateSalesTransactionInput) => ({
                        ...prev,
                        customer_id: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Sale Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSalesTransactionInput) => ({
                        ...prev,
                        date: new Date(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date?.toISOString().split('T')[0] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSalesTransactionInput) => ({
                        ...prev,
                        due_date: e.target.value ? new Date(e.target.value) : null
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    value={(formData.tax_rate * 100).toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSalesTransactionInput) => ({
                        ...prev,
                        tax_rate: parseFloat(e.target.value) / 100 || 0
                      }))
                    }
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Add Line Items */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Add Items</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Product</Label>
                    <Select
                      value={currentItem.product_id.toString()}
                      onValueChange={handleProductSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product: Product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - Rp {product.unit_price.toLocaleString('id-ID')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentItem((prev: SalesLineItem) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 0
                        }))
                      }
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Unit Price (Rp)</Label>
                    <Input
                      type="number"
                      value={currentItem.unit_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentItem((prev: SalesLineItem) => ({
                          ...prev,
                          unit_price: parseFloat(e.target.value) || 0
                        }))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addItemToSale}>
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {formData.items.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{getProductName(item.product_id)}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            Rp {item.unit_price.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItemFromSale(index)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Totals */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-end space-y-2">
                      <div className="text-right space-y-1">
                        <div className="flex justify-between w-48">
                          <span>Subtotal:</span>
                          <span>Rp {calculateSubtotal().toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between w-48">
                          <span>Tax ({(formData.tax_rate * 100).toFixed(1)}%):</span>
                          <span>Rp {calculateTax().toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between w-48 font-semibold text-lg border-t pt-1">
                          <span>Total:</span>
                          <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={isLoading || formData.items.length === 0 || formData.customer_id === 0}
                >
                  {isLoading ? 'Creating...' : 'Create Sale'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search by invoice number..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Sales Transactions */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">💰</div>
            <p className="text-gray-500">
              {searchTerm ? 'No sales found matching your search.' : 'No sales transactions yet. Create one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((transaction: SalesTransaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">#{transaction.invoice_number}</CardTitle>
                    <CardDescription>
                      {getCustomerName(transaction.customer_id)} • 
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">
                      Rp {transaction.total_amount.toLocaleString('id-ID')}
                    </div>
                    <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                      {transaction.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Subtotal:</span>
                    <div className="font-medium">Rp {transaction.subtotal.toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Tax:</span>
                    <div className="font-medium">Rp {transaction.tax_amount.toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <div className="font-medium">
                      {transaction.due_date 
                        ? new Date(transaction.due_date).toLocaleDateString('id-ID')
                        : 'Not set'
                      }
                    </div>
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
