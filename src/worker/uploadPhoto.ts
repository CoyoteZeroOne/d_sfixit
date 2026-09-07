const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

const EXTENSIONS_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/**
 * Stores one uploaded image in R2 and returns its public URL. The request
 * body is the raw image bytes (see src/scripts/repairPhotoUpload.ts) — no
 * multipart parsing needed, and no auth beyond basic type/size checks,
 * since this is a small public community site rather than a high-value
 * target. Revisit if it ever attracts abuse.
 */
export async function handleUploadPhoto(
  request: Request,
  env: Env,
): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  const extension = EXTENSIONS_BY_CONTENT_TYPE[contentType];
  if (!extension) {
    return jsonResponse(
      { error: "Only JPEG, PNG, GIF, WEBP, or HEIC images are accepted." },
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_BYTES) {
    return jsonResponse({ error: "Image is too large — 8MB max." }, 413);
  }
  if (!request.body) {
    return jsonResponse({ error: "No image data received." }, 400);
  }

  const key = `${crypto.randomUUID()}.${extension}`;
  await env.REPAIR_PHOTOS.put(key, request.body, {
    httpMetadata: { contentType },
  });

  return jsonResponse({ url: `${env.R2_PUBLIC_URL_BASE}/${key}` }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
