import { DEMO_MERCHANT_ID } from "./merchant-demo-profile";
import { DEMO_CONSUMER_ID } from "./consumerProfileSupabase";
import type { CheckoutDraft } from "./checkoutFromOffer";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export type CheckoutLineItem = { name: string; unit_cents: number };

export type CheckoutSession = {
  id: string;
  consumer_id: string;
  merchant_id: string;
  offer_id: string;
  merchant_name: string;
  subtotal_cents: number;
  discount_pct: number;
  amount_cents: number;
  line_items: CheckoutLineItem[];
  status: string;
  created_at: string;
};

export type WalletLedgerRow = {
  id: string;
  consumer_id: string;
  merchant_id: string;
  merchant_name: string;
  checkout_session_id: string | null;
  amount_cents: number;
  line_items: CheckoutLineItem[];
  created_at: string;
};

const LS_SESSIONS = "vibepay_ls_checkout_sessions";
const LS_CONSUMER_BAL = "vibepay_ls_consumer_balance";
const LS_MERCHANT_BALS = "vibepay_ls_merchant_bals";
const LS_LEDGER = "vibepay_ls_ledger";
const LS_REDEEMED_OFFERS = "vibepay_redeemed_offer_ids";

function initLocalWalletState() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LS_CONSUMER_BAL) == null) localStorage.setItem(LS_CONSUMER_BAL, "428750");
    if (localStorage.getItem(LS_MERCHANT_BALS) == null) {
      localStorage.setItem(LS_MERCHANT_BALS, JSON.stringify({ [DEMO_MERCHANT_ID]: 184260 }));
    }
    if (localStorage.getItem(LS_SESSIONS) == null) localStorage.setItem(LS_SESSIONS, "{}");
    if (localStorage.getItem(LS_LEDGER) == null) localStorage.setItem(LS_LEDGER, "[]");
  } catch {
    /* ignore */
  }
}

function readLocalSessions(): Record<string, CheckoutSession> {
  initLocalWalletState();
  try {
    return JSON.parse(localStorage.getItem(LS_SESSIONS) ?? "{}") as Record<string, CheckoutSession>;
  } catch {
    return {};
  }
}

function writeLocalSessions(map: Record<string, CheckoutSession>) {
  localStorage.setItem(LS_SESSIONS, JSON.stringify(map));
}

