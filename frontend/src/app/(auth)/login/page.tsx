"use client";

import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <LoginForm />
    </div>
  );
}
