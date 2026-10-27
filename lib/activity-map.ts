import type { ActivityRecord } from "./activity";

export interface ActivityPlace { venue_key: string; latitude: number; longitude: number }
export interface MemoryTower { key: string; venue: string; city: string; latitude: number; longitude: number; records: ActivityRecord[] }
export const MAP_COLORS = { theatre: "#315b49", movie: "#577f9b", fanmeeting: "#8a6396", concert: "#ba9451", other: "#8d8979" };
// Exact names + a compatible area only. A city centre is never a venue location.
export const KNOWN_PLACES = [
  { names: ["大阪四季劇場"], cities: ["", "大阪", "大阪市", "大阪府", "梅田", "大阪府大阪市"], latitude: 34.69983, longitude: 135.49456, source: "https://www.herbis.jp/shop/detail/97" },
  { names: ["舞浜アンフィシアター"], cities: ["", "舞浜", "浦安", "浦安市", "千葉", "千葉県", "千葉県浦安市"], latitude: 35.6326, longitude: 139.8892, source: "https://www.maihama-amphitheater.jp/access/" },
] as const;
export function placeText(value: string) { return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, ""); }
export function venueKey(venue: string, city: string) { return JSON.stringify([placeText(venue), placeText(city)]); }
export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 20 && latitude <= 46 && longitude >= 122 && longitude <= 154;
}
export function normalizePlace(value: unknown): ActivityPlace & { venue: string; city: string } {
  if (!value || typeof value !== "object") throw new Error("会場の位置を確認してください。");
  const r = value as Record<string, unknown>;
  if (typeof r.venue !== "string" || !r.venue.trim() || r.venue.length > 500 || typeof r.city !== "string" || r.city.length > 200 || !validCoordinates(r.latitude, r.longitude)) throw new Error("会場名と日本国内の緯度・経度を確認してください。");
  return { venue: r.venue.trim(), city: r.city.trim(), venue_key: venueKey(r.venue, r.city), latitude: r.latitude as number, longitude: r.longitude as number };
}
export function resolvePlace(record: Pick<ActivityRecord, "venue" | "city">, places: ActivityPlace[]) {
  const saved = places.find(p => p.venue_key === venueKey(record.venue, record.city) && validCoordinates(p.latitude, p.longitude));
  if (saved) return saved;
  return KNOWN_PLACES.find(p => p.names.some(n => placeText(n) === placeText(record.venue)) && p.cities.some(c => placeText(c) === placeText(record.city))) || null;
}
export function buildTowers(records: ActivityRecord[], places: ActivityPlace[]) {
  const groups = new Map<string, MemoryTower>();
  for (const r of records) {
    const location = resolvePlace(r, places); if (!location) continue;
    const key = venueKey(r.venue, r.city);
    const tower = groups.get(key) || { key, venue: r.venue, city: r.city, latitude: location.latitude, longitude: location.longitude, records: [] };
    tower.records.push(r); groups.set(key, tower);
  }
  return [...groups.values()].sort((a, b) => b.records.length - a.records.length || a.key.localeCompare(b.key));
}
// Date is reliable; unknown same-day times are grouped, never presented as a travel order.
export function replaySteps(records: ActivityRecord[]) {
  const dates = [...new Set(records.map(r => r.date))].sort();
  return dates.map(date => ({ date, records: records.filter(r => r.date === date).sort((a, b) => (a.time || "").localeCompare(b.time || "") || a.id.localeCompare(b.id)) }));
}
export function projectPlace(longitude: number, latitude: number): [number, number] { return [60 + (longitude - 122) * 33, 55 + (46 - latitude) * 24]; }
export function clusterTowers(towers: MemoryTower[], zoom: number) {
  const clusters: { x: number; y: number; towers: MemoryTower[] }[] = [];
  for (const tower of towers) {
    const [x, y] = projectPlace(tower.longitude, tower.latitude);
    const near = clusters.find(c => Math.hypot(c.x - x, c.y - y) * zoom < 40);
    if (near) { near.towers.push(tower); const n = near.towers.length; near.x += (x - near.x) / n; near.y += (y - near.y) / n; }
    else clusters.push({ x, y, towers: [tower] });
  }
  return clusters.sort((a, b) => a.y - b.y);
}
