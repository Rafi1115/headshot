"use client";

import { Button } from "@/components/ui/button";
import { Check, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "INSTANT",
    name: "Instant",
    description: "Perfect for quick professional use",
    price: 1,
    icon: Zap,
    featured: false,
    maxInput: 1,
    outputRange: "5–10",
    features: [
      "1 photo upload",
      "5–10 AI headshots generated",
      "Multiple background styles",
      "Multiple lighting variations",
      "High resolution downloads",
      "Delivered as ZIP via email",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    description: "Maximum variety and quality",
    price: 2,
    icon: Crown,
    featured: true,
    maxInput: 5,
    outputRange: "20–40",
    features: [
      "Up to 5 photos upload",
      "20–40 AI headshots generated",
      "Wide variety of styles",
      "Multiple backgrounds & lighting",
      "High resolution downloads",
      "Delivered as ZIP via email",
      "Best facial identity matching",
    ],
  },
];

export default function Pricing() {
  const handleGetStarted = (planId: string) => {
    // Store selected package
    localStorage.setItem("selected_package", planId);

    // Scroll to hero upload widget
    const heroSection = document.getElementById("hero-upload");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section id="pricing" className="bg-transparent py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl text-balance">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Invest in your professional image. No subscriptions, no hidden fees.
          </p>
        </div>

        {/* Pricing Cards — 2 plans */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border p-8 transition-all duration-300",
                  plan.featured
                    ? "border-accent bg-card shadow-lg ring-1 ring-accent"
                    : "border-border bg-card hover:border-accent/30 hover:shadow-lg"
                )}
              >
                {/* Featured Badge */}
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mt-6 text-center">
                  <span className="text-5xl font-semibold tracking-tight text-foreground">
                    ${plan.price}
                  </span>
                  <span className="ml-1 text-muted-foreground">one-time</span>
                </div>

                {/* Output highlight */}
                <div className="mt-4 rounded-lg bg-accent/5 border border-accent/20 px-4 py-2 text-center">
                  <span className="text-sm font-medium text-accent">
                    {plan.outputRange} headshots delivered
                  </span>
                </div>

                {/* Features */}
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleGetStarted(plan.id)}
                  className={cn(
                    "mt-8 w-full",
                    plan.featured
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  size="lg"
                >
                  Get Started
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          All plans include commercial usage rights and are covered by our satisfaction guarantee.
        </p>
      </div>
    </section>
  );
}