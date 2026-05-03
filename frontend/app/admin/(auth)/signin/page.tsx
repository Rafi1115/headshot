"use client";

import { useAppForm } from "@/components/form/form-context";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { signIn } from "@/lib/api/auth";
import { Sparkles } from "lucide-react";

const signinSchema = z.object({
    email: z.email("Enter your email address"),
    password: z.string().min(6, "Password must be at least 6 characters").max(32, "Password must be at most 32 characters"),
    remember: z.boolean(),
});

export default function Signin() {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);

    const form = useAppForm({
        defaultValues: { email: "", password: "", remember: false },
        validators: { onChange: signinSchema },
        onSubmit: async ({ value }) => {
            setAuthError(null);
            try {
                await signIn({ email: value.email, password: value.password });
                router.push("/admin");
            } catch (err: unknown) {
                setAuthError(err instanceof Error ? err.message : "An unexpected error occurred.");
            }
        },
    });

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-md rounded-3xl bg-white border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl flex flex-col gap-6">
                {/* Premium Logo Section */}
                <div className="flex flex-col items-center gap-3 mb-2">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#3b82f6]">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-black/90 flex items-center gap-1">
                        HeadshotAI <span className="text-[#3b82f6] font-medium text-base ml-1">Admin</span>
                    </h1>
                </div>


                <div className="flex flex-col gap-1 text-center">
                    <h2 className="text-lg font-semibold text-white">Sign in to Dashboard</h2>
                    <p className="text-sm text-white/60">Enter your admin credentials to access backend tools</p>
                </div>

                {authError && (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive font-medium text-center">
                        {authError}
                    </div>
                )}

                <form
                    className="grid gap-5"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                >
                    <form.AppField name="email">
                        {(field) => (
                            <field.FormInput
                                type="email"
                                label="Email Address"
                                placeholder="admin@example.com"
                            />
                        )}
                    </form.AppField>

                    <form.AppField name="password">
                        {(field) => (
                            <field.FormInput
                                type="password"
                                label="Password"
                                placeholder="••••••••"
                            />
                        )}
                    </form.AppField>

                    <div className="flex items-center justify-between mt-1">
                        <form.AppField name="remember">
                            {(field) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={field.state.value}
                                        onCheckedChange={(c) => field.handleChange(c === true)}
                                        className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                                    />
                                    <label htmlFor="remember" className="text-sm font-medium text-white/60 cursor-pointer select-none">
                                        Remember me
                                    </label>
                                </div>
                            )}
                        </form.AppField>

                        <Link href="/admin/forgot-password" className="text-accent font-medium text-sm hover:underline transition-colors">
                            Forgot password?
                        </Link>
                    </div>

                    <form.AppForm>
                        <form.FormSubmit
                            label="Sign In"
                        />
                    </form.AppForm>
                </form>
            </div>
        </div>
    );
}


