"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { fetchPaymentDashboard } from "@/lib/api/payments";
import type { PaymentDashboardData, PaymentJob } from "@/types/payment";

function statusBadge(status: string) {
  const isPaid = status === "PAID";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default function PaymentsPage() {
  const [dashboard, setDashboard] = useState<PaymentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchPaymentDashboard();
        setDashboard(data);
      } catch (err) {
        console.error("Failed to load payment dashboard", err);
        setError(err instanceof Error ? err.message : "Failed to load payment dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredJobs = useMemo(() => {
    if (!dashboard) return [];
    const query = searchQuery.toLowerCase();
    return dashboard.jobs.filter((job) =>
      String(job.job_id).includes(query) ||
      job.email.toLowerCase().includes(query) ||
      job.payment_status.toLowerCase().includes(query) ||
      job.status.toLowerCase().includes(query)
    );
  }, [dashboard, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-semibold">{error}</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <section className="w-full space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Payments</h1>
        <p className="dashboard-page-subtitle">Review payment history and status across all jobs.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="dashboard-card rounded-[20px] border border-border bg-background p-6 shadow-[0px_12px_40px_-16px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{dashboard.total_jobs}</p>
        </div>
        <div className="dashboard-card rounded-[20px] border border-border bg-background p-6 shadow-[0px_12px_40px_-16px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-muted-foreground">Paid Jobs</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{dashboard.paid_jobs}</p>
        </div>
        <div className="dashboard-card rounded-[20px] border border-border bg-background p-6 shadow-[0px_12px_40px_-16px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">${dashboard.jobs.reduce((sum, job) => sum + job.total_paid_amount, 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Input
            type="search"
            placeholder="Search payments by job, email, or status..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-background shadow-[0px_12px_40px_-16px_rgba(0,0,0,0.2)]">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border border-border px-4 py-3">Job ID</th>
                <th className="border border-border px-4 py-3">Email</th>
                <th className="border border-border px-4 py-3">Job Status</th>
                <th className="border border-border px-4 py-3">Payment</th>
                <th className="border border-border px-4 py-3">Amount</th>
                <th className="border border-border px-4 py-3">Created</th>
                <th className="border border-border px-4 py-3">Success Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.job_id} className="even:bg-slate-50">
                  <td className="border border-border px-4 py-3 font-medium text-foreground">#{job.job_id}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{job.email}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground capitalize">{job.status}</td>
                  <td className="border border-border px-4 py-3">{statusBadge(job.payment_status)}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">${job.total_paid_amount.toFixed(2)}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{job.created_at}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{job.successful_payments.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 p-4 md:hidden">
          {filteredJobs.map((job) => (
            <article key={`mobile-${job.job_id}`} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">Job #{job.job_id}</p>
                  {statusBadge(job.payment_status)}
                </div>
                <p className="text-sm text-muted-foreground">{job.email}</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    <span className="block text-[12px] uppercase tracking-[0.1em]">Status</span>
                    <span>{job.status}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] uppercase tracking-[0.1em]">Amount</span>
                    <span>${job.total_paid_amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] uppercase tracking-[0.1em]">Created</span>
                    <span>{job.created_at}</span>
                  </div>
                  <div>
                    <span className="block text-[12px] uppercase tracking-[0.1em]">Successes</span>
                    <span>{job.successful_payments.length}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
