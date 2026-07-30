"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton() {
  const { googleAuth, isGoogleAuthPending } = useAuth();

  const handleGoogleSSO = () => {
    // Simulate enterprise Google OAuth SSO handshake
    googleAuth({
      google_id: `google-sso-${Date.now()}`,
      email: "elena.rostova@acme.ai",
      full_name: "Elena Rostova (Google SSO)",
      avatar_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full font-medium bg-background/50 hover:bg-background/80 border-white/10 flex items-center justify-center gap-3 py-2.5"
      onClick={handleGoogleSSO}
      disabled={isGoogleAuthPending}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.12C3.26 21.3 7.35 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.24C.45 8.19 0 10.03 0 12s.45 3.81 1.24 5.39l4.04-3.12Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.24 6.61l4.04 3.12c.95-2.83 3.6-4.98 6.72-4.98Z"
        />
      </svg>
      <span>Continue with Google Workspace</span>
    </Button>
  );
}
