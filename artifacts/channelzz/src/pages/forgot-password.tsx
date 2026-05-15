import { useState } from "react";
import { Link } from "wouter";
import { Tv, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/auth-fetch";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/auth/forgot-password", { email });
      setSent(true);
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-500/10 p-4 rounded-full">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              </div>
              <h1 className="text-xl font-bold">Request Submitted</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your password reset request has been submitted. Please contact the platform admin via WhatsApp — they will send you a <strong>6-digit reset code</strong> for <strong>{email}</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                Once you have the code, use it on the reset page.
              </p>
              <Link href="/reset-password">
                <Button className="w-full mt-2">Enter Reset Code</Button>
              </Link>
              <Link href="/sign-in" className="block text-sm text-primary hover:underline mt-2">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <Link href="/sign-in" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
              <h1 className="text-2xl font-bold mb-1">Forgot Password?</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Enter your email and we'll notify the admin to send you a reset code.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full font-bold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Reset Code"}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground mt-6 text-center">
                Already have a code?{" "}
                <Link href="/reset-password" className="text-primary font-semibold hover:underline">Enter it here</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
