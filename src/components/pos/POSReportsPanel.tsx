import { useState, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { X, Calendar, DollarSign, ShoppingBag, TrendingUp, TrendingDown, CreditCard, Clock, XCircle, Store, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSReports } from '@/hooks/usePOSReports';
import { cn } from '@/lib/utils';

interface POSReportsPanelProps {
  locationId: string;
  onClose: () => void;
  embedded?: boolean;
}

export const POSReportsPanel = ({ locationId, onClose, embedded = false }: POSReportsPanelProps) => {
  const {
    loading,
    fetchDailySales,
    fetchCategorySales,
    fetchProductSales,
    fetchHourlySales,
    fetchPaymentTypes,
    fetchOrderSources,
    fetchCancelledOrders,
    fetchStaffSales,
  } = usePOSReports(locationId);

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState('daily');
  
  // Report data states
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<{ best: any[]; worst: any[] }>({ best: [], worst: [] });
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [orderSources, setOrderSources] = useState<any[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<{ orders: any[]; count: number; totalLost: number }>({ orders: [], count: 0, totalLost: 0 });
  const [staffSales, setStaffSales] = useState<any[]>([]);

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return { start: today, end: today };
      case 'week':
        return { start: subDays(today, 7), end: today };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: today, end: today };
    }
  };

  // Fetch data when tab or date range changes
  useEffect(() => {
    const { start, end } = getDateRange();
    
    const loadData = async () => {
      switch (activeTab) {
        case 'daily':
          setDailySales(await fetchDailySales(start, end));
          break;
        case 'category':
          setCategorySales(await fetchCategorySales(start, end));
          break;
        case 'products':
          setProductSales(await fetchProductSales(start, end));
          break;
        case 'hourly':
          setHourlySales(await fetchHourlySales(start, end));
          break;
        case 'payment':
          setPaymentTypes(await fetchPaymentTypes(start, end));
          break;
        case 'sources':
          setOrderSources(await fetchOrderSources(start, end));
          break;
        case 'cancelled':
          setCancelledOrders(await fetchCancelledOrders(start, end));
          break;
        case 'staff':
          setStaffSales(await fetchStaffSales(start, end));
          break;
      }
    };

    loadData();
  }, [activeTab, dateRange]);

  const reportButtons = [
    { id: 'daily', label: 'Daily/Monthly', icon: Calendar },
    { id: 'category', label: 'Category Wise', icon: ShoppingBag },
    { id: 'products', label: 'Best/Worst Selling', icon: TrendingUp },
    { id: 'hourly', label: 'Hourly', icon: Clock },
    { id: 'payment', label: 'Payment Type', icon: CreditCard },
    { id: 'sources', label: 'Walk-in/Web/App', icon: Store },
    { id: 'cancelled', label: 'Cancelled Orders', icon: XCircle },
    { id: 'staff', label: 'Staff Performance', icon: Users },
  ];

  // Embedded mode renders just the content without the full-screen wrapper
  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Date Range Selector */}
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Reports</h3>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {reportButtons.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveTab(report.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-colors",
                activeTab === report.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <report.icon className="w-3 h-3" />
              {report.label}
            </button>
          ))}
        </div>

        {/* Report Content - render the same content as below but without full-screen layout */}
        <div className="min-h-[400px]">
          {renderReportContent()}
        </div>
      </div>
    );
  }

  // Helper function to render report content
  function renderReportContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }

    return (
      <>
        {activeTab === 'daily' && renderDailyReport()}
        {activeTab === 'category' && renderCategoryReport()}
        {activeTab === 'products' && renderProductsReport()}
        {activeTab === 'hourly' && renderHourlyReport()}
        {activeTab === 'payment' && renderPaymentReport()}
        {activeTab === 'sources' && renderSourcesReport()}
        {activeTab === 'cancelled' && renderCancelledReport()}
        {activeTab === 'staff' && renderStaffReport()}
      </>
    );
  }

  function renderDailyReport() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Daily Sales Report</h2>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Sales</div>
              <div className="text-2xl font-bold text-primary">
                ${dailySales.reduce((sum, d) => sum + d.totalSales, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Orders</div>
              <div className="text-2xl font-bold">
                {dailySales.reduce((sum, d) => sum + d.orderCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Avg Ticket</div>
              <div className="text-2xl font-bold">
                ${(dailySales.reduce((sum, d) => sum + d.totalSales, 0) / Math.max(dailySales.reduce((sum, d) => sum + d.orderCount, 0), 1)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Cash Sales</div>
              <div className="text-2xl font-bold text-green-600">
                ${dailySales.reduce((sum, d) => sum + d.cashSales, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Orders</th>
                  <th className="text-right py-2">Cash</th>
                  <th className="text-right py-2">Card</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Avg</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.map((day) => (
                  <tr key={day.date} className="border-b">
                    <td className="py-2">{format(new Date(day.date), 'MMM dd, yyyy')}</td>
                    <td className="text-right py-2">{day.orderCount}</td>
                    <td className="text-right py-2 text-green-600">${day.cashSales.toFixed(2)}</td>
                    <td className="text-right py-2 text-blue-600">${day.cardSales.toFixed(2)}</td>
                    <td className="text-right py-2 font-semibold">${day.totalSales.toFixed(2)}</td>
                    <td className="text-right py-2">${day.avgTicket.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dailySales.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No sales data for this period</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderCategoryReport() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Category Wise Sales</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {categorySales.map((cat) => (
            <Card key={cat.category}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{cat.category}</div>
                    <div className="text-sm text-muted-foreground">{cat.orderCount} items sold</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">${cat.totalSales.toFixed(2)}</div>
                    <div className="text-sm text-primary">{cat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${cat.percentage}%` }} 
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {categorySales.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No category data for this period</div>
        )}
      </div>
    );
  }

  function renderProductsReport() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Best Selling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                Best Selling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productSales.best.map((product, idx) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{product.quantity} sold</div>
                      <div className="text-sm text-muted-foreground">${product.totalSales.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {productSales.best.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Worst Selling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrendingDown className="w-5 h-5" />
                Lowest Selling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productSales.worst.map((product, idx) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{product.quantity} sold</div>
                      <div className="text-sm text-muted-foreground">${product.totalSales.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {productSales.worst.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderHourlyReport() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Hourly Sales</h2>
        
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-6 gap-2">
              {hourlySales.filter(h => h.hour >= 10 && h.hour <= 23).map((hour) => (
                <div key={hour.hour} className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">
                    {hour.hour === 0 ? '12 AM' : hour.hour === 12 ? '12 PM' : hour.hour > 12 ? `${hour.hour - 12} PM` : `${hour.hour} AM`}
                  </div>
                  <div className="font-bold text-primary">${hour.totalSales.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">{hour.orderCount} orders</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Peak hours summary */}
        <div className="grid grid-cols-3 gap-4">
          {(() => {
            const sorted = [...hourlySales].sort((a, b) => b.totalSales - a.totalSales);
            const peak = sorted[0];
            const total = hourlySales.reduce((sum, h) => sum + h.totalSales, 0);
            const avgPerHour = total / 14;
            
            return (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Peak Hour</div>
                    <div className="text-xl font-bold">
                      {peak ? (peak.hour === 0 ? '12 AM' : peak.hour === 12 ? '12 PM' : peak.hour > 12 ? `${peak.hour - 12} PM` : `${peak.hour} AM`) : '-'}
                    </div>
                    <div className="text-sm text-primary">${peak?.totalSales.toFixed(2) || '0.00'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Hourly Sales</div>
                    <div className="text-xl font-bold">${total.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Avg Per Hour</div>
                    <div className="text-xl font-bold">${avgPerHour.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  function renderPaymentReport() {
    const totalPayments = paymentTypes.reduce((sum, p) => sum + p.totalSales, 0);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Payment Type Breakdown</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {paymentTypes.map((payment) => (
            <Card key={payment.paymentMethod}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    payment.paymentMethod === 'cash' ? "bg-green-100" : "bg-blue-100"
                  )}>
                    <CreditCard className={cn(
                      "w-6 h-6",
                      payment.paymentMethod === 'cash' ? "text-green-600" : "text-blue-600"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">{payment.paymentMethod}</div>
                    <div className="text-sm text-muted-foreground">{payment.orderCount} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">${payment.totalSales.toFixed(2)}</div>
                    <div className="text-sm text-primary">
                      {totalPayments > 0 ? ((payment.totalSales / totalPayments) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {paymentTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No payment data for this period</div>
        )}
      </div>
    );
  }

  function renderSourcesReport() {
    const totalOrders = orderSources.reduce((sum, s) => sum + s.orderCount, 0);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Order Source Distribution</h2>
        
        <div className="grid grid-cols-3 gap-4">
          {orderSources.map((source) => (
            <Card key={source.source}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Store className="w-8 h-8 text-primary" />
                  </div>
                  <div className="font-medium capitalize">{source.source}</div>
                  <div className="text-2xl font-bold text-primary">{source.orderCount}</div>
                  <div className="text-sm text-muted-foreground">
                    {totalOrders > 0 ? ((source.orderCount / totalOrders) * 100).toFixed(1) : 0}% of orders
                  </div>
                  <div className="text-sm font-medium mt-1">${source.totalSales.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {orderSources.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No order source data for this period</div>
        )}
      </div>
    );
  }

  function renderCancelledReport() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cancelled Orders</h2>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cancelled Orders</div>
                  <div className="text-2xl font-bold text-red-600">{cancelledOrders.count}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Revenue Lost</div>
                  <div className="text-2xl font-bold text-red-600">${cancelledOrders.totalLost.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cancelled orders list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cancelled Orders List</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Order #</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cancelledOrders.orders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="py-2">{order.orderNumber}</td>
                    <td className="py-2">{order.customerName || 'Walk-in'}</td>
                    <td className="py-2">{format(new Date(order.createdAt), 'MMM dd, h:mm a')}</td>
                    <td className="text-right py-2 text-red-600">${order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cancelledOrders.orders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No cancelled orders for this period</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderStaffReport() {
    const totalSales = staffSales.reduce((sum, s) => sum + s.totalSales, 0);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Staff Performance</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Active Staff</div>
              <div className="text-2xl font-bold">{staffSales.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Orders</div>
              <div className="text-2xl font-bold">
                {staffSales.reduce((sum, s) => sum + s.orderCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Sales</div>
              <div className="text-2xl font-bold text-primary">
                ${totalSales.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff breakdown */}
        <div className="space-y-4">
          {staffSales.map((staff) => (
            <Card key={staff.staffId}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-base">{staff.staffName}</div>
                      <div className="text-xs text-muted-foreground capitalize">{staff.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">${staff.totalSales.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {totalSales > 0 ? ((staff.totalSales / totalSales) * 100).toFixed(1) : 0}% of total
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Orders</div>
                    <div className="font-bold">{staff.orderCount}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Avg Ticket</div>
                    <div className="font-bold">${staff.avgTicket.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Cash</div>
                    <div className="font-bold">${staff.cashSales.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Card</div>
                    <div className="font-bold">${staff.cardSales.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Hours</div>
                    <div className="font-bold">{staff.totalHours.toFixed(1)}h</div>
                  </div>
                </div>

                {/* Sales per hour metric */}
                {staff.totalHours > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    Sales per hour: <span className="font-semibold text-foreground">${(staff.totalSales / staff.totalHours).toFixed(2)}/hr</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {staffSales.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No staff members configured for this location. Add staff in Settings → Staff tab.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-3 px-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="font-serif text-xl font-bold">Reports</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Report Types */}
        <div className="w-64 border-r border-border p-4 bg-secondary/20">
          <div className="space-y-2">
            {reportButtons.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveTab(report.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-colors",
                  activeTab === report.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  activeTab === report.id
                    ? "bg-primary-foreground/20"
                    : "bg-orange-500 text-white"
                )}>
                  <report.icon className="w-4 h-4" />
                </div>
                {report.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1 p-6">
          {renderReportContent()}
        </ScrollArea>
      </div>
    </div>
  );
};
