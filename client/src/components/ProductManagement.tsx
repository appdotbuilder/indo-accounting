
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput } from '../../../server/src/schema';

interface ProductManagementProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export function ProductManagement({ products, setProducts }: ProductManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateProductInput>({
    sku: '',
    name: '',
    description: null,
    unit_price: 0,
    cost_price: 0,
    stock_quantity: 0,
    minimum_stock: 0,
    unit: ''
  });

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter((p: Product) => p.stock_quantity <= p.minimum_stock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createProduct.mutate(formData);
      setProducts((prev: Product[]) => [...prev, response]);
      setFormData({
        sku: '',
        name: '',
        description: null,
        unit_price: 0,
        cost_price: 0,
        stock_quantity: 0,
        minimum_stock: 0,
        unit: ''
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { status: 'Out of Stock', color: 'destructive' as const };
    if (product.stock_quantity <= product.minimum_stock) return { status: 'Low Stock', color: 'secondary' as const };
    return { status: 'In Stock', color: 'default' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">📦 Inventory Management</h2>
          <p className="text-gray-600">Manage your product inventory and stock levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product in your inventory system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, sku: e.target.value }))
                    }
                    placeholder="PROD001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="pcs, kg, liter"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Product name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateProductInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  placeholder="Product description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit_price">Unit Price (Rp)</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    value={formData.unit_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ 
                        ...prev, 
                        unit_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost_price">Cost Price (Rp)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    value={formData.cost_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ 
                        ...prev, 
                        cost_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ 
                        ...prev, 
                        stock_quantity: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimum_stock">Minimum Stock</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ 
                        ...prev, 
                        minimum_stock: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="0"
                    required
                  />
                </div>
              
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Product'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert>
          <AlertDescription>
            ⚠️ {lowStockProducts.length} product(s) are running low on stock. 
            Consider restocking: {lowStockProducts.slice(0, 3).map((p: Product) => p.name).join(', ')}
            {lowStockProducts.length > 3 && ` and ${lowStockProducts.length - 3} more`}.
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search products by name or SKU..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-500">
              {searchTerm ? 'No products found matching your search.' : 'No products yet. Add one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: Product) => {
            const stockStatus = getStockStatus(product);
            const profitMargin = ((product.unit_price - product.cost_price) / product.unit_price * 100);
            
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription className="text-sm">SKU: {product.sku}</CardDescription>
                    </div>
                    <Badge variant={stockStatus.color} className="text-xs">
                      {stockStatus.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Unit Price</p>
                      <p className="font-semibold text-green-600">
                        Rp {product.unit_price.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cost Price</p>
                      <p className="font-semibold">
                        Rp {product.cost_price.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Stock</p>
                      <p className="font-semibold">
                        {product.stock_quantity} {product.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Min. Stock</p>
                      <p className="font-semibold">
                        {product.minimum_stock} {product.unit}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Profit Margin</span>
                      <span className={`font-semibold ${profitMargin > 20 ? 'text-green-600' : 'text-orange-600'}`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                      <span>Added: {new Date(product.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
