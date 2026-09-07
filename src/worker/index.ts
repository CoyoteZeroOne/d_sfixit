import { handleUploadPhoto } from "./uploadPhoto";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/upload-photo" && request.method === "POST") {
      return handleUploadPhoto(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
