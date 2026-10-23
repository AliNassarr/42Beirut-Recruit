import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";

/**
 * Multi-Provider AI Engine with Cascading Failover & BYOK (Bring Your Own Key)
 * Primary: Google Gemini (gemini-2.5-flash)
 * Secondary Failover: Groq Cloud (llama-3.3-70b-versatile / llama-3.1-8b-instant)
 * Tertiary Failover: OpenAI (gpt-4o-mini)
 */

export function getGeminiModel(customKey?: string | null, modelName = "gemini-2.5-flash") {
  const apiKey = (customKey && customKey.trim()) || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelName);
}

export function getGroqModel(customKey?: string | null, modelName = "llama-3.3-70b-versatile") {
  const apiKey = (customKey && customKey.trim()) || process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
  return groq(modelName);
}

export function getOpenAIModel(customKey?: string | null, modelName = "gpt-4o-mini") {
  const apiKey = (customKey && customKey.trim()) || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const openai = createOpenAI({ apiKey });
  return openai(modelName);
}

/**
 * Returns the highest-priority configured model based on custom keys and environment variables.
 */
export function getAIModel(customKey?: string | null) {
  return getGeminiModel(customKey) || getGroqModel() || getOpenAIModel();
}

export interface FailoverExecutionOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodSchema<T>;
  userGeminiKey?: string | null;
  userGroqKey?: string | null;
  temperature?: number;
}

export interface FailoverResult<T> {
  success: boolean;
  data?: T;
  usedProvider: "gemini" | "groq" | "openai" | null;
  error?: string;
}

/**
 * Detects if an error is caused by rate limiting (HTTP 429), quota exhaustion, or temporary server issues.
 */
function isRateLimitOrServerError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const status = err.status || err.statusCode || (err.response && err.response.status);
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    status === 502 ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("overloaded") ||
    msg.includes("fetch failed")
  );
}

/**
 * Executes structured single-pass synthesis with cascading failover.
 * Sequence:
 * 1. User Gemini Key (if provided) OR Campus Gemini (process.env.GOOGLE_GENERATIVE_AI_API_KEY)
 * 2. On 429 / 5xx error -> Failover immediately to Groq Cloud (llama-3.3-70b-versatile)
 * 3. On Groq failure -> Failover to OpenAI (gpt-4o-mini if configured)
 */
