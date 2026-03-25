"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, Suspense } from "react";

type Status = "idle" | "loading" | "success" | "error";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleUnsubscribe = useCallback(async () => {
    if (!token) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(
          (data as { error?: string }).error ?? "Something went wrong",
        );
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }, [token]);

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Invalid link
        </h1>
        <p className="text-gray-600">
          This unsubscribe link is missing or malformed.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Unsubscribed
        </h1>
        <p className="text-gray-600 mb-6">
          You&apos;ve been successfully unsubscribed from these notifications.
        </p>
        <p className="text-sm text-gray-400">
          You can manage all your notification preferences in your{" "}
          <a
            href="/dashboard/settings"
            className="text-blue-500 underline"
          >
            dashboard settings
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Unsubscribe from notifications
      </h1>
      <p className="text-gray-600 mb-6">
        Are you sure you want to unsubscribe? You can re-enable notifications
        at any time from your dashboard settings.
      </p>

      {status === "error" && (
        <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={handleUnsubscribe}
        disabled={status === "loading"}
        className="bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Processing..." : "Confirm unsubscribe"}
      </button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-xl font-bold text-gray-900">APIFold</span>
        </div>
        <Suspense
          fallback={
            <div className="text-center text-gray-400">Loading...</div>
          }
        >
          <UnsubscribeContent />
        </Suspense>
      </div>
    </div>
  );
}
