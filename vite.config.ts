import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
      server.middlewares.use("/api/create-recording", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          try {
            const body = JSON.parse(raw || "{}");
            const { voucher_name, vouchee_name, voucher_email, voucher_phone } = body;
            if (!voucher_name || !vouchee_name || !voucher_email || !voucher_phone) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Missing required fields" }));
              return;
            }
            const url = process.env.SUPABASE_URL;
            const key = process.env.SUPABASE_ANON_KEY;
            if (url && key) {
              const resp = await fetch(`${url}/rest/v1/interview_recordings`, {
                method: "POST",
                headers: {
                  apikey: key,
                  Authorization: `Bearer ${key}`,
                  "Content-Type": "application/json",
                  Prefer: "return=representation",
                },
                body: JSON.stringify({ voucher_name, vouchee_name, voucher_email, voucher_phone }),
              });
              const data = await resp.json().catch(() => ({}));
              res.statusCode = resp.ok ? 200 : 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(resp.ok ? { success: true, record: data[0] } : { error: "Supabase insert failed", details: data }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, record: { id: "dev-mock-id" } }));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Failed to create", message: e.message }));
          }
        });
      });

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
              res.end(JSON.stringify({ error: "Name, email, and message are required" }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                message: "Thank you for your message. We'll get back to you soon!",
              })
            );
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Failed to submit contact form", message: e.message }));
          }
        });
      });
    },
  };
}
