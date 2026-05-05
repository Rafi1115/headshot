/**
 * Hero Component
 *
 * This is the main hero section for the landing page.
 *
 * Features:
 * - Headline, subheadline, and trust indicators
 * - Animated CTA button (pulse on click)
 * - Right column with drag-and-drop image upload and preview
 * - Upload area supports drag-and-drop and manual file selection
 * - Responsive layout for desktop and mobile
 * - Floating before/after headshot preview cards
 * - feat: v16.0.0 - Validation polling before payment. If images fail validation,
 *   user sees exact error and can re-upload. No payment = no money lost.
 *
 * Usage:
 * Place this component at the top of your main page to provide users with a welcoming introduction and an easy way to upload their photos for AI headshot transformation.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Upload, Shield, ArrowRight, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createJob, uploadImages, getJobStatus } from "@/lib/api/generation";
import { createCheckoutSession } from "@/lib/api/payments";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address.");

// Maps raw validator messages to user-friendly text
function friendlyValidationError(raw: string): string {
  if (!raw) return "Your photos didn't pass validation. Please upload clearer photos.";
  const lower = raw.toLowerCase();
  if (lower.includes("no face detected"))
    return "No face detected in your photo. Please upload a clear photo with your face visible.";
  if (lower.includes("multiple faces"))
    return "Multiple faces detected. Please upload a photo with only you in it.";
  if (lower.includes("blurry"))
    return "Your photo is too blurry. Please upload a sharper, clearer photo.";
  if (lower.includes("too small"))
    return "Your photo resolution is too low. Please upload a higher quality photo.";
  if (lower.includes("image too small"))
    return "Image dimensions are too small (min 100x100). Please use a larger photo.";
  return raw.replace("Validation failed: ", "").replace("validation failed: ", "");
}

export default function Hero() {
  const [isDragging, setIsDragging] = useState(false);
  const [headshotBtn, setHeadshotBtn] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<"uploading" | "validating" | "redirecting">("uploading");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCancelUpload = () => {
    setImages([]);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleGenerateAIHeadshot = () => {
    setShowEmailModal(true);
  };

  const submitJob = async () => {
    if (!email) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    const validationResult = emailSchema.safeParse(email);
    if (!validationResult.success) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // Step 1 — Create Job
      setGeneratingStep("uploading");
      const { job_id } = await createJob(email);

      // Step 2 — Upload Images
      await uploadImages(job_id, images);

      // Step 3 — Poll for validation result (max 60s, every 2s)
      setGeneratingStep("validating");
      let validated = false;

      for (let i = 0; i < 30; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const statusData = await getJobStatus(job_id);

        // Validation passed — best_image is set
        if (statusData.best_image) {
          validated = true;
          break;
        }

        // Validation explicitly failed
        if (statusData.status === "FAILED") {
          const raw = (statusData as any).error || "";
          setErrorMessage(friendlyValidationError(raw));
          setIsGenerating(false);
          return;
        }
      }

      if (!validated) {
        setErrorMessage("Validation timed out. Please try again with a clearer photo.");
        setIsGenerating(false);
        return;
      }

      // Step 4 — Redirect to Stripe
      setGeneratingStep("redirecting");
      const checkout = await createCheckoutSession(job_id);
      window.location.href = checkout.checkout_url;

    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while processing your request.");
      setIsGenerating(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  function handleFiles(files: File[]) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 10 * 1024 * 1024;

    const validFiles = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage(`"${file.name}" is not supported. Please upload JPG or PNG only.`);
        return false;
      }
      if (file.size > maxSize) {
        setErrorMessage(`"${file.name}" is too large. Max file size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const readers = validFiles.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((imgs) => {
      setImages((prev) => [...prev, ...imgs]);
    });
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) handleFiles(files);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleHeadshotClick = () => {
    setHeadshotBtn(!headshotBtn);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
  };

  // Label shown on the spinner button based on current step
  const generatingLabel = {
    uploading: "Uploading photos...",
    validating: "Checking your photos...",
    redirecting: "Redirecting to payment...",
  }[generatingStep];

  return (
    <section className="relative min-h-screen overflow-hidden bg-transparent pt-28 pb-20 lg:pt-32">
      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              Trusted by professionals worldwide
            </div>

            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance leading-[1.1]">
              Professional Headshots.{" "}
              <span className="text-gradient">Instantly.</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground text-pretty max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Transform any photo into studio-quality professional portraits with AI.
              No photoshoot required.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className={`bg-accent text-accent-foreground px-8 h-12 text-base font-medium transition-all hover:bg-accent/90 hover:glow-primary`}
                onClick={handleHeadshotClick}
              >
                Create Your Headshot
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link href="#transformation-gallery" passHref>
                <Button variant="outline" size="lg" className="h-12 border-border text-foreground hover:bg-muted">
                  See Transformations
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted" />
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-foreground">10,000+</span>{" "}
                  <span className="text-muted-foreground">professionals</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="h-4 w-4 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">4.9</span>
                <span className="text-sm text-muted-foreground">rating</span>
              </div>
            </div>
          </div>

          {/* Right Column - Upload Interface */}
          <div className={`relative ${isAnimating ? "animate-pulse-once" : ""}`}>
            <div
              className={`relative rounded-2xl border bg-card p-8 shadow-lg transition-all duration-300 group ${
                isDragging ? "border-primary ring-4 ring-primary/20 glow-primary" : "border-border hover:border-primary/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnter={handleDragOver}
              onDragEnd={handleDragLeave}
              tabIndex={0}
              aria-label="Upload your photo by clicking or dragging here"
              style={{ cursor: "pointer" }}
            >
              {successMessage ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-foreground">You're all set!</h3>
                  <p className="text-muted-foreground">{successMessage}</p>
                  <Button
                    className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setSuccessMessage(null)}
                  >
                    Create Another
                  </Button>
                </div>
              ) : (
                <>
                  {/* Preview Grid */}
                  <div className="mb-8">
                    <div
                      className={
                        images.length > 3
                          ? "flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent"
                          : "grid grid-cols-3 gap-3"
                      }
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {images.length > 0
                        ? images.map((img, idx) => (
                            <div
                              key={idx}
                              className="aspect-square overflow-hidden rounded-xl bg-muted shrink-0"
                              style={images.length > 3 ? { minWidth: 90, width: 90, maxWidth: 120 } : {}}
                            >
                              <Image src={img} alt={`Uploaded ${idx + 1}`} width={200} height={200} className="h-full w-full object-cover" />
                            </div>
                          ))
                        : [1, 2, 3].map((i) => (
                            <div key={i} className="aspect-square overflow-hidden rounded-xl bg-muted">
                              <Image src={`/dummy-image-square.jpg`} alt={`Headshot style ${i}`} width={200} height={200} className="h-full w-full object-cover" />
                            </div>
                          ))}
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div className="text-center select-none">
                    <div onClick={handleUploadClick}>
                      <div
                        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 transition-all ${
                          isDragging ? "scale-110 bg-primary/20" : ""
                        }`}
                      >
                        <Upload className={`h-6 w-6 transition-colors ${isDragging ? "text-primary" : "text-accent"}`} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">Upload Your Photo</h3>
                      <p className={`mt-1 text-sm transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`}>
                        {isDragging
                          ? "Drop image(s) here"
                          : "Drag and drop or click to upload. JPG/PNG only, max 10MB. Use a clear solo photo with your face visible."}
                      </p>

                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        multiple
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileInputChange}
                      />
                    </div>

                    {images.length > 0 ? (
                      <div className="mt-6 flex items-center justify-between gap-4">
                        <Button
                          size="lg"
                          className="flex-1 bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90"
                          onClick={handleCancelUpload}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                          onClick={handleGenerateAIHeadshot}
                        >
                          Generate AI Headshot
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="mt-6 w-full bg-accent text-accent-foreground font-medium hover:bg-accent/90"
                        onClick={handleUploadClick}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Select Photo
                      </Button>
                    )}

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Your photos are encrypted and never shared</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Floating Elements */}
            <div className="absolute -left-8 -top-10 hidden lg:block">
              <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image src="/assets/comparison/Lovelace/before.jpg" alt="Before headshot" fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Before</p>
                    <p className="text-sm font-medium text-foreground">Casual selfie</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 -bottom-10 hidden lg:block">
              <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image src="/assets/comparison/Lovelace/after.png" alt="After headshot" fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">After</p>
                    <p className="text-sm font-medium text-foreground">Professional</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
            <button
              onClick={() => {
                if (!isGenerating) setShowEmailModal(false);
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={isGenerating}
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-2 text-2xl font-semibold tracking-tight">Where should we send your headshots?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Enter your email address to receive your high-quality AI generated professional portraits.
            </p>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isGenerating}
              />

              {/* Validation step indicator */}
              {isGenerating && (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-accent shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{generatingLabel}</p>
                      {generatingStep === "validating" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Checking for a clear face, sharpness, and photo quality...
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Progress dots */}
                  <div className="mt-3 flex gap-1.5">
                    {(["uploading", "validating", "redirecting"] as const).map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                          generatingStep === step
                            ? "bg-accent"
                            : ["uploading", "validating", "redirecting"].indexOf(generatingStep) >
                              ["uploading", "validating", "redirecting"].indexOf(step)
                            ? "bg-accent/40"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Photo validation failed</p>
                    <p className="mt-0.5 text-destructive/80">{errorMessage}</p>
                    <button
                      className="mt-2 text-xs underline underline-offset-2 hover:no-underline"
                      onClick={() => {
                        setErrorMessage(null);
                        setShowEmailModal(false);
                        setImages([]);
                      }}
                    >
                      Upload different photos
                    </button>
                  </div>
                </div>
              )}

              <Button
                onClick={submitJob}
                disabled={isGenerating || !email}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {generatingLabel}
                  </>
                ) : (
                  "Generate My Headshots"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}