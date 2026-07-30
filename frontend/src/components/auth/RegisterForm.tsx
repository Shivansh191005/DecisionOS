"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowRight, Building2, Lock, Mail, Sparkles, User } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "./GoogleAuthButton";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid enterprise work email."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(
      /[A-Z]/,
      "Password must contain at least one uppercase letter."
    )
    .regex(/[0-9]/, "Password must contain at least one number."),
  full_name: z.string().min(2, "Please enter your full name."),
  organization_name: z
    .string()
    .min(2, "Organization name is required to create your workspace."),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: registerUser, isRegistering } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    setErrorMsg(null);
    registerUser(data, {
      onError: (err: unknown) => {
        const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
        const msg =
          anyErr.response?.data?.message ||
          anyErr.message ||
          "Registration failed. Please try again.";
        setErrorMsg(msg);
      },
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Enterprise Account Creation</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Create DecisionOS Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Deploy AI decision intelligence for your organization in seconds.
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
              Or sign up with work email
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
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("full_name")}
                placeholder="Elena Rostova"
                className="pl-9"
              />
            </div>
            {errors.full_name && (
              <p className="text-xs text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("email")}
                placeholder="elena@rostovacorp.ai"
                type="email"
                className="pl-9"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Company / Organization Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("organization_name")}
                placeholder="Rostova Enterprises"
                className="pl-9"
              />
            </div>
            {errors.organization_name && (
              <p className="text-xs text-destructive">
                {errors.organization_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Create Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...register("password")}
                placeholder="At least 8 chars, 1 uppercase, 1 number"
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
            disabled={isRegistering}
          >
            {isRegistering ? (
              "Initializing Workspace..."
            ) : (
              <>
                <span>Create Enterprise Account</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have a DecisionOS account?{" "}
        <Link
          href="/login"
          className="text-primary font-semibold hover:underline"
        >
          Sign in here
        </Link>
      </p>
    </div>
  );
}
