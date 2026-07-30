"use client";

import React, { useState } from "react";
import { Check, ShieldAlert, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function WorkspaceSettingsPage() {
  const { activeOrganization, activeWorkspace } = useWorkspace();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("editor");
  const [teamMembers, setTeamMembers] = useState([
    {
      id: "usr-1",
      name: "Elena Rostova",
      email: "elena@rostovacorp.ai",
      role: "Owner",
      status: "Active",
    },
    {
      id: "usr-2",
      name: "Marcus Vance",
      email: "marcus@rostovacorp.ai",
      role: "Admin",
      status: "Active",
    },
    {
      id: "usr-3",
      name: "Sarah Lin",
      email: "sarah@rostovacorp.ai",
      role: "Viewer",
      status: "Invited",
    },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    setTeamMembers([
      ...teamMembers,
      {
        id: `usr-${Date.now()}`,
        name: newMemberEmail.split("@")[0],
        email: newMemberEmail,
        role: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1),
        status: "Invited",
      },
    ]);
    setNewMemberEmail("");
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RBAC Control Plane</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Workspace Settings & RBAC Permissions
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage roles, data access control, and team members for{" "}
          <span className="font-semibold text-foreground">
            {activeWorkspace?.name || "Main Workspace"}
          </span>{" "}
          ({activeOrganization?.name || "Enterprise"}).
        </p>
      </div>

      {/* Invite Member Box */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Grant enterprise RBAC role permissions (Owner, Admin, Editor,
            Viewer)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleInvite}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1"
              required
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="owner">Owner (Wildcard *)</option>
              <option value="admin">Admin (All Domains)</option>
              <option value="editor">Editor (Upload & Create)</option>
              <option value="viewer">Viewer (Read-only)</option>
            </select>
            <Button type="submit" className="font-semibold">
              <UserPlus className="w-4 h-4 mr-2" />
              <span>Send Invite</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Roster */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Roster & Roles</CardTitle>
              <CardDescription>
                Active members with granular permission assignments
              </CardDescription>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-white/10">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{member.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {member.role}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      member.status === "Active"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RBAC Permission Matrix Reference */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
            <CardTitle className="text-lg">RBAC Enforcement Matrix</CardTitle>
          </div>
          <CardDescription>
            System policies checked by backend dependency injectors
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            • <strong className="text-foreground">Owner</strong>:{" "}
            <code>*</code> wildcard permission across all workspaces and
            settings.
          </p>
          <p>
            • <strong className="text-foreground">Admin</strong>:{" "}
            <code>dataset:*</code>, <code>dashboard:*</code>,{" "}
            <code>ai:*</code>, <code>workspace:*</code>.
          </p>
          <p>
            • <strong className="text-foreground">Editor</strong>:{" "}
            <code>dataset:write</code>, <code>dashboard:write</code>,{" "}
            <code>ai:query</code>.
          </p>
          <p>
            • <strong className="text-foreground">Viewer</strong>:{" "}
            <code>dataset:read</code>, <code>dashboard:read</code>,{" "}
            <code>ai:read</code> (No modification rights).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
