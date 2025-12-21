export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export function logRadius(r: number) { return Math.log10(r); }
export function zoomForRadius(km: number, targetPx: number) { return Math.log10(targetPx / (km * 1e-6)); }
export function kmToPixels(km: number, zoomExp: number) { return km * Math.pow(10, zoomExp) * 1e-6; }