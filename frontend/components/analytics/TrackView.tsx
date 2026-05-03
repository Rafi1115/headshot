"use client";

import { useEffect } from "react";

export default function TrackView() {
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8009";
    fetch(`${API_BASE_URL}/jobs/record-view/`, { 
      method: "POST",
      mode: "cors"
    })
      .catch((err) => console.error("Failed to track view", err));
  }, []);

  return null;
}
