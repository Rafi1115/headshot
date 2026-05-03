import { PaymentDashboardData } from "../../types/payment";

const API_BASE_URL = ((globalThis as any).process?.env?.NEXT_PUBLIC_API_URL as string) || "http://localhost:8006";

export async function fetchPaymentDashboard(): Promise<PaymentDashboardData> {
  const response = await fetch(`${API_BASE_URL}/payments/dashboard/`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to fetch payment dashboard data");
  }

  return response.json();
}

export async function createCheckoutSession(jobId: number): Promise<{ checkout_url: string; session_id: string }> {
  const response = await fetch(`${API_BASE_URL}/payments/${jobId}/checkout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to create checkout session");
  }

  return response.json();
}
