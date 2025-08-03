
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
import type { PurchaseTransaction, CreatePurchaseTransactionInput, Supplier, Product } from '../../../server/src/schema';

interface PurchaseManagementProps {
  purchaseTransactions: PurchaseTransaction[];
  setPurchaseTransactions: React.Dispatch<React.SetStateAction<PurchaseTransaction[]>>;
  suppliers: Supplier[];
  products: Product[];
}

interface PurchaseLineItem {
  product_id: number;
  quantity: number;
  unit_cost: number;
}

export function PurchaseManagement({ 
  purchaseTransactions, 
  setPurchaseTransactions, 
  suppliers, 
  products 
}: PurchaseManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<CreatePurchaseTransactionInput>({
    supplier_id: 0,
    date: new Date(),
    due_date: null,
    invoice_number: '',
    items: [],
    tax_rate: 0.11
  });

  const [currentItem, setCurrentItem] = useState<PurchaseLineItem>({
    product_id: 0,
    quantity: 1,
    unit_cost: 0
  });

  const filteredTransactions = purchaseTransactions.filter((transaction: PurchaseTransaction) =>
    transaction.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItemToPurchase = () => {
    if (currentItem.product_id && currentItem.quantity > 0 && currentItem.unit_cost > 0) {
      setFormData((prev: CreatePurchaseTransactionInput) => ({
        ...prev,
        items: [...prev.items, { ...currentItem }]
      }));
      setCurrentItem({ product_id: 0, quantity: 1, unit_cost: 0 });
    }
  };

  const removeItemFromPurchase = (index: number) => {
    setFormData((prev: CreatePurchaseTransactionInput) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p: Product) => p.id === parseInt(productId));
    if (product) {
      setCurrentItem((prev: PurchaseLineItem) => ({
        ...prev,
        product_id: product.id,
        unit_cost: product.cost_price
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * formData.tax_rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0 || !formData.invoice_number) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.createPurchaseTransaction.mutate(formData);
      setPurchaseTransactions((prev: PurchaseTransaction[]) => [...prev, response]);
      setFormData({
        supplier_id: 0,
        date: new Date(),
        due_date: null,
        invoice_number: '',
        items: [],
        tax_rate: 0.11
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create purchase transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s: Supplier) => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
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
          <h2 className="text-3xl font-bold text-gray-900">🛒 Purchase Management</h2>
          <p className="text-gray-600">Record and manage purchase orders and supplier invoices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ New Purchase</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Transaction</DialogTitle>
              <DialogDescription>
                Record a new purchase from supplier with invoice details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier and Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={formData.supplier_id.toString()}
                    onValueChange={(value: string) =>
                      setFormData((prev: CreatePurchaseTransactionInput) => ({
                        ...prev,
                        supplier_id: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: Supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="invoice_number">Invoice Number *</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePurchaseTransactionInput) => ({
                        ...prev,
                        invoice_number: e.target.value
                      }))
                    }
                    placeholder="INV-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Purchase Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePurchaseTransactionInput) => ({
                        ...prev,
                        date: new Date(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date?.toISOString().split('T')[0] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePurchaseTransactionInput) => ({
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
                      setFormData((prev: CreatePurchaseTransactionInput) => ({
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
                            {product.name} - Rp {product.cost_price.toLocaleString('id-ID')}
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
                        setCurrentItem((prev: PurchaseLineItem) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 0
                        }))
                      }
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Unit Cost (Rp)</Label>
                    <Input
                      type="number"
                      value={currentItem.unit_cost}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentItem((prev: PurchaseLineItem) => ({
                          ...prev,
                          unit_cost: parseFloat(e.target.value) || 0
                        }))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addItemToPurchase}>
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
                        <TableHead className="text-right">Unit Cost</TableHead>
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
                            Rp {item.unit_cost.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {(item.quantity * item.unit_cost).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItemFromPurchase(index)}
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
                    <div className="flex justify-end">
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
                  disabled={isLoading || formData.items.length === 0 || formData.supplier_id === 0 || !formData.invoice_number}
                >
                  {isLoading ? 'Creating...' : 'Create Purchase'}
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

      {/* Purchase Transactions */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">🛒</div>
            <p className="text-gray-500">
              {searchTerm ? 'No purchases found matching your search.' : 'No purchase transactions yet. Create one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((transaction: PurchaseTransaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">#{transaction.invoice_number}</CardTitle>
                    <CardDescription>
                      {getSupplierName(transaction.supplier_id)} • 
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-red-600">
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
