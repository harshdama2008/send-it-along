"use client";

import { useCallback, useEffect, useState } from "react";
import { useDonation } from "@/lib/donation-store";
import type { Tables } from "@/lib/supabase/types";

type DevState = {
  currentDonation: Tables<"donations"> | null;
  recentDonations: Pick<Tables<"donations">, "id" | "status" | "charity_name" | "created_at">[];
  recentWebhookEvents: { event_type: string; status: string | null; received_at: string }[];
};

const cellStyle: React.CSSProperties = { border: "1px solid #999", padding: "2px 6px" };
const preStyle: React.CSSProperties = {
  background: "#eee",
  border: "1px solid #999",
  padding: 8,
  maxHeight: 300,
  overflow: "auto",
  fontSize: 12,
};

export function DevDashboard() {
  const { donation, setDonationId } = useDonation();
  const [state, setState] = useState<DevState | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/dev/state?donationId=${donation.donationId ?? ""}`);
    if (!res.ok) return;
    setState(await res.json());
    setFetchedAt(new Date().toLocaleTimeString());
  }, [donation.donationId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleClearLocalStorage() {
    setDonationId(null);
  }

  async function handleWipeAll() {
    if (!window.confirm("Delete ALL rows from donations and webhook_events? This cannot be undone.")) {
      return;
    }
    await fetch("/api/dev/wipe", { method: "POST" });
    setDonationId(null);
    refresh();
  }

  function handleCopyId() {
    if (!donation.donationId) return;
    navigator.clipboard.writeText(donation.donationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ fontFamily: "monospace", fontSize: 13, padding: 16, color: "#000", background: "#fff" }}>
      <h1 style={{ fontSize: 16, fontWeight: "bold" }}>/dev — debug dashboard</h1>
      <p>Auto-refreshes every 2s. Last refresh: {fetchedAt ?? "…"}</p>

      <div style={{ margin: "12px 0", display: "flex", gap: 8 }}>
        <button onClick={handleClearLocalStorage}>Clear localStorage</button>
        <button onClick={handleWipeAll}>Delete all test donations</button>
        <button onClick={handleCopyId} disabled={!donation.donationId}>
          {copied ? "Copied!" : "Copy current donation id"}
        </button>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: "bold", marginTop: 20 }}>Current donation</h2>
      <p>localStorage donation id: {donation.donationId ?? "(none)"}</p>
      <p>
        Has uber_delivery_id: {state?.currentDonation?.uber_delivery_id ? "yes" : "no"}
        {" · "}
        Has tracking_url: {state?.currentDonation?.tracking_url ? "yes" : "no"}
      </p>
      <pre style={preStyle}>{JSON.stringify(state?.currentDonation ?? null, null, 2)}</pre>

      <h2 style={{ fontSize: 14, fontWeight: "bold", marginTop: 20 }}>
        Last 10 donations
      </h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cellStyle}>id</th>
            <th style={cellStyle}>status</th>
            <th style={cellStyle}>charity_name</th>
            <th style={cellStyle}>created_at</th>
          </tr>
        </thead>
        <tbody>
          {(state?.recentDonations ?? []).map((row) => (
            <tr key={row.id}>
              <td style={cellStyle}>{row.id}</td>
              <td style={cellStyle}>{row.status}</td>
              <td style={cellStyle}>{row.charity_name ?? ""}</td>
              <td style={cellStyle}>{row.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, fontWeight: "bold", marginTop: 20 }}>
        Last 20 webhook_events
      </h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cellStyle}>event_type</th>
            <th style={cellStyle}>status</th>
            <th style={cellStyle}>received_at</th>
          </tr>
        </thead>
        <tbody>
          {(state?.recentWebhookEvents ?? []).map((row, i) => (
            <tr key={i}>
              <td style={cellStyle}>{row.event_type}</td>
              <td style={cellStyle}>{row.status ?? ""}</td>
              <td style={cellStyle}>{row.received_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
