
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Customer, CreateCustomerInput } from '../../../server/src/schema';

interface CustomerManagementProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export function CustomerManagement({ customers, setCustomers }: CustomerManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    email: null,
    phone: null,
    address: null,
    tax_id: null
  });

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createCustomer.mutate(formData);
      setCustomers((prev: Customer[]) => [...prev, response]);
      setFormData({
        name: '',
        email: null,
        phone: null,
        address: null,
        tax_id: null
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">👥 Customer Management</h2>
          <p className="text-gray-600">Manage your customer database and contact information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to your database.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Customer name"
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
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      email: e.target.value || null
                    }))
                  }
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      phone: e.target.value || null
                    }))
                  }
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      address: e.target.value || null
                    }))
                  }
                  placeholder="Full address"
                />
              </div>

              <div>
                <Label htmlFor="tax_id">Tax ID / NPWP</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCustomerInput) => ({
                      ...prev,
                      tax_id: e.target.value || null
                    }))
                  }
                  placeholder="NPWP number"
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="🔍 Search customers by name or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-500">
              {searchTerm ? 'No customers found matching your search.' : 'No customers yet. Add one above!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer: Customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{customer.name}</CardTitle>
                <CardDescription>
                  Customer since {new Date(customer.created_at).toLocaleDateString('id-ID')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.email && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">📧</span>
                    <span className="text-sm">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">📱</span>
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start space-x-2">
                    <span className="text-sm text-gray-500 mt-0.5">📍</span>
                    <span className="text-sm">{customer.address}</span>
                  </div>
                )}
                {customer.tax_id && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">🏛️</span>
                    <span className="text-sm">NPWP: {customer.tax_id}</span>
                  </div>
                )}
                {!customer.email && !customer.phone && !customer.address && !customer.tax_id && (
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
