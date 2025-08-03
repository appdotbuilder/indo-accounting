
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Supplier, CreateSupplierInput } from '../../../server/src/schema';

interface SupplierManagementProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

export function SupplierManagement({ suppliers, setSuppliers }: SupplierManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '',
    email: null,
    phone: null,
    address: null,
    tax_id: null
  });

  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createSupplier.mutate(formData);
      setSuppliers((prev: Supplier[]) => [...prev, response]);
      setFormData({
        name: '',
        email: null,
        phone: null,
        address: null,
        tax_id: null
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create supplier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">🏢 Supplier Management</h2>
          <p className="text-gray-600">Manage your supplier network and vendor information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add Supplier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Add a new supplier to your vendor database.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSupplierInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Supplier company name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSupplierInput) => ({
                      ...prev,
                      email: e.target.value || null
                    }))
                  }
                  placeholder="supplier@company.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSupplierInput) => ({
                      ...prev,
                      phone: e.target.value || null
                    }))
                  }
                  placeholder="+62 21 1234 5678"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSupplierInput) => ({
                      ...prev,
                      address: e.target.value || null
                    }))
                  }
                  placeholder="Company address"
                />
              </div>

              <div>
                <Label htmlFor="tax_id">Tax ID / NPWP</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSupplierInput) => ({
                      ...prev,
                      tax_id: e.target.value || null
                    }))
                  }
                  placeholder="NPWP number"
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Supplier'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search suppliers by name or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">🏢</div>
            <p className="text-gray-500">
              {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers yet. Add one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier: Supplier) => (
            <Card key={supplier.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{supplier.name}</CardTitle>
                <CardDescription>
                  Partner since {new Date(supplier.created_at).toLocaleDateString('id-ID')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {supplier.email && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">📧</span>
                    <span className="text-sm">{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">📱</span>
                    <span className="text-sm">{supplier.phone}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start space-x-2">
                    <span className="text-sm text-gray-500 mt-0.5">📍</span>
                    <span className="text-sm">{supplier.address}</span>
                  </div>
                )}
                {supplier.tax_id && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">🏛️</span>
                    <span className="text-sm">NPWP: {supplier.tax_id}</span>
                  </div>
                )}
                {!supplier.email && !supplier.phone && !supplier.address && !supplier.tax_id && (
                  <p className="text-sm text-gray-500 italic">No additional contact information</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
