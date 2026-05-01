"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";

/**
 * Sincroniza login de wallet en db.json.
 */
export function SessionSync() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    async function sync() {
      if (!isConnected || !address) return;
      await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
    }

    void sync();
  }, [address, isConnected]);

  return null;
}
