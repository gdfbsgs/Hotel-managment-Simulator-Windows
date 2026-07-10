import express from "express";
import path from "path";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import {
  buildSystemInstruction,
  enrichUserPrompt,
  normalizeAiFloors,
} from "./src/aiHotel.ts";
import { ScenerySpec, SceneryItem } from "./src/types.ts";

dotenv.config({ path: ".env.local" });
dotenv.config();


const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error(
        "GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your key from https://aistudio.google.com/apikey"
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "archhotel-windows",
        },
      },
    });
  }
  return aiClient;
}

function openBrowser(url: string) {
  if (process.env.OPEN_BROWSER === "false") return;

  let command: string;
  let args: string[];

  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true, shell: process.platform === "win32" });
    child.on("error", () => console.log(`Open your browser manually: ${url}`));
    child.unref();
  } catch {
    console.log(`Open your browser manually: ${url}`);
  }
}

async function startServer() {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      status: "ok",
      platform: process.platform,
      geminiConfigured: Boolean(key && key !== "MY_GEMINI_API_KEY"),
      port: PORT,
    });
  });

  // Scenery: Google Places around hotel location (with deterministic fallback)
  app.post("/api/scenery-from-location", async (req, res) => {
    try {
      const { lat, lng, radiusMeters } = req.body as {
        lat: number;
        lng: number;
        radiusMeters?: number;
      };

      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "lat/lng required" });
      }

      const radius = typeof radiusMeters === "number" ? radiusMeters : 200;
      const specBase: ScenerySpec = {
        center: { lat, lng },
        radiusMeters: radius,
        items: [],
        generatedAt: new Date().toISOString(),
        source: "fallback",
      };

      const googleKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleKey || googleKey === "MY_GOOGLE_MAPS_API_KEY") {
        // Deterministic fallback around the location.
        const seed = Math.abs(Math.floor((lat + lng) * 10000));
        const rng = (n: number) => {
          const x = Math.sin(seed + n) * 10000;
          return x - Math.floor(x);
        };

        const typeCycle: SceneryItem["type"][] = [
          "park",
          "landmark",
          "restaurant",
          "water",
          "road",
          "natural",
          "poi",
          "generic",
        ];

        const items: SceneryItem[] = [];
        const cap = 30;
        for (let i = 0; i < cap; i++) {
          const angle = (i / cap) * Math.PI * 2;
          const dist = (0.15 + rng(i) * 0.85) * radius;
          const dLat = (dist * Math.cos(angle)) / 111320;
          const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
          const t = typeCycle[i % typeCycle.length];
          items.push({
            id: `fallback-${i}`,
            type: t,
            lat: lat + dLat,
            lng: lng + dLng,
            name:
              t === "park"
                ? "Scenic Park"
                : t === "landmark"
                ? "City Landmark"
                : t === "water"
                ? "Water Feature"
                : t === "restaurant"
                ? "Local Eatery"
                : t === "road"
                ? "Main Road"
                : t === "natural"
                ? "Natural View"
                : t === "poi"
                ? "Nearby POI"
                : "Generic Point",
            score: 0.3 + rng(i + 99) * 0.7,
          });
        }

        return res.json({ ...specBase, items, source: "fallback" });
      }

      // Google Places Nearby Search (REST)
      const fetchJson = async (url: string) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Google request failed: ${r.status}`);
        return r.json() as Promise<any>;
      };

      const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

      const types: Array<{ type: string; weight: number }> = [
        { type: "park", weight: 1.0 },
        { type: "tourist_attraction", weight: 0.9 },
        { type: "landmark", weight: 0.9 },
        { type: "restaurant", weight: 1.0 },
        { type: "natural_feature", weight: 0.7 },
        { type: "lodging", weight: 0.4 },
        // roads/water are not reliable via Places types; approximate with more general results
        { type: "shopping_mall", weight: 0.25 },
      ];

      const all: SceneryItem[] = [];
      const seen = new Set<string>();

      for (let i = 0; i < types.length; i++) {
        const t = types[i];
        const url = `${baseUrl}?key=${encodeURIComponent(googleKey)}&location=${lat},${lng}&radius=${Math.round(
          radius
        )}&type=${encodeURIComponent(t.type)}&rankby=distance`;

        const data = await fetchJson(url);
        const results: any[] = Array.isArray(data.results) ? data.results : [];

        for (const p of results) {
          const placeId = p.place_id ? String(p.place_id) : null;
          if (!placeId || seen.has(placeId)) continue;

          const pLat = p.geometry?.location?.lat;
          const pLng = p.geometry?.location?.lng;
          if (typeof pLat !== "number" || typeof pLng !== "number") continue;

          // Map google place types to our scenery item types (stylized categories)
          const gTypes: string[] = Array.isArray(p.types) ? p.types : [];

          const mapType = (): SceneryItem["type"] => {
            if (gTypes.includes("park") || t.type === "park") return "park";
            if (t.type === "restaurant") return "restaurant";
            if (t.type === "natural_feature") return "natural";
            if (t.type === "tourist_attraction") return "landmark";
            if (t.type === "landmark") return "landmark";
            if (t.type === "lodging") return "poi";
            if (t.type === "shopping_mall") return "poi";
            return "generic";
          };

          const mapped = mapType();

          all.push({
            id: placeId,
            type: mapped,
            lat: pLat,
            lng: pLng,
            name: p.name ? String(p.name) : undefined,
            placeId,
            score: typeof p.rating === "number" ? Math.max(0, Math.min(1, p.rating / 5)) : t.weight,
          });
          seen.add(placeId);

          if (all.length >= 30) break;
        }

        if (all.length >= 30) break;
      }

      return res.json({
        ...specBase,
        items: all.slice(0, 30),
        source: "google-places",
      });
    } catch (e: any) {
      // Fallback to deterministic spec on errors, but return 200 to keep UX simple
      const { lat, lng, radiusMeters } = req.body || {};
      const radius = typeof radiusMeters === "number" ? radiusMeters : 200;
      if (typeof lat === "number" && typeof lng === "number") {
        const seed = Math.abs(Math.floor((lat + lng) * 10000));
        const rng = (n: number) => {
          const x = Math.sin(seed + n) * 10000;
          return x - Math.floor(x);
        };
        const typeCycle: SceneryItem["type"][] = [
          "park",
          "landmark",
          "restaurant",
          "water",
          "road",
          "natural",
          "poi",
          "generic",
        ];
        const cap = 30;
        const items: SceneryItem[] = [];
        for (let i = 0; i < cap; i++) {
          const angle = (i / cap) * Math.PI * 2;
          const dist = (0.15 + rng(i) * 0.85) * radius;
          const dLat = (dist * Math.cos(angle)) / 111320;
          const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
          const t = typeCycle[i % typeCycle.length];
          items.push({
            id: `fallback-err-${i}`,
            type: t,
            lat: lat + dLat,
            lng: lng + dLng,
            name: "Nearby",
            score: 0.2,
          });
        }
        return res.json({
          center: { lat, lng },
          radiusMeters: radius,
          items,
          generatedAt: new Date().toISOString(),
          source: "fallback",
        } satisfies ScenerySpec);
      }

      return res.status(500).json({ error: "Scenery generation failed" });
    }
  });

  app.post("/api/generate-hotel", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = getGenAI();

      const userPrompt = enrichUserPrompt(
        typeof prompt === "string" && prompt.trim()
          ? prompt.trim()
          : "Design a functional boutique hotel."
      );

      const generate = async (contents: string) => {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: buildSystemInstruction(),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                floors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      level: {
                        type: Type.INTEGER,
                        description:
                          "The level index of the floor (starting at 0 for ground floor)",
                      },
                      name: {
                        type: Type.STRING,
                        description:
                          "Name of the floor (e.g., 'Ground Floor', 'Level 1')",
                      },
                      grid: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description:
                          "Array of exactly 20 strings. Each string must be exactly 20 characters long representing one row of the grid.",
                      },
                      labels: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            x: {
                              type: Type.INTEGER,
                              description: "X coordinate of the label text (0 to 19)",
                            },
                            y: {
                              type: Type.INTEGER,
                              description: "Y coordinate of the label text (0 to 19)",
                            },
                            text: {
                              type: Type.STRING,
                              description: "Label text describing the area",
                            },
                          },
                          required: ["x", "y", "text"],
                        },
                        description: "List of labels for this floor.",
                      },
                    },
                    required: ["level", "name", "grid", "labels"],
                  },
                  description:
                    "List of hotel floors. Generate 2-6 floors depending on the request, up to 10 floors max.",
                },
              },
              required: ["floors"],
            },
          },
        });

        if (!response.text) {
          throw new Error("No response content generated by the AI model.");
        }

        return JSON.parse(response.text.trim());
      };

      const promptWithRetry =
        userPrompt +
        '\n\nRetry instructions: If the layout is invalid, regenerate it. Ensure every door D connects to exactly one room tile and exactly one hallway tile, and all . hallway tiles are connected. Do not output a literal copy of an existing hotel.';

      let lastError: Error | null = null;
      let parsed: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          parsed = await generate(attempt === 0 ? userPrompt : promptWithRetry);
          if (!parsed.floors || !Array.isArray(parsed.floors) || parsed.floors.length === 0) {
            throw new Error("AI returned an invalid floor plan. Try a simpler prompt.");
          }
          const floors = normalizeAiFloors(parsed.floors);
          return res.json({ floors });
        } catch (err: unknown) {
          if (err instanceof Error) {
            lastError = err;
            console.warn(`AI generation attempt ${attempt + 1} failed: ${err.message}`);
          } else {
            lastError = new Error("Unknown AI generation failure.");
          }
        }
      }

      throw lastError ?? new Error("Failed to generate a valid hotel layout.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate layout";
      console.error(err);
      const status = message.includes("GEMINI_API_KEY") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const url = `http://localhost:${PORT}`;
    console.log("");
    console.log("  ArchHotel Simulator (Windows Edition)");
    console.log("  -------------------------------------");
    console.log(`  Server:  ${url}`);
    console.log(
      `  AI:      ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" ? "Ready" : "Not configured (presets still work)"}`
    );
    console.log("  Saves:   Auto-saved to your browser (local storage)");
    console.log("");
    openBrowser(url);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
