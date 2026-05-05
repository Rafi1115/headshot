// frontend/lib/api/generation.ts

const API_BASE_URL = ((globalThis as any).process?.env?.NEXT_PUBLIC_API_URL as string) || "http://72.62.248.97:8009";

export async function createJob(email: string): Promise<{ job_id: number }> {

  const response = await fetch(`${API_BASE_URL}/jobs/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create job");
  }

  return response.json();
}

// Helper to convert base64 to File
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error("Invalid data URL");
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function uploadImages(jobId: number, images: string[]): Promise<void> {
  const formData = new FormData();

  images.forEach((imgBase64, index) => {
    // Generate a unique filename for each uploaded image
    const file = dataURLtoFile(imgBase64, `upload_${index}.jpg`);
    formData.append("images", file);
  });

  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/upload/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload images");
  }
}

export async function getJobStatus(jobId: number): Promise<{
  id: number;
  status: string;
  payment_status: string;
  best_image: string | null;
  error: string | null;
  input_images: string[];
  output_images: string[];
}> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch job status");
  }

  return response.json();
}