"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  apiClient,
  clearTokens,
  getAccessToken,
  setTokens,
} from "@/lib/api";
import { useAppStore, UserProfile } from "@/store/use-app-store";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  organization_name?: string;
}

export interface GoogleAuthPayload {
  google_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setUser, setUser: clearUser } = useAppStore();

  const userQuery = useQuery<UserProfile>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/me");
      setUser(data);
      return data;
    },
    enabled: typeof window !== "undefined" && !!getAccessToken(),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post("/auth/login", payload);
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/dashboard");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await apiClient.post("/auth/register", payload);
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/dashboard");
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: async (payload: GoogleAuthPayload) => {
      const { data } = await apiClient.post("/auth/google", payload);
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem("decisionos_refresh_token");
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refresh_token: refreshToken });
      }
    },
    onSettled: () => {
      clearTokens();
      clearUser(null);
      queryClient.clear();
      router.push("/login");
    },
  });

  return {
    user: userQuery.data || null,
    isLoading: userQuery.isLoading,
    isError: userQuery.isError,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    googleAuth: googleAuthMutation.mutate,
    isGoogleAuthPending: googleAuthMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
