"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FaCheck, FaTimes, FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const plans = [
    {
      name: "Starter",
      tagline: "Perfect for occasional users",
      price: { monthly: 0 },
      features: [
        { text: "5 conversions per month", included: true },
        { text: "Up to 5 MB per file", included: true },
        { text: "Basic voice settings", included: true },
        { text: "Files stored for 3 days", included: true },
        { text: "Standard audio quality", included: true },
        { text: "Advanced voice customization", included: false },
        { text: "Priority processing", included: false },
      ],
      cta: "Current Plan",
      highlighted: false,
    },
    {
      name: "Professional",
      tagline: "For power users and professionals",
      price: { monthly: 39 },
      features: [
        { text: "50 conversions per month", included: true },
        { text: "Up to 30 MB per file", included: true },
        { text: "Advanced voice customization", included: true },
        { text: "Files stored for 7 days", included: true },
        { text: "Premium audio quality", included: true },
        { text: "Priority processing queue", included: true },
        { text: "Priority support", included: true },
      ],
      cta:
        session?.user?.subscriptionPlan === "paid"
          ? "Downgrade"
          : "Upgrade Now",
      highlighted: true,
    },
  ];

  const handleSelectPlan = async (planName: string) => {
    if (planName === "Starter") {
      return;
    }

    if (!session) {
      router.push("/?auth=login");
      return;
    }

    // Handle downgrade
    if (
      session?.user?.subscriptionPlan === "paid" &&
      planName === "Professional"
    ) {
      const confirmed = confirm(
        "Are you sure you want to downgrade? Your paid features will be disabled immediately."
      );
      if (!confirmed) return;

      try {
        const response = await fetch("/api/subscription/downgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (response.ok) {
          alert(
            `Plan downgraded to Free. To stop future charges, please cancel your subscription in Gumroad Library.\n\nSubscription ID: ${
              data.subscriptionId || "Not available"
            }`
          );
          window.open("https://app.gumroad.com/library", "_blank");
          router.refresh();
        } else {
          alert("Failed to downgrade: " + data.error);
        }
      } catch (error) {
        alert("Error downgrading plan. Please try again.");
      }
      return;
    }

    // Handle upgrade - redirect to Gumroad with user email
    const gumroadUrl = `https://pdfvoice.gumroad.com/l/professional?email=${encodeURIComponent(
      session.user.email || ""
    )}&wanted=true`;
    window.open(gumroadUrl, "_blank");
    alert(
      "You'll be redirected to Gumroad to complete your payment. Your plan will be automatically upgraded once payment is confirmed."
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-8 hover:bg-accent"
        >
          <FaArrowLeft className="mr-2" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your PDF-to-audio conversion needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 transition-all ${
                plan.highlighted
                  ? "border-primary shadow-xl shadow-primary/20 scale-105"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {/* Popular Badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {plan.tagline}
                  </p>

                  <div className="mb-6">
                    <span className="text-5xl font-bold">
                      $
                      {plan.price.monthly}
                    </span>
                    {plan.price.monthly > 0 && (
                      <span className="text-muted-foreground ml-2">
                        /month
                      </span>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <div className="mt-0.5 rounded-full bg-green-500/10 p-1">
                          <FaCheck className="w-3 h-3 text-green-500" />
                        </div>
                      ) : (
                        <div className="mt-0.5 rounded-full bg-muted p-1">
                          <FaTimes className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-foreground"
                            : "text-muted-foreground line-through"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full py-6 text-lg font-semibold ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                      : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={plan.name === "Starter"}
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
