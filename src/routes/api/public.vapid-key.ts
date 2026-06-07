import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/vapid-key")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.VAPID_PUBLIC_KEY;
        if (!key) return Response.json({ key: null }, { status: 200 });
        return Response.json({ key });
      },
    },
  },
});