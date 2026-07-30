import { create } from "zustand";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  is_default: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface AppState {
  user: UserProfile | null;
  organizations: Organization[];
  activeOrganization: Organization | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isCommandPaletteOpen: boolean;
  setUser: (user: UserProfile | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setActiveOrganization: (org: Organization | null) => void;
  setWorkspaces: (ws: Workspace[]) => void;
  setActiveWorkspace: (ws: Workspace | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  organizations: [],
  activeOrganization: null,
  workspaces: [],
  activeWorkspace: null,
  isCommandPaletteOpen: false,
  setUser: (user) => set({ user }),
  setOrganizations: (orgs) => set({ organizations: orgs }),
  setActiveOrganization: (org) => {
    if (org && typeof window !== "undefined") {
      localStorage.setItem("decisionos_active_org_id", org.id);
    }
    set({ activeOrganization: org });
  },
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (ws) => {
    if (ws && typeof window !== "undefined") {
      localStorage.setItem("decisionos_active_ws_slug", ws.slug);
    }
    set({ activeWorkspace: ws });
  },
  setCommandPaletteOpen: (isCommandPaletteOpen) =>
    set({ isCommandPaletteOpen }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
}));
