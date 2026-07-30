"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "./GoogleAuthButton";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid enterprise email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    setErrorMsg(null);
    login(data, {
      onError: (err: unknown) => {
        const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
        const msg =
          anyErr.response?.data?.message ||
          anyErr.message ||
          "Failed to authenticate. Please check your credentials.";
        setErrorMsg(msg);
      },
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Enterprise AI Decision Platform</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Sign In to DecisionOS
        </h1>
        <p className="text-sm text-muted-foreground">
          Access your workspaces, forecasts, and AI decision recommendations.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-card/60 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-6">
        <GoogleAuthButton />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("email")}
                placeholder="name@company.com"
                type="email"
                className="pl-9"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("password")}
                placeholder="••••••••"
                type="password"
                className="pl-9"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              "Signing in..."
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an enterprise account?{" "}
        <Link
          href="/register"
          className="text-primary font-semibold hover:underline"
        >
          Create free workspace
        </Link>
      </p>
    </div>
  );
}
