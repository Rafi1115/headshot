"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { getJobStatus } from "@/lib/api/generation";

export default function SuccessPage() {
  const [mounted, setMounted] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("job_id");
    if (id) {
      setJobId(id);
      getJobStatus(Number(id))
        .then((data) => {
          setJobStatus(data.status);
          setPaymentStatus(data.payment_status);
        })
        .catch(() => {
          setJobStatus(null);
          setPaymentStatus(null);
        });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    // Trigger celebratory confetti on load
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 overflow-hidden relative">
      {/* Aesthetic Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] -z-10 animate-pulse" />

      <div className="relative w-full max-w-2xl text-center bg-card border border-border p-8 md:p-12 rounded-3xl shadow-2xl">
        {/* Animated Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Order <span className="text-accent">Confirmed!</span>
        </h1>
        <p className="mb-10 text-lg text-muted-foreground max-w-md mx-auto">
          Thank you for your purchase. Our AI systems are now training on your photos to generate your professional headshots.
          {jobId ? ` Job #${jobId}` : ""}
        </p>
        {paymentStatus && (
          <div className="mb-6 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
            Payment Status: <span className="font-semibold">{paymentStatus}</span>
            {paymentStatus !== "PAID" ? " — confirmation may take a moment." : ""}
          </div>
        )}

        {/* What Happens Next Section */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 text-left">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">AI Training</h3>
            <p className="text-sm text-muted-foreground">
              We're processing your photos to create a high-fidelity custom model of your face.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">Email Delivery</h3>
            <p className="text-sm text-muted-foreground">
              You will receive a download link at your email address within 10-20 minutes.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-6">
          <Link href="/" className="w-full sm:w-auto">
            <Button size="lg" className="h-12 w-full bg-accent px-10 font-medium text-accent-foreground hover:bg-accent/90 sm:w-auto rounded-xl">
              Back to Home
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>Secure Process</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>AI Optimized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
