"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { RoleGate } from "@/components/shared/RoleGate";
import Link from "next/link";
import {
  ArrowLeftRightIcon,
  BarChart3Icon,
  CalendarIcon,
  CircleAlertIcon,
  ClockIcon,
  FileTextIcon,
  MapPinIcon,
  PackageOpenIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  href,
  loading,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  href: string;
  loading?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card className="border-border bg-card transition-all hover:shadow-md hover:border-primary/30 h-full">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
          {change && (
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] font-medium"
            >
              {change}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const session = useAuthStore((s) => s.session);
  const role = session?.role;

  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["dashboard-overview", "users"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<
          {
            id: string;
            role: string;
            isActive: boolean;
            firstName: string;
            lastName: string;
            email: string;
            createdAt?: string;
          }[]
        >("/users");
      return data;
    },
    enabled: role === "admin" || role === "manager",
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["dashboard-overview", "locations"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<
          {
            id: string;
            name: string;
            isActive: boolean;
            ianaTimezone: string;
          }[]
        >("/locations");
      return data;
    },
    enabled: role === "admin" || role === "manager",
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["dashboard-overview", "skills"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<{ id: string; name: string }[]>("/skills");
      return data;
    },
    enabled: role === "admin",
  });

  const { data: pendingSwaps = [], isLoading: swapsLoading } = useQuery({
    queryKey: ["dashboard-overview", "pending-swaps"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        {
          id: string;
          type: string;
          status: string;
          createdAt: string;
          initiator?: { firstName: string; lastName: string };
        }[]
      >("/swaps?status=pending_manager");
      return data;
    },
    enabled: role === "admin" || role === "manager",
  });

  const { data: overtime = [], isLoading: overtimeLoading } = useQuery({
    queryKey: ["dashboard-overview", "overtime", weekStart],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { userId: string; name: string; projectedHours: number }[]
      >(`/analytics/overtime?weekStart=${weekStart}`);
      return data;
    },
    enabled: role === "admin" || role === "manager",
  });

  const { data: understaffed = [] } = useQuery({
    queryKey: ["dashboard-overview", "understaffed"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { shiftId: string; title: string; needed: number; assigned: number }[]
      >(`/analytics/understaffed?startDate=${todayStr}&endDate=${weekEndStr}`);
      return data;
    },
    enabled: role === "admin" || role === "manager",
  });

  const userId = session?.user?.id;

  const { data: myAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["dashboard-overview", "my-assignments", userId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; status: string }[]>(
        `/users/${userId}/assignments?startDate=${todayStr}&endDate=${weekEndStr}`,
      );
      return data;
    },
    enabled: !!userId,
  });

  const { data: mySwaps = [], isLoading: mySwapsLoading } = useQuery({
    queryKey: ["dashboard-overview", "my-swaps", userId],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { id: string; status: string; type: string }[]
      >(`/users/${userId}/swaps`);
      return data;
    },
    enabled: !!userId && role === "staff",
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["dashboard-overview", "recent-activity"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        {
          id: string;
          action: string;
          entityType: string;
          entityId?: string;
          actorId?: string;
          createdAt: string;
          actor?: { email: string; firstName?: string; lastName?: string };
          location?: { name: string };
        }[]
      >("/audit/logs?limit=5&offset=0");
      return data;
    },
    enabled: role === "admin" || role === "manager",
  });

  const activeStaff = users.filter(
    (u) => u.isActive && u.role === "staff",
  ).length;
  const activeLocations = locations.filter((l) => l.isActive).length;
  const overtimeCount = overtime.filter((o) => o.projectedHours >= 40).length;
  const upcomingShifts = myAssignments.filter(
    (a) => a.status !== "cancelled",
  ).length;
  const pendingMySwaps = mySwaps.filter(
    (s) => s.status === "pending_target" || s.status === "pending_manager",
  ).length;

  const recentStaff = [...users]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 6);

  const alerts: {
    label: string;
    color: "red" | "amber" | "blue";
    count?: number;
  }[] = [];
  if (understaffed.length > 0)
    alerts.push({
      label: `${understaffed.length} understaffed shift${understaffed.length > 1 ? "s" : ""} this week`,
      color: "red",
      count: understaffed.length,
    });
  if (overtimeCount > 0)
    alerts.push({
      label: `${overtimeCount} staff at/over 40h overtime`,
      color: "red",
    });
  if (overtime.length > overtimeCount && overtime.length > 0)
    alerts.push({
      label: `${overtime.length - overtimeCount} staff approaching overtime limit`,
      color: "amber",
    });
  if (pendingSwaps.length > 0)
    alerts.push({
      label: `${pendingSwaps.length} swap request${pendingSwaps.length > 1 ? "s" : ""} pending approval`,
      color: "blue",
    });

  const dotColor = {
    red: "bg-destructive",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Platform Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{role}</span>
            {" · "}
            {today.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── ADMIN ── */}
      <RoleGate role={["admin"]}>
        {/* Stat cards row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Staff"
            value={activeStaff}
            icon={UsersIcon}
            href="/staff"
            loading={usersLoading}
            change={`${users.length} total`}
          />
          <StatCard
            title="Locations"
            value={activeLocations}
            icon={MapPinIcon}
            href="/locations"
            loading={locationsLoading}
            change={`${locations.length} total`}
          />
          <StatCard
            title="Total Users"
            value={users.length}
            icon={UsersIcon}
            href="/staff"
            loading={usersLoading}
          />
          <StatCard
            title="Skills"
            value={skills.length}
            icon={WrenchIcon}
            href="/skills"
            loading={skillsLoading}
          />
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left — 3/5 width */}
          <div className="space-y-6 lg:col-span-3">
            <RecentActivityTable logs={auditLogs} loading={auditLoading} />
          </div>

          {/* Right — 2/5 width */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction
                    icon={CalendarIcon}
                    label="Schedule"
                    href="/schedule"
                    color="text-blue-600"
                    bg="bg-blue-500/10"
                  />
                  <QuickAction
                    icon={UsersIcon}
                    label="Staff"
                    href="/staff"
                    color="text-indigo-600"
                    bg="bg-indigo-500/10"
                  />
                  <QuickAction
                    icon={MapPinIcon}
                    label="Locations"
                    href="/locations"
                    color="text-rose-600"
                    bg="bg-rose-500/10"
                  />
                  <QuickAction
                    icon={BarChart3Icon}
                    label="Analytics"
                    href="/analytics"
                    color="text-amber-600"
                    bg="bg-amber-500/10"
                  />
                  <QuickAction
                    icon={WrenchIcon}
                    label="Skills"
                    href="/skills"
                    color="text-teal-600"
                    bg="bg-teal-500/10"
                  />
                  <QuickAction
                    icon={FileTextIcon}
                    label="Audit"
                    href="/audit"
                    color="text-slate-600"
                    bg="bg-slate-500/10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Staff — full width */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Staff</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff" className="text-xs text-primary">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-2.5" colSpan={4}>
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : recentStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No staff
                      </td>
                    </tr>
                  ) : (
                    recentStaff.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className="capitalize text-xs"
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={u.isActive ? "default" : "outline"}
                            className="text-xs"
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </RoleGate>

      {/* ── MANAGER ── */}
      <RoleGate role={["manager"]}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Staff Members"
            value={activeStaff}
            icon={UsersIcon}
            href="/staff"
            loading={usersLoading}
            change={`${users.length} total`}
          />
          <StatCard
            title="Locations"
            value={activeLocations}
            icon={MapPinIcon}
            href="/locations"
            loading={locationsLoading}
          />
          <StatCard
            title="Pending Approvals"
            value={pendingSwaps.length}
            icon={ArrowLeftRightIcon}
            href="/swaps"
            loading={swapsLoading}
          />
          <StatCard
            title="My Shifts"
            value={upcomingShifts}
            icon={CalendarIcon}
            href="/schedule"
            loading={assignmentsLoading}
            change="this week"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <RecentActivityTable logs={auditLogs} loading={auditLoading} />
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Alerts</CardTitle>
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {alerts.length} active
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center py-4 text-center">
                    <CircleAlertIcon className="mb-2 size-8 text-green-500/60" />
                    <p className="text-sm text-muted-foreground">
                      All clear — no active alerts
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {alerts.map((a, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span
                          className={`inline-flex size-2.5 shrink-0 rounded-full ${dotColor[a.color]}`}
                        />
                        <p className="text-sm text-foreground">{a.label}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction
                    icon={CalendarIcon}
                    label="Schedule"
                    href="/schedule"
                    color="text-blue-600"
                    bg="bg-blue-500/10"
                  />
                  <QuickAction
                    icon={UsersIcon}
                    label="Staff"
                    href="/staff"
                    color="text-indigo-600"
                    bg="bg-indigo-500/10"
                  />
                  <QuickAction
                    icon={ArrowLeftRightIcon}
                    label="Swaps"
                    href="/swaps"
                    color="text-violet-600"
                    bg="bg-violet-500/10"
                  />
                  <QuickAction
                    icon={BarChart3Icon}
                    label="Analytics"
                    href="/analytics"
                    color="text-amber-600"
                    bg="bg-amber-500/10"
                  />
                  <QuickAction
                    icon={MapPinIcon}
                    label="Locations"
                    href="/locations"
                    color="text-rose-600"
                    bg="bg-rose-500/10"
                  />
                  <QuickAction
                    icon={ClockIcon}
                    label="On-Duty"
                    href="/on-duty"
                    color="text-green-600"
                    bg="bg-green-500/10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Staff — full width */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Staff</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/staff" className="text-xs text-primary">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-4 py-2.5" colSpan={3}>
                            <Skeleton className="h-4 w-full" />
                          </td>
                        </tr>
                      ))
                    : recentStaff.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {u.firstName} {u.lastName}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="secondary"
                              className="capitalize text-xs"
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant={u.isActive ? "default" : "outline"}
                              className="text-xs"
                            >
                              {u.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </RoleGate>

      {/* ── STAFF ── */}
      <RoleGate role={["staff"]}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Upcoming Shifts"
            value={upcomingShifts}
            icon={CalendarIcon}
            href="/schedule"
            loading={assignmentsLoading}
            change="this week"
          />
          <StatCard
            title="Pending Requests"
            value={pendingMySwaps}
            icon={ArrowLeftRightIcon}
            href="/swaps"
            loading={mySwapsLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">
                  My Swap & Drop Requests
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/swaps" className="text-xs text-primary">
                    View All
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {mySwapsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded" />
                    ))}
                  </div>
                ) : mySwaps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No active requests
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {mySwaps.slice(0, 5).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <Badge variant="outline" className="capitalize">
                          {s.type}
                        </Badge>
                        <Badge
                          variant={
                            s.status.startsWith("pending")
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs capitalize"
                        >
                          {s.status.replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction
                    icon={CalendarIcon}
                    label="Schedule"
                    href="/schedule"
                    color="text-blue-600"
                    bg="bg-blue-500/10"
                  />
                  <QuickAction
                    icon={ArrowLeftRightIcon}
                    label="Swaps"
                    href="/swaps"
                    color="text-violet-600"
                    bg="bg-violet-500/10"
                  />
                  <QuickAction
                    icon={ClockIcon}
                    label="On-Duty"
                    href="/on-duty"
                    color="text-green-600"
                    bg="bg-green-500/10"
                  />
                  <QuickAction
                    icon={PackageOpenIcon}
                    label="Drops"
                    href="/swaps"
                    color="text-orange-600"
                    bg="bg-orange-500/10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </RoleGate>
    </div>
  );
}

function RecentActivityTable({
  logs,
  loading,
}: {
  logs: {
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    actorId?: string;
    createdAt: string;
    actor?: { email: string; firstName?: string; lastName?: string };
    location?: { name: string };
  }[];
  loading?: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/audit" className="text-xs text-primary">
            Full Log
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium text-muted-foreground">
                  Timestamp
                </th>
                <th className="px-4 py-2 font-medium text-muted-foreground">
                  Actor
                </th>
                <th className="px-4 py-2 font-medium text-muted-foreground">
                  Action
                </th>
                <th className="px-4 py-2 font-medium text-muted-foreground">
                  Entity
                </th>
                <th className="px-4 py-2 font-medium text-muted-foreground">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2.5" colSpan={5}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No recent activity
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {log.actor?.email ?? log.actorId ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.entityType}
                      {log.entityId ? ` ${log.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.location?.name ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1.5 rounded-lg ${bg} px-3 py-3 text-center transition-colors hover:opacity-80`}
    >
      <Icon className={`size-5 ${color}`} />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  );
}
