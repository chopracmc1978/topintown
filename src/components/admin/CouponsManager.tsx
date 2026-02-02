import { useState } from 'react';
import { Plus, Edit, Trash2, Tag, Percent, DollarSign, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  Coupon,
} from '@/hooks/useCoupons';
import { format } from 'date-fns';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const CouponsManager = () => {
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_order_amount: 0,
    max_discount_amount: '',
    usage_limit: '',
    is_active: true,
    show_on_homepage: false,
    expires_at: '',
    schedule_type: 'always' as 'always' | 'days_of_week' | 'dates_of_month',
    schedule_days: [] as number[],
    schedule_dates: [] as number[],
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_amount: 0,
      max_discount_amount: '',
      usage_limit: '',
      is_active: true,
      show_on_homepage: false,
      expires_at: '',
      schedule_type: 'always',
      schedule_days: [],
      schedule_dates: [],
    });
    setEditingCoupon(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount_amount: coupon.max_discount_amount?.toString() || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      is_active: coupon.is_active,
      show_on_homepage: coupon.show_on_homepage,
      expires_at: coupon.expires_at ? format(new Date(coupon.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      schedule_type: coupon.schedule_type || 'always',
      schedule_days: coupon.schedule_days || [],
      schedule_dates: coupon.schedule_dates || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      code: formData.code,
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_order_amount: formData.min_order_amount,
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      is_active: formData.is_active,
      show_on_homepage: formData.show_on_homepage,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      schedule_type: formData.schedule_type,
      schedule_days: formData.schedule_type === 'days_of_week' ? formData.schedule_days : null,
      schedule_dates: formData.schedule_type === 'dates_of_month' ? formData.schedule_dates : null,
    };

    if (editingCoupon) {
      await updateCoupon.mutateAsync({ id: editingCoupon.id, ...payload });
    } else {
      await createCoupon.mutateAsync(payload);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      await deleteCoupon.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading coupons...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Coupons & Promo Codes
        </CardTitle>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Coupon
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons?.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {coupon.discount_type === 'percentage' ? (
                      <>
                        <Percent className="w-3 h-3" />
                        {coupon.discount_value}%
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3 h-3" />
                        {coupon.discount_value.toFixed(2)}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>${coupon.min_order_amount.toFixed(2)}</TableCell>
                <TableCell>
                  {coupon.used_count}
                  {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                </TableCell>
                <TableCell>
                  {coupon.schedule_type === 'always' || !coupon.schedule_type ? (
                    <span className="text-muted-foreground text-sm">Always</span>
                  ) : coupon.schedule_type === 'days_of_week' ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {coupon.schedule_days?.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Dates: {coupon.schedule_dates?.join(', ')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {coupon.expires_at 
                    ? format(new Date(coupon.expires_at), 'MMM d, yyyy')
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(coupon)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(coupon.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!coupons || coupons.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No coupons created yet. Click "Add Coupon" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                placeholder="e.g. BEST13"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g. Summer special discount"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount_value">
                  {formData.discount_type === 'percentage' ? 'Percentage' : 'Amount'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="min_order">Min Order ($)</Label>
                <Input
                  id="min_order"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_discount">Max Discount ($)</Label>
                <Input
                  id="max_discount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="usage_limit">Usage Limit</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expires">Expires At</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>

            {/* Schedule Section */}
            <div className="grid gap-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </Label>
              <Select
                value={formData.schedule_type}
                onValueChange={(v) => setFormData({ 
                  ...formData, 
                  schedule_type: v as 'always' | 'days_of_week' | 'dates_of_month',
                  schedule_days: [],
                  schedule_dates: [],
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always Available</SelectItem>
                  <SelectItem value="days_of_week">Specific Days of Week</SelectItem>
                  <SelectItem value="dates_of_month">Specific Dates of Month</SelectItem>
                </SelectContent>
              </Select>

              {formData.schedule_type === 'days_of_week' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={formData.schedule_days.includes(day.value) ? 'default' : 'outline'}
                        onClick={() => {
                          const newDays = formData.schedule_days.includes(day.value)
                            ? formData.schedule_days.filter(d => d !== day.value)
                            : [...formData.schedule_days, day.value].sort((a, b) => a - b);
                          setFormData({ ...formData, schedule_days: newDays });
                        }}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, schedule_days: [1, 2, 3, 4, 5] })}
                    >
                      Mon-Fri
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, schedule_days: [0, 6] })}
                    >
                      Weekends
                    </Button>
                  </div>
                </div>
              )}

              {formData.schedule_type === 'dates_of_month' && (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                    <Button
                      key={date}
                      type="button"
                      size="sm"
                      variant={formData.schedule_dates.includes(date) ? 'default' : 'outline'}
                      className="w-8 h-8 p-0"
                      onClick={() => {
                        const newDates = formData.schedule_dates.includes(date)
                          ? formData.schedule_dates.filter(d => d !== date)
                          : [...formData.schedule_dates, date].sort((a, b) => a - b);
                        setFormData({ ...formData, schedule_dates: newDates });
                      }}
                    >
                      {date}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show_on_homepage">Show on Homepage</Label>
              <Switch
                id="show_on_homepage"
                checked={formData.show_on_homepage}
                onCheckedChange={(checked) => setFormData({ ...formData, show_on_homepage: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.code || formData.discount_value <= 0}
            >
              {editingCoupon ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CouponsManager;
