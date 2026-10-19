"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password");
        setLoading(false);
        return;
      }
      router.push(params.get("next") || "/");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8">
        <div className="mb-7 text-center">
          <img src="/logo.png" alt="MVP Card Collectors" width={112} height={112} className="mx-auto mb-5 h-28 w-28 object-contain" />
          <p className="eyebrow">Private workspace</p>
          <h1 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-fg">Card Business Tracker</h1>
          <p className="mt-2 text-sm text-muted">Enter your password to continue</p>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-[14px] border border-line bg-card px-4 py-3 text-sm text-fg placeholder:text-muted transition-ui focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/[.22]"
        />

        {error && <p className="mt-3 text-sm font-medium text-bad-text">{error}</p>}

        <button type="submit" disabled={loading || password.length === 0} className="btn-gold mt-5 w-full py-3">
          {loading ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
