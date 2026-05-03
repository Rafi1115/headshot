import { Job } from "@/types/job";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8009";

export async function fetchJobs(): Promise<Job[]> {

  const response = await fetch(`${API_BASE_URL}/admin-api/jobs/`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to fetch jobs");
  }

  const data = await response.json();

  return data.map((job: any) => ({
    id: String(job.id),
    email: job.email,
    status: job.status.toLowerCase() as any,
    payment: job.payment_status === "PAID" ? "paid" : "unpaid",
    created: job.created,
    inputImages: job.input_images || [],
    selectedImage: job.selected_image || null,
    outputImage: job.output_image || null,
    error: job.error_message || null,
  }));
}

export async function retryJob(jobId: string): Promise<Job> {
  function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()!.split(";").shift() ?? "";
    return "";
  }

  const response = await fetch(`${API_BASE_URL}/admin-api/jobs/${jobId}/retry/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to retry job");
  }

  // Fetch the updated job details to return a full Job object
  const detailResponse = await fetch(`${API_BASE_URL}/admin-api/jobs/${jobId}/`, {
    credentials: "include",
  });

  if (!detailResponse.ok) {
    const job = await response.json();
    return {
      id: String(job.id),
      email: job.email,
      status: job.status.toLowerCase() as any,
      payment: job.payment_status === "PAID" ? "paid" : "unpaid",
      created: job.created,
      inputImages: [],
      selectedImage: null,
      outputImage: null,
      error: null,
    };
  }

  const detailData = await detailResponse.json();

  return {
    id: String(detailData.id),
    email: detailData.email,
    status: detailData.status.toLowerCase() as any,
    payment: detailData.payment_status === "PAID" ? "paid" : "unpaid",
    created: detailData.created,
    inputImages: detailData.input_images || [],
    selectedImage: detailData.selected_image || null,
    outputImage: detailData.output_image || null,
    error: detailData.error_message || null,
  };
}

