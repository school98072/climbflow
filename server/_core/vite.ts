import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, the server is bundled into dist/index.js
  // So import.meta.dirname is 'dist'
  // and public files are in 'dist/public'
  const distPath = path.resolve(import.meta.dirname, "public");
  const indexPath = path.resolve(distPath, "index.html");

  console.log(`[Static] Serving from: ${distPath}`);
  console.log(`[Static] Index path: ${indexPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] CRITICAL: Build directory not found: ${distPath}. Falling back to process.cwd() approach.`
    );
    // Fallback for different deployment structures
    const fallbackPath = path.resolve(process.cwd(), "dist", "public");
    const fallbackIndex = path.resolve(fallbackPath, "index.html");
    
    app.use(express.static(fallbackPath, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (fs.existsSync(fallbackIndex)) {
        res.sendFile(fallbackIndex);
      } else {
        res.status(404).send("Not Found: index.html missing");
      }
    });
    return;
  }

  // 1. Serve static assets
  app.use(express.static(distPath, { index: false }));

  // 2. Handle SPA routing fallback
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not Found: index.html is missing");
    }
  });
}

