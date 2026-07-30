"use client";

import React from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <RegisterForm />
    </div>
  );
}
