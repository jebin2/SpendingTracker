"use client";

import { useEffect } from "react";

// Module-level guard — prevents double-wrapping fetch in React StrictMode dev
let fetchIntercepted = false;

export function useFetchInterceptor(onUnauthorized: () => void) {
  useEffect(() => {
    if (fetchIntercepted) return;
    fetchIntercepted = true;

    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      const input = args[0];
      const url =
        typeof input === "string" ? input :
        input instanceof Request ? input.url :
        input instanceof URL ? input.pathname :
        "";
      if (res.status === 401 && url.includes("/api/")) {
        onUnauthorized();
      }
      return res;
    };

    return () => {
      window.fetch = original;
      fetchIntercepted = false;
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
}
