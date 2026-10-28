import { projectPlace } from "./activity-map";
export interface TravelPoint { latitude: number; longitude: number }
export function travelScene(from: TravelPoint, to: TravelPoint, progress: number, viewportHeight = 570) {
  const p = Math.max(0, Math.min(1, progress)), eased = p * p * (3 - 2 * p);
  const a = projectPlace(from.longitude, from.latitude), b = projectPlace(to.longitude, to.latitude);
  const dx = b[0] - a[0], dy = b[1] - a[1], distance = Math.hypot(dx, dy), nearby = distance < .05;
  const start = nearby ? [b[0] - 14, b[1] + 3] : a;
  const vx = b[0] - start[0], vy = b[1] - start[1], length = Math.hypot(vx, vy);
  const bend = Math.min(length * .16, 20);
  const control = [(start[0] + b[0]) / 2 + vy / length * bend, (start[1] + b[1]) / 2 - vx / length * bend];
  const t = eased, u = 1 - t;
  const point = [u*u*start[0] + 2*u*t*control[0] + t*t*b[0], u*u*start[1] + 2*u*t*control[1] + t*t*b[1]];
  const tangent = [2*u*(control[0]-start[0]) + 2*t*(b[0]-control[0]), 2*u*(control[1]-start[1]) + 2*t*(b[1]-control[1])];
  const fit = Math.min(6200, 650 / Math.max(Math.abs(vx)*1.3, Math.abs(vy)*1.8, .1));
  const zoom = fit * (.95 + .25 * Math.sin(p * Math.PI));
  const mid = [(start[0] + b[0]) / 2, (start[1] + b[1]) / 2];
  const camera = [mid[0] * .65 + point[0] * .35, mid[1] * .65 + point[1] * .35];
  const screen = [500 + (point[0]-camera[0])*zoom, viewportHeight/2 + (point[1]-camera[1])*zoom];
  return { start, end: b, control, point, camera, zoom, screen, nearby, angle: Math.atan2(tangent[1],tangent[0])*180/Math.PI, path: `M${start.join(",")} Q${control.join(",")} ${b.join(",")}`, mapTransform: `translate(500 ${viewportHeight/2}) scale(${zoom}) translate(${-camera[0]} ${-camera[1]})` };
}
