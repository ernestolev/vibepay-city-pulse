import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import { DEMO_CONSUMER_ID } from "./consumerProfileSupabase";

export type ConsumerPushNotificationRow = {
  id: string;
  consumer_id: string;
  client_notification_id: string | null;
  title: string;
  subtitle: string;
  body: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  created_at: string;
  dismissed_at?: string | null;
};

export type PersistPushInput = {
  id: string;
  title: string;
  subtitle: string;
  body?: string;
  merchantId: string;
  merchantName: string;
};

const PUSH_SELECT =
  "id, consumer_id, client_notification_id, title, subtitle, body, merchant_id, merchant_name, created_at, dismissed_at";

/**
 * Insert or update by `client_notification_id` so the same proximity merchant
 * produces a single lock-screen row (refreshed copy, clears dismiss).
 */
export async function persistPushNotification(input: PersistPushInput): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: existing, error: selErr } = await supabase
    .from("consumer_push_notifications")
    .select("id")
    .eq("consumer_id", DEMO_CONSUMER_ID)
    .eq("client_notification_id", input.id)
    .maybeSingle();

  if (selErr) {
    console.error("[supabase] select consumer_push_notifications", selErr.message, selErr.code);
    return;
  }

  const now = new Date().toISOString();
  const patch = {
    title: input.title,
    subtitle: input.subtitle,
    body: input.body ?? null,
    merchant_id: input.merchantId,
    merchant_name: input.merchantName,
    dismissed_at: null as string | null,
    created_at: now,
  };

  if (existing?.id) {
    const { error } = await supabase.from("consumer_push_notifications").update(patch).eq("id", existing.id);
    if (error) {
      console.error(
        "[supabase] update consumer_push_notifications",
        error.message,
        error.code,
        error.details ?? "",
      );
      return;
    }
  } else {
    const { error } = await supabase.from("consumer_push_notifications").insert({
      consumer_id: DEMO_CONSUMER_ID,
      client_notification_id: input.id,
      ...patch,
    });
    if (error) {
      console.error(
        "[supabase] insert consumer_push_notifications",
        error.message,
        error.code,
        error.details ?? "",
        error.hint ?? "",
      );
      return;
    }
  }

  if (import.meta.env.DEV) {
    console.info("[VibePay] Push guardado en DB:", input.merchantName, "—", input.title.slice(0, 56));
  }
}

export async function fetchRecentPushNotifications(limit = 12): Promise<ConsumerPushNotificationRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("consumer_push_notifications")
    .select(PUSH_SELECT)
    .eq("consumer_id", DEMO_CONSUMER_ID)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(
      "[supabase] fetch consumer_push_notifications",
      error.message,
      error.code,
      error.details ?? "",
    );
    return [];
  }
  if (import.meta.env.DEV) {
    console.info("[VibePay] Lock screen: cargadas", (data ?? []).length, "notificaciones (consumer_id=", DEMO_CONSUMER_ID, ")");
  }
  return (data ?? []) as ConsumerPushNotificationRow[];
}

export async function dismissLockNotificationRow(rowId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("consumer_push_notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", rowId)
    .eq("consumer_id", DEMO_CONSUMER_ID);
  if (error) {
    console.error("[supabase] dismiss consumer_push_notifications", error.message, error.code);
  }
}

export function subscribePushNotifications(handlers: {
  onInsert: (row: ConsumerPushNotificationRow) => void;
  onUpdate?: (row: ConsumerPushNotificationRow) => void;
}): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`consumer-push-${DEMO_CONSUMER_ID}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "consumer_push_notifications",
        filter: `consumer_id=eq.${DEMO_CONSUMER_ID}`,
      },
      (payload) => {
        const row = payload.new as ConsumerPushNotificationRow;
        if (row.dismissed_at) return;
        handlers.onInsert(row);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "consumer_push_notifications",
        filter: `consumer_id=eq.${DEMO_CONSUMER_ID}`,
      },
      (payload) => {
        handlers.onUpdate?.(payload.new as ConsumerPushNotificationRow);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
