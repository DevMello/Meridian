"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shell/Logo";
import { Button } from "@/components/meridian";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useToast } from "@/lib/hooks/useToast";

type Status = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const configured = isSupabaseConfigured();

  const [status, setStatus] = useState<Status>(configured ? "checking" : "ready");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ready" : "invalid");
    });
  }, [configured]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (password.length < 4) {
        toast("PASSWORD TOO SHORT · MIN 4 CHARACTERS", "bad");
        return;
      }
      if (password !== confirm) {
        toast("PASSWORDS DO NOT MATCH", "bad");
        return;
      }

      if (!configured) {
        router.push("/search");
        return;
      }

      setLoading(true);
      const supabase = createClient();

      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast(error.message, "bad");
          return;
        }
        toast("Password updated", "ok");
        router.push("/search");
      } catch {
        toast("Something went wrong. Please try again.", "bad");
      } finally {
        setLoading(false);
      }
    },
    [password, confirm, configured, router, toast],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const form = (e.currentTarget as HTMLInputElement).form;
        form?.requestSubmit();
      }
    },
    [],
  );

  return (
    <>
      <Logo />
      <p className="sub mt-3">Choose a new password for your account.</p>

      {status === "invalid" && (
        <div className="mt-4 rounded bg-panel2 px-3 py-2 text-[11px] text-ink3">
          This reset link is invalid or has expired.{" "}
          <a href="/sign-in" className="text-acc underline">
            Request a new one
          </a>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="lbl mb-1.5 block">New password</label>
            <input
              className="inp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label className="lbl mb-1.5 block">Confirm password</label>
            <input
              className="inp"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            variant="pri"
            className="mt-1 w-full"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      )}
    </>
  );
}
