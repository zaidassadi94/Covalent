'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, Receipt, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const aging = data?.aging || {};
  const agingData = [
    { label: 'Current', value: aging.current || 0, color: '#10b981' },
    { label: '1-30 Days', value: aging['1-30'] || 0, color: '#f59e0b' },
    { label: '31-60 Days', value: aging['31-60'] || 0, color: '#f97316' },
    { label: '61-90 Days', value: aging['61-90'] || 0, color: '#ef4444' },
    { label: '90+ Days', value: aging['90+'] || 0, color: '#991b1b' },
  ];

  const totalAging = agingData.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your business at a glance" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Active Customers"
          value={String(data?.customerCount || 0)}
          icon={Users}
        />
        <StatCard
          title="Open Invoices"
          value={`${data?.invoicePaid || 0} paid of ${data?.invoiceTotal || 0}`}
          icon={Receipt}
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(data?.totalOutstanding || 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(data?.overdueAmount || 0)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAging > 0 ? (
              <>
                <div className="flex h-4 rounded-full overflow-hidden mb-6 bg-zinc-100">
                  {agingData.map((d, i) => (
                    d.value > 0 && (
                      <div
                        key={i}
                        className="transition-all duration-500"
                        style={{
                          width: `${(d.value / totalAging) * 100}%`,
                          backgroundColor: d.color,
                        }}
                      />
                    )
                  ))}
                </div>
                <div className="space-y-3">
                  {agingData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-sm text-zinc-600">{d.label}</span>
                      </div>
                      <span className="text-sm font-medium text-zinc-900">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <p className="text-sm">No outstanding invoices</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topCustomers?.length > 0 ? (
              <div className="space-y-3">
                {data.topCustomers.map((c: any, i: number) => {
                  const maxRevenue = data.topCustomers[0]?.revenue || 1;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-700 truncate max-w-[200px]">{c.name}</span>
                        <span className="text-sm font-medium text-zinc-900">{formatCurrency(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-900 transition-all duration-500"
                          style={{ width: `${(c.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <p className="text-sm">No revenue data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link href="/invoices" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data?.recentInvoices?.length > 0 ? (
              <div className="space-y-2">
                {data.recentInvoices.map((inv: any) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                        <Receipt className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{inv.invoice_number}</p>
                        <p className="text-xs text-zinc-500">{inv.customer_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{formatCurrency(inv.total_amount)}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant={
                          inv.status === 'paid' ? 'success' :
                          inv.status === 'partially_paid' ? 'warning' :
                          inv.status === 'cancelled' ? 'danger' : 'default'
                        }>
                          {inv.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-zinc-400">{formatDate(inv.invoice_date)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No invoices yet. Create your first invoice to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
