import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Tv, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/auth-fetch";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (token.length !== 6 || !/^\d+$/.test(token)) { setError("Reset code must be a 6-digit number"); return; }
    setLoading(true);
    try {
      await postJson("/auth/reset-password", { email, token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-6 group">
          <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight italic">Channelzz</span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-500/10 p-4 rounded-full">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              </div>
              <h1 className="text-xl font-bold">Password Reset!</h1>
              <p className="text-muted-foreground text-sm">Your password has been updated successfully. You can now sign in with your new password.</p>
              <Button className="w-full" onClick={() => setLocation("/sign-in")}>Sign In</Button>
            </div>
          ) : (
            <>
              <Link href="/sign-in" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
              <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Enter your email, the 6-digit code from the admin, and your new password.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" autoComplete="email" required
                    placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">6-Digit Reset Code</Label>
                  <Input id="token" type="text" inputMode="numeric" maxLength={6} required
                    placeholder="123456" value={token}
                    onChange={e => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em] font-mono" />
                  <p className="text-xs text-muted-foreground">Get this code from the admin via WhatsApp. Expires in 1 hour.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} required
                      placeholder="Min. 6 characters" value={password}
                      onChange={e => setPassword(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input id="confirm" type={showPw ? "text" : "password"} required
                    placeholder="Same as above" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full font-bold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground mt-6 text-center">
                Don't have a code?{" "}
                <Link href="/forgot-password" className="text-primary font-semibold hover:underline">Request one</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
