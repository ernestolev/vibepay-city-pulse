import { MIA_HOME, type GeoPoint } from "./merchantData";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import { VIBE_ORDER, type VibeKey } from "./vibe";

export const SIMULATOR_ROW_ID = "global";
const LS_KEY = "vibepay_simulator_v1";

export interface SimulatorStateRow {
  id: string;
  vibe: string;
  simulated_time: string | null;
  is_presentation_mode: boolean;
  mia_origin: GeoPoint;
}

export interface SimulatorStatePayload {
  vibe: VibeKey;
  simulatedTime: string | null;
  isPresentationMode: boolean;
  miaOrigin: GeoPoint;
}

function parseVibe(s: string | undefined | null): VibeKey {
  if (s && (VIBE_ORDER as readonly string[]).includes(s)) return s as VibeKey;
  return "sunny";
}

function parseOrigin(v: unknown): GeoPoint {
  if (
    v &&
    typeof v === "object" &&
    "lat" in v &&
    "lng" in v &&
    typeof (v as GeoPoint).lat === "number" &&
    typeof (v as GeoPoint).lng === "number"
  ) {
    return { lat: (v as GeoPoint).lat, lng: (v as GeoPoint).lng };
  }
  return MIA_HOME;
}

export function rowToPayload(row: SimulatorStateRow): SimulatorStatePayload {
  return {
    vibe: parseVibe(row.vibe),
    simulatedTime: row.simulated_time,
    isPresentationMode: row.is_presentation_mode,
    miaOrigin: parseOrigin(row.mia_origin),
  };
}

function payloadToRow(p: SimulatorStatePayload): SimulatorStateRow {
  return {
    id: SIMULATOR_ROW_ID,
    vibe: p.vibe,
    simulated_time: p.simulatedTime,
    is_presentation_mode: p.isPresentationMode,
    mia_origin: p.miaOrigin,
  };
}

export async function fetchSimulatorState(): Promise<SimulatorStatePayload | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("simulator_state")
    .select("*")
    .eq("id", SIMULATOR_ROW_ID)
    .maybeSingle();
  if (error) {
    console.error("[supabase] fetch simulator_state", error);
    return null;
  }
  if (!data) return null;
  return rowToPayload(data as SimulatorStateRow);
}

export async function upsertSimulatorState(p: SimulatorStatePayload): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("simulator_state")
    .upsert(payloadToRow(p), { onConflict: "id" });
  if (error) console.error("[supabase] upsert simulator_state", error);
}

export function loadSimulatorFromLocalStorage(): SimulatorStatePayload | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<SimulatorStatePayload>;
    if (!o || typeof o !== "object") return null;
    return {
      vibe: parseVibe(o.vibe as string),
      simulatedTime: typeof o.simulatedTime === "string" || o.simulatedTime === null ? o.simulatedTime : null,
      isPresentationMode: Boolean(o.isPresentationMode),
      miaOrigin: o.miaOrigin ? parseOrigin(o.miaOrigin) : MIA_HOME,
    };
  } catch {
    return null;
  }
}

export function saveSimulatorToLocalStorage(p: SimulatorStatePayload): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
