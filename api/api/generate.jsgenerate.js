import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Vercel parses JSON bodies automatically when sent with application/json
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    const { seed = "", temperature = 0.9 } = body || {};

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const instructions = `You are an imaginative music trend oracle. Invent original, fictional micro-genres 
that sound plausible but are not existing genres. Avoid reusing known genre names. 
Always return STRICT JSON that matches the provided JSON Schema. Use inventive, 
modern, evocative language. Keep the title punchy (max 3 words) and the tagline a 
single line (max 140 chars). The visuals should loosely match the vibe.`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: [
        { role: "user", content: `Create one entirely new music micro-genre. It must not be an existing genre.
Seed vibe (optional): ${seed || "surprise"}.` }
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
              title: { type: "string" },
              tagline: { type: "string" },
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
                  font_style: { type: "string", enum: ["sans","serif","mono","display","hand","blackletter"] },
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

    const jsonText = response.output_text || "{}";
    let data;
    try { data = JSON.parse(jsonText); }
    catch {
      const chunks = response?.output?.[0]?.content || [];
      const firstText = chunks.find(c => c.type === "output_text")?.text || chunks.find(c => c.type === "text")?.text || "{}";
      data = JSON.parse(firstText);
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: err?.message || "Server error" });
  }
}
