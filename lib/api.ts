import type { AnatomyResponse, AskResponse, Diagnosis } from "./types";

// Fetch a same-origin image (e.g. /bike.png) and return it as a base64 data URL.
// We send base64 to the Python functions so the flow is identical in local dev
// and prod (passing a localhost URL to Perceptron wouldn't be reachable).
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load image: ${url}`);
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Downscale a user-picked file (mobile camera photos can be several MB) before
// it's base64-encoded and posted — keeps request bodies small and detection
// fast. The displayed <img> reads its naturalWidth/Height from this same data
// URL, so returned box coordinates stay in sync with what's on screen.
export async function fileToResizedDataUrl(file: File, maxDim = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return blobToDataUrl(file);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return blobToDataUrl(file);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `Request to ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function askAboutPart(
  image: string,
  part: string,
  question: string
): Promise<AskResponse> {
  return postJson<AskResponse>("/api/ask", { image, part, question });
}

export function diagnose(image: string, symptom: string): Promise<Diagnosis> {
  return postJson<Diagnosis>("/api/diagnose", { image, symptom });
}

export function detectAnatomy(
  image: string,
  parts?: string[]
): Promise<AnatomyResponse> {
  return postJson<AnatomyResponse>("/api/anatomy", { image, parts });
}