export function formatEuroFromCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function readLocalRedeemedOfferIds(): Set<string> {
  initLocalWalletState();
  try {
    const raw = localStorage.getItem(LS_REDEEMED_OFFERS);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  const fromSessions = new Set<string>();
  for (const s of Object.values(readLocalSessions())) {
    if (s.status === "completed") fromSessions.add(s.offer_id);
  }
  return fromSessions;
}

function rememberLocalRedeemedOfferId(offerId: string) {
  try {
    const arr = [...readLocalRedeemedOfferIds()];
    if (!arr.includes(offerId)) arr.push(offerId);
    localStorage.setItem(LS_REDEEMED_OFFERS, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

/** Offer IDs this consumer has already paid for (completed checkout). */
export async function fetchRedeemedOfferIdsForConsumer(consumerId = DEMO_CONSUMER_ID): Promise<Set<string>> {
  if (!isSupabaseConfigured()) {
    return readLocalRedeemedOfferIds();
  }
  const supabase = getSupabase();
  if (!supabase) return readLocalRedeemedOfferIds();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("offer_id")
    .eq("consumer_id", consumerId)
    .eq("status", "completed");
  if (error) {
    console.error("[supabase] redeemed offers", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r: { offer_id: string }) => r.offer_id));
}

function insertCheckoutSessionLocal(draft: CheckoutDraft): CheckoutSession | null {
  if (typeof window === "undefined") return null;
  initLocalWalletState();
  if (readLocalRedeemedOfferIds().has(draft.offerId)) return null;
  const id = crypto.randomUUID();
  const session: CheckoutSession = {
    id,
    consumer_id: draft.consumerId,
    merchant_id: draft.merchantId,
    offer_id: draft.offerId,
    merchant_name: draft.merchantName,
    subtotal_cents: draft.subtotalCents,
    discount_pct: draft.discountPct,
    amount_cents: draft.amountCents,
    line_items: draft.lineItems,
    status: "pending_pay",
    created_at: new Date().toISOString(),
  };
  const map = readLocalSessions();
  map[id] = session;
  writeLocalSessions(map);
  window.dispatchEvent(new CustomEvent("vibepay-new-checkout", { detail: session }));
  return session;
}

export async function insertCheckoutSession(draft: CheckoutDraft): Promise<CheckoutSession | null> {
  const redeemed = await fetchRedeemedOfferIdsForConsumer(draft.consumerId);
  if (redeemed.has(draft.offerId)) return null;

  if (!isSupabaseConfigured()) {
    return insertCheckoutSessionLocal(draft);
  }
  const supabase = getSupabase();
  if (!supabase) return insertCheckoutSessionLocal(draft);

  const { data, error } = await supabase
    .from("checkout_sessions")
    .insert({
      consumer_id: draft.consumerId,
      merchant_id: draft.merchantId,
      offer_id: draft.offerId,
      merchant_name: draft.merchantName,
      subtotal_cents: draft.subtotalCents,
      discount_pct: draft.discountPct,
      amount_cents: draft.amountCents,
      line_items: draft.lineItems,
      status: "pending_pay",
    })
    .select()
    .single();

  if (error) {
    console.error("[supabase] insert checkout_sessions", error.message);
    return insertCheckoutSessionLocal(draft);
  }
  return data as CheckoutSession;
}

export async function fetchCheckoutSession(id: string): Promise<CheckoutSession | null> {
  if (!isSupabaseConfigured()) {
    const map = readLocalSessions();
    return map[id] ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) {
    const map = readLocalSessions();
    return map[id] ?? null;
  }
  const { data, error } = await supabase.from("checkout_sessions").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[supabase] fetch checkout", error.message);
    return null;
  }
  return (data as CheckoutSession) ?? null;
}

export async function completeCheckoutRpc(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return completeCheckoutLocal(sessionId);
  }
  const supabase = getSupabase();
  if (!supabase) return completeCheckoutLocal(sessionId);

  const { data, error } = await supabase.rpc("complete_checkout", { p_session_id: sessionId });
  if (error) {
    console.error("[supabase] complete_checkout", error.message);
    return { ok: false, error: error.message };
  }
  const j = data as { ok?: boolean; error?: string };
  if (!j?.ok) return { ok: false, error: j?.error ?? "unknown" };
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("vibepay-balance-changed"));
  return { ok: true };
}

