"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function ProfileForm() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.put<{ id: string; full_name: string; email: string; role: "owner" | "employee" }>("/users/me", {
        full_name: fullName,
        email,
      });
      setUser({ id: updated.id, full_name: updated.full_name, email: updated.email, role: updated.role });
      toast({ title: "Profile updated successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      return toast({ variant: "destructive", title: "Invalid password", description: "Password must be at least 6 characters" });
    }
    if (password !== confirmPassword) {
      return toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match" });
    }

    setSavingPassword(true);
    try {
      await api.put(`/users/${user?.id}/password`, { password });
      toast({ title: "Password updated successfully" });
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Profile Information</h3>
          <p className="text-sm text-muted-foreground">Update your account's profile information and email address.</p>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile_full_name">Full Name</Label>
            <Input id="profile_full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile_email">Email Address</Label>
            <Input id="profile_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Information
          </Button>
        </form>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div>
          <h3 className="text-lg font-medium">Change Password</h3>
          <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile_password">New Password</Label>
            <Input id="profile_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile_confirm_password">Confirm Password</Label>
            <Input id="profile_confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={savingPassword}>
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
