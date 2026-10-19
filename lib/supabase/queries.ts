import { supabase } from "./client";
import type { Work, Theater } from "./types";

/**
 * 演目マスタを sort_order 順で取得。
 */
export async function fetchWorks(): Promise<Work[]> {
  const { data, error } = await supabase
    .from("shiki_works")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 劇場マスタを sort_order 順で取得。
 */
export async function fetchTheaters(): Promise<Theater[]> {
  const { data, error } = await supabase
    .from("shiki_theaters")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
