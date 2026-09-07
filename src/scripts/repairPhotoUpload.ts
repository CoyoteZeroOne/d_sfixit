import { escapeHtml } from "../lib/escapeHtml";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — matches the Worker's own limit.

interface PhotoUpload {
  file: File;
  url: string | null;
  status: "uploading" | "done" | "error";
  error?: string;
}

/**
 * Wires a file input to upload each selected image to `/api/upload-photo`
 * and record the resulting URL(s) in a hidden field, so the surrounding
 * <form> can keep submitting as a plain POST to Web3Forms — the photos
 * arrive as extra text data (a list of links), not as attached files.
 */
export function initPhotoUpload(
  inputId: string,
  hiddenFieldId: string,
  listId: string,
): void {
  const input = document.getElementById(inputId);
  const hiddenField = document.getElementById(hiddenFieldId);
  const list = document.getElementById(listId);
  if (
    !(input instanceof HTMLInputElement) ||
    !(hiddenField instanceof HTMLInputElement) ||
    !list
  ) {
    return;
  }

  const uploads: PhotoUpload[] = [];

  input.addEventListener("change", () => {
    const remainingSlots = Math.max(MAX_FILES - uploads.length, 0);
    const files = Array.from(input.files ?? []).slice(0, remainingSlots);
    for (const file of files) {
      const upload: PhotoUpload = { file, url: null, status: "uploading" };
      uploads.push(upload);
      void runUpload(upload, uploads, hiddenField, list);
    }
    renderUploadList(list, uploads);
    input.value = "";
  });
}

async function runUpload(
  upload: PhotoUpload,
  uploads: PhotoUpload[],
  hiddenField: HTMLInputElement,
  list: HTMLElement,
): Promise<void> {
  try {
    upload.url = await uploadPhoto(upload.file);
    upload.status = "done";
  } catch (error) {
    upload.status = "error";
    upload.error = error instanceof Error ? error.message : "Upload failed.";
  }
  syncHiddenField(hiddenField, uploads);
  renderUploadList(list, uploads);
}

async function uploadPhoto(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("too large — 8MB max");
  }
  const response = await fetch("/api/upload-photo", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const data = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? "upload failed");
  }
  return data.url;
}

function syncHiddenField(
  hiddenField: HTMLInputElement,
  uploads: PhotoUpload[],
): void {
  hiddenField.value = uploads
    .filter((upload) => upload.status === "done" && upload.url !== null)
    .map((upload) => upload.url)
    .join(", ");
}

function renderUploadList(list: HTMLElement, uploads: PhotoUpload[]): void {
  list.innerHTML = uploads
    .map((upload) => {
      const name = escapeHtml(upload.file.name);
      if (upload.status === "uploading") return `<li>${name} — uploading…</li>`;
      if (upload.status === "error")
        return `<li>${name} — ${escapeHtml(upload.error ?? "failed")}</li>`;
      return `<li>${name} — attached</li>`;
    })
    .join("");
}
