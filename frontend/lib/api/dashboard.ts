import { TrafficPoint } from "@/types/traffic";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8009";

const mockTraffic: TrafficPoint[] = [
  { month: "Jan", value: 1100 },
  { month: "Feb", value: 1200 },
  { month: "Mar", value: 1500 },
  { month: "Apr", value: 2000 },
  { month: "May", value: 1700 },
  { month: "Jun", value: 1300 },
  { month: "Jul", value: 2100 },
  { month: "Aug", value: 1800 },
  { month: "Sep", value: 1600 },
  { month: "Oct", value: 2000 },
  { month: "Nov", value: 2900 },
  { month: "Dec", value: 3200 },
];

const mockPopularImages = [
  "https://www.figma.com/api/mcp/asset/27d85d2b-be0b-44ef-9ceb-7ba328753ed2",
  "https://www.figma.com/api/mcp/asset/3c5107ee-dc9a-41a9-aec9-0c0ab9b0c8c0",
  "https://www.figma.com/api/mcp/asset/513cba50-52d1-49ad-abb1-5a72f89022cd",
  "https://www.figma.com/api/mcp/asset/95d70fd1-f7e5-4fe9-9086-6845b2d7e762",
  "https://www.figma.com/api/mcp/asset/69351ca5-20bc-4aae-b3f8-50b109c3d266",
];

const mockStats = {
  totalViews: "100000",
  mediaUploads: "1600090",
  activeUsers: "12000000",
  totalCategories: "1200",
};

export async function fetchTrafficData(_year: string): Promise<TrafficPoint[]> {
  // In a real app, you would pass the year to your backend.
  return new Promise((resolve) => setTimeout(() => resolve([...mockTraffic]), 400));
}

export async function fetchPopularImages(): Promise<string[]> {
  return new Promise((resolve) => setTimeout(() => resolve([...mockPopularImages]), 400));
}

export async function fetchDashboardStats(): Promise<typeof mockStats> {
  const response = await fetch(`${API_BASE_URL}/admin-api/stats/`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to fetch stats");
  }

  return response.json();
}
