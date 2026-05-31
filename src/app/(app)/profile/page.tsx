"use client";

import { Check, LogOut, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { authClient, useSession } from "@/lib/auth-client";

type ActiveOrg = {
  id: string;
  name: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [editingHousehold, setEditingHousehold] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [householdError, setHouseholdError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await authClient.organization.getFullOrganization();
      if (cancelled) return;
      if (data) {
        setActiveOrg({ id: data.id, name: data.name });
        setHouseholdName(data.name);
      }
      setOrgLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/sign-in");
  };

  const handleSaveHousehold = async () => {
    if (!activeOrg) return;
    const trimmed = householdName.trim();
    if (!trimmed) {
      setHouseholdError("Household name cannot be empty");
      return;
    }
    setSavingHousehold(true);
    setHouseholdError("");
    const { data, error } = await authClient.organization.update({
      organizationId: activeOrg.id,
      data: { name: trimmed },
    });
    setSavingHousehold(false);
    if (error) {
      setHouseholdError(error.message ?? "Failed to update household");
      return;
    }
    if (data) setActiveOrg({ id: data.id, name: data.name });
    setEditingHousehold(false);
  };

  const handleCancelHouseholdEdit = () => {
    setHouseholdName(activeOrg?.name ?? "");
    setHouseholdError("");
    setEditingHousehold(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Profile" description="Your account" />

      <div className="px-6">
        <Card>
          <CardContent className="space-y-3 pt-6">
            {isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : session?.user ? (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Name</p>
                  <p className="text-base">{session.user.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{session.user.email}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not signed in</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Household</p>
              {!orgLoading && activeOrg && !editingHousehold && (
                <button
                  type="button"
                  onClick={() => setEditingHousehold(true)}
                  className="text-xs text-primary hover:underline"
                  aria-label="Edit household name"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {orgLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !activeOrg ? (
              <p className="text-sm text-muted-foreground">No active household</p>
            ) : editingHousehold ? (
              <div className="space-y-2">
                <Label htmlFor="household-name" className="sr-only">
                  Household name
                </Label>
                <Input
                  id="household-name"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={savingHousehold}
                  autoFocus
                />
                {householdError && (
                  <p className="text-destructive text-sm" role="alert">
                    {householdError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveHousehold}
                    disabled={savingHousehold}
                    className="flex-1"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {savingHousehold ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelHouseholdEdit}
                    disabled={savingHousehold}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-base">{activeOrg.name}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <Button variant="outline" className="w-full" onClick={handleSignOut} disabled={signingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
