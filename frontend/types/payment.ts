export interface PaymentDetail {
  id: string;
  amount: number;
  date?: string;
}

export interface PaymentJob {
  job_id: number;
  email: string;
  status: string;
  created_at: string;
  payment_status: "PAID" | "UNPAID";
  total_paid_amount: number;
  successful_payments: PaymentDetail[];
  failed_payments: PaymentDetail[];
}

export interface PaymentDashboardData {
  total_jobs: number;
  paid_jobs: number;
  jobs: PaymentJob[];
}