function completeCheckoutLocal(sessionId: string): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "no_window" };
  initLocalWalletState();
  const map = readLocalSessions();
  const session = map[sessionId];
  if (!session || session.status !== "pending_pay") return { ok: false, error: "bad_session" };

  const cBal = Number(localStorage.getItem(LS_CONSUMER_BAL) ?? "428750");
  if (cBal < session.amount_cents) return { ok: false, error: "insufficient_funds" };

  localStorage.setItem(LS_CONSUMER_BAL, String(cBal - session.amount_cents));
  const mBals = JSON.parse(localStorage.getItem(LS_MERCHANT_BALS) ?? "{}") as Record<string, number>;
  mBals[session.merchant_id] = (mBals[session.merchant_id] ?? 0) + session.amount_cents;
  localStorage.setItem(LS_MERCHANT_BALS, JSON.stringify(mBals));

  session.status = "completed";
  map[sessionId] = session;
  writeLocalSessions(map);

  const ledger = JSON.parse(localStorage.getItem(LS_LEDGER) ?? "[]") as WalletLedgerRow[];
  ledger.unshift({
    id: crypto.randomUUID(),
    consumer_id: session.consumer_id,
    merchant_id: session.merchant_id,
    merchant_name: session.merchant_name,
    checkout_session_id: sessionId,
    amount_cents: session.amount_cents,
    line_items: session.line_items,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(LS_LEDGER, JSON.stringify(ledger));
  rememberLocalRedeemedOfferId(session.offer_id);
  window.dispatchEvent(new CustomEvent("vibepay-balance-changed"));
  return { ok: true };
}

export async function fetchConsumerBalanceCents(consumerId = DEMO_CONSUMER_ID): Promise<number | null> {
  if (!isSupabaseConfigured()) {
    initLocalWalletState();
    const v = Number(localStorage.getItem(LS_CONSUMER_BAL) ?? "428750");
    return Number.isFinite(v) ? v : null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("consumer_profiles")
    .select("wallet_balance_cents")
    .eq("id", consumerId)
    .maybeSingle();
  if (error) {
    console.error("[supabase] consumer balance", error.message);
    return null;
  }
  const row = data as { wallet_balance_cents?: number } | null;
  return row?.wallet_balance_cents ?? null;
}

export async function fetchMerchantBalanceCents(merchantId = DEMO_MERCHANT_ID): Promise<number | null> {
  if (!isSupabaseConfigured()) {
    initLocalWalletState();
    const mBals = JSON.parse(localStorage.getItem(LS_MERCHANT_BALS) ?? "{}") as Record<string, number>;
    const v = mBals[merchantId];
    return typeof v === "number" ? v : 184260;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("merchants")
    .select("wallet_balance_cents")
    .eq("id", merchantId)
    .maybeSingle();
  if (error) {
    console.error("[supabase] merchant balance", error.message);
    return null;
  }
  const row = data as { wallet_balance_cents?: number } | null;
  return row?.wallet_balance_cents ?? null;
}

export async function fetchConsumerLedger(
  consumerId = DEMO_CONSUMER_ID,
  limit = 40,
): Promise<WalletLedgerRow[]> {
  if (!isSupabaseConfigured()) {
    initLocalWalletState();
    const ledger = JSON.parse(localStorage.getItem(LS_LEDGER) ?? "[]") as WalletLedgerRow[];
    return ledger.filter((r) => r.consumer_id === consumerId).slice(0, limit);
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select("*")
    .eq("consumer_id", consumerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] consumer ledger", error.message);
    return [];
  }
  return (data as WalletLedgerRow[]) ?? [];
}

export async function fetchMerchantLedger(
  merchantId = DEMO_MERCHANT_ID,
  limit = 40,
): Promise<WalletLedgerRow[]> {
  if (!isSupabaseConfigured()) {
    initLocalWalletState();
    const ledger = JSON.parse(localStorage.getItem(LS_LEDGER) ?? "[]") as WalletLedgerRow[];
    return ledger.filter((r) => r.merchant_id === merchantId).slice(0, limit);
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] merchant ledger", error.message);
    return [];
  }
  return (data as WalletLedgerRow[]) ?? [];
}

export function subscribeCheckoutSessionsForConsumer(
  consumerId: string,
  onInsert: (session: CheckoutSession) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  if (!isSupabaseConfigured()) {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<CheckoutSession>).detail;
      if (d?.consumer_id === consumerId && d.status === "pending_pay") onInsert(d);
    };
    window.addEventListener("vibepay-new-checkout", handler as EventListener);
    return () => window.removeEventListener("vibepay-new-checkout", handler as EventListener);
  }

  const supabase = getSupabase();
  if (!supabase) return () => {};

  const ch = supabase
    .channel(`checkout_consumer_${consumerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "checkout_sessions",
        filter: `consumer_id=eq.${consumerId}`,
      },
      (payload) => {
        const row = payload.new as CheckoutSession;
        if (row?.status === "pending_pay") onInsert(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(ch);
  };
}
