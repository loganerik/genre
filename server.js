import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/generate", async (req, res) => {
  try {
    const { seed = "", temperature = 0.9 } = req.body || {};

    const instructions = `You are an imaginative music trend oracle. Invent original, fictional micro-genres \nthat sound plausible but are not existing genres. Avoid reusing known genre names. \nAlways return STRICT JSON that matches the provided JSON Schema. Use inventive, \nmodern, evocative language. Keep the title punchy (max 3 words) and the tagline a \nsingle line (max 140 chars). The visuals should loosely match the vibe.`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: [
        {
          role: "user",
          content: `Create one entirely new music micro-genre. It must not be an existing genre.\nSeed vibe (optional): ${seed || "surprise"}.`
        }
      ],
      temperature: Math.max(0, Math.min(1.3, Number(temperature) || 0.9)),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "GenreCard",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "tagline", "palette", "visuals"],
            properties: {
              title: { type: "string", description: "2–3 words max, invented genre title. No quotes." },
              tagline: { type: "string", description: "<= 140 chars, single line, evocative but concrete." },
              palette: {
                type: "object",
                additionalProperties: false,
                required: ["bg", "primary", "secondary", "accent", "text"],
                properties: {
                  bg: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                  primary: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                  secondary: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                  accent: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                  text: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" }
                }
              },
              visuals: {
                type: "object",
                additionalProperties: false,
                required: ["font_style", "texture", "shape", "mood", "weight"],
                properties: {
                  font_style: { type: "string", enum: ["sans", "serif", "mono", "display", "hand", "blackletter"] },
                  weight: { type: "string", enum: ["200","300","400","500","600","700","800","900"] },
                  texture: { type: "string", enum: ["grain","gloss","paper","vhs","nebula","neon","linen","noise"] },
                  shape: { type: "string", enum: ["waves","grid","dots","stripes","rings","spray","burst","checker"] },
                  mood: { type: "string" }
                }
              }
            }
          }
        }
      }
    });

    // The official SDK exposes a convenience string
    const jsonText = response.output_text;
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      // Fallback: try to extract the first text chunk if output_text missing in older SDKs
      const chunks = response?.output?.[0]?.content || [];
      const firstText = chunks.find(c => c.type === "output_text")?.text || chunks.find(c => c.type === "text")?.text || "{}";
      data = JSON.parse(firstText);
    }

    return res.json({ ok: true, data });
  } catch (err) {
    console.error("/api/generate error", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: err?.message || "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Genre Generator listening on :${PORT}`));