export async function executeStructuredFailover<T>(
  options: FailoverExecutionOptions<T>
): Promise<FailoverResult<T>> {
  const { system, prompt, schema, userGeminiKey, userGroqKey, temperature = 0.1 } = options;

  // -------------------------------------------------------------
  // 1. Attempt Primary: Google Gemini
  // -------------------------------------------------------------
  const geminiModel = getGeminiModel(userGeminiKey);
  if (geminiModel) {
    try {
      console.log(`[AI Engine] Attempting generation with Google Gemini 2.5 Flash...`);
      const result = await generateObject({
        model: geminiModel,
        schema,
        mode: "json",
        system,
        prompt,
        temperature,
      });

      if (result && result.object) {
        console.log(`[AI Engine] Generation succeeded via Google Gemini 2.5 Flash`);
        return {
          success: true,
          data: result.object,
          usedProvider: "gemini",
        };
      }
    } catch (geminiError: any) {
      console.warn(
        `[AI Engine] Gemini error (${geminiError.status || geminiError.message}). Evaluating failover...`
      );
      if (!isRateLimitOrServerError(geminiError) && !userGroqKey && !process.env.GROQ_API_KEY) {
        // If it's a non-retriable error and no fallback key is available, report it
        console.warn(`[AI Engine] Gemini failed and no Groq fallback is configured:`, geminiError.message);
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Cascading Failover: Groq Cloud (llama-3.3-70b-versatile)
  // -------------------------------------------------------------
  const groqModel = getGroqModel(userGroqKey, "llama-3.3-70b-versatile") || getGroqModel(userGroqKey, "llama-3.1-8b-instant");
  if (groqModel) {
    try {
      console.log(`[AI Engine] Cascading to Groq Cloud (llama-3.3-70b-versatile)...`);
      const result = await generateObject({
        model: groqModel,
        schema,
        mode: "json",
        system,
        prompt,
        temperature,
      });

      if (result && result.object) {
        console.log(`[AI Engine] Generation succeeded via Groq Cloud failover!`);
        return {
          success: true,
          data: result.object,
          usedProvider: "groq",
        };
      }
    } catch (groqError: any) {
      console.warn(`[AI Engine] Groq failover error:`, groqError.message);
    }
  }

  // -------------------------------------------------------------
  // 3. Tertiary Fallback: OpenAI (if configured)
  // -------------------------------------------------------------
  const openaiModel = getOpenAIModel();
  if (openaiModel) {
    try {
      console.log(`[AI Engine] Cascading to OpenAI (gpt-4o-mini)...`);
      const result = await generateObject({
        model: openaiModel,
        schema,
        mode: "json",
        system,
        prompt,
        temperature,
      });

      if (result && result.object) {
        console.log(`[AI Engine] Generation succeeded via OpenAI failover!`);
        return {
          success: true,
          data: result.object,
          usedProvider: "openai",
        };
      }
    } catch (openaiError: any) {
      console.warn(`[AI Engine] OpenAI fallback error:`, openaiError.message);
    }
  }

  return {
    success: false,
    usedProvider: null,
    error: "All configured AI providers (Gemini, Groq, OpenAI) failed or exceeded quota.",
  };
}

/**
 * Text-based cascading failover for bullet rewrites or freeform generation.
 */
export async function executeTextFailover(options: {
  system: string;
  prompt: string;
  userGeminiKey?: string | null;
  userGroqKey?: string | null;
}): Promise<{ success: boolean; text?: string; usedProvider: "gemini" | "groq" | "openai" | null; error?: string }> {
  const { system, prompt, userGeminiKey, userGroqKey } = options;

  const geminiModel = getGeminiModel(userGeminiKey);
  if (geminiModel) {
    try {
      const res = await generateText({ model: geminiModel, system, prompt });
      if (res.text) return { success: true, text: res.text, usedProvider: "gemini" };
    } catch (e: any) {
      console.warn(`[AI Text Engine] Gemini failed (${e.message}), trying Groq...`);
    }
  }

  const groqModel = getGroqModel(userGroqKey);
  if (groqModel) {
    try {
      const res = await generateText({ model: groqModel, system, prompt });
      if (res.text) return { success: true, text: res.text, usedProvider: "groq" };
    } catch (e: any) {
      console.warn(`[AI Text Engine] Groq failed (${e.message}), trying OpenAI...`);
    }
  }

  const openaiModel = getOpenAIModel();
  if (openaiModel) {
    try {
      const res = await generateText({ model: openaiModel, system, prompt });
      if (res.text) return { success: true, text: res.text, usedProvider: "openai" };
    } catch (e: any) {
      console.warn(`[AI Text Engine] OpenAI failed: ${e.message}`);
    }
  }

  return {
    success: false,
    usedProvider: null,
    error: "All AI providers failed or were unavailable.",
  };
}

/**
 * Strict System Prompt enforcing Dr. Wissam's grounded engineering style
 */
export const DR_WISSAM_SYSTEM_PROMPT = `
You are the official PrintCV Resume Engine ("PrintCV"), designed strictly around CEO Dr. Wissam Sammouri's reference CV template.
You translate student questionnaire answers into clear, concise, professional engineering CV bullet points.

STRICT WRITING RULES:
1. SIMPLE, DIRECT ENGINEERING ENGLISH:
   - DO NOT use robotic AI buzzwords ("spearheaded", "synergized", "orchestrated cutting-edge paradigm", "revolutionized", "leveraged", "pioneered").
   - Match the grounded, humble tone of Dr. Wissam's template:
     * "Developed a service to automatically perform a set of unit tests daily..."
     * "Created an application using C++ and sockets to handle..."
     * "Implemented non-blocking I/O using poll() for concurrent client connections..."
     * "Built a custom Unix shell in C supporting pipelines and redirections..."
2. 100% FACTUAL ACCURACY:
   - ONLY write about tools, algorithms, and features the student explicitly stated in their questionnaire answers.
   - NEVER invent fake metrics, user counts, or unverified claims.
3. ABSOLUTE BAN ON EM-DASHES (—):
   - NEVER output the em-dash character (—) under any circumstance.
   - Use standard commas, periods, or regular hyphens (-) if needed.
   - For date ranges, use standard en-dash (–) like "2024 – Present".
4. BULLET POINT FORMULA:
   - Each bullet should be 1 to 2 lines (30-160 characters).
   - Start with an action verb in past tense ("Developed", "Built", "Implemented", "Designed", "Configured", "Optimized", "Integrated").
   - Mention the specific technologies and technical mechanisms used.
`;
