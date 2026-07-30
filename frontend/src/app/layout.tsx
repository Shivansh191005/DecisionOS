"use client";

import React, { useState } from "react";
import { Inter } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { CommandPalette } from "@/components/command/CommandPalette";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <title>DecisionOS — AI Decision Intelligence Platform</title>
        <meta
          name="description"
          content="Enterprise AI Decision Intelligence Platform. Upload data, generate forecasts, detect anomalies, and receive automated AI business recommendations."
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <CommandShortcutWrapper>
                {children}
                <CommandPalette />
              </CommandShortcutWrapper>
              <ToastViewport />
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

function CommandShortcutWrapper({ children }: { children: React.ReactNode }) {
  useKeyboardShortcut();
  return <>{children}</>;
}
