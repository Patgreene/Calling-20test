import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: false,
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function devApiPlugin(): Plugin {
  return {
    name: "dev-api-plugin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/contact", (req, res, next) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", () => {
          try {
            const body = JSON.parse(raw || "{}");
            const name = body.name;
            const email = body.email;
            const message = body.message ?? body.comment ?? "";
            if (!name || !email || !message) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: "Name, email, and message are required",
                }),
              );
              return;
            }
            const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
            if (webhookUrl) {
              fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  email,
                  message,
                  source: "site-contact",
                  timestamp: new Date().toISOString(),
                }),
              })
                .then(async (resp) => {
                  if (!resp.ok) {
                    const text = await resp.text().catch(() => "");
                    throw new Error(`Webhook failed: ${resp.status} ${text}`);
                  }
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      message:
                        "Thank you for your message. We'll get back to you soon!",
                    }),
                  );
                })
                .catch((err) => {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error: "Failed to submit contact form",
                      message: String(err?.message || err),
                    }),
                  );
                });
              return;
            } else {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  message:
                    "Thank you for your message. We'll get back to you soon!",
                }),
              );
            }
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Failed to submit contact form",
                message: e.message,
              }),
            );
          }
        });
      });
    },
  };
}
