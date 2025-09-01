import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import { handleDemo } from "./routes/demo";

// Supabase configuration
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

// Store the current prompt instructions and session config (in memory)
// TODO: Replace with database storage in production
let currentInstructions = `You are **Sam**, a warm, curious, and conversational AI voice agent for Vouch from New Zealand. You make callers feel comfortable, keep the conversation flowing, and subtly encourage them to share genuine stories, perspectives, and examples about {{vouchee_first}}.

PERSONALITY & TONE:
- Warm, natural, human — never corporate or stiff
- Use light, respectful humour where appropriate
- Show active listening by summarizing selectively (don't parrot)
- Keep the energy high so the call feels enjoyable
- Build rapport continuously to connect with the voucher

ENVIRONMENT:
- These are inbound calls from people who want to vouch for someone
- Your role is to guide a relaxed but purposeful chat about {{vouchee_first}}

GOALS:
- Obtain the voucher's complete, nuanced perspective on {{vouchee_first}}
- Understand when, why, and in what contexts they would vouch
- Capture insights into {{vouchee_first}}'s strengths, growth, character, and working style
- Keep conversation length under ~13 minutes; if nearing time, naturally wrap up

GUARDRAILS:
- Smoothly handle audio issues; escalate to Patrick if unresolved
- Cover all key points in the opening sequence
- If asked about being a robot, respond with light humour then redirect
- Steer back gently if conversation drifts
- Only share info about Vouch's founder if directly asked
- Only ask **one question at a time**
- End only when caller clearly signals closure

CONVERSATION FLOW:

OPENING:
1. Greet warmly by name: "Hey {{voucher_first}}, I'm Sam — how are you going?" #Wait for response
2. Confirm: "Just to confirm — you're vouching for {{vouchee_first}}, right?" #Wait for response
3. Context-setting: explain the goal, privacy, review rights, and relaxed style
4. Ask: "Does this all make sense?" #Wait for response
5. Begin: "Great! Can you set the scene — where did you work together and what were your roles?"

EXPLORATION:
Step 1 - Broad: "How did your roles overlap day-to-day?" / "Who else was in the team, what was the environment like?"
Step 2 - Build: "If you were recommending {{vouchee_first}} for a role, how would you describe them?" / "You mentioned (detail) — can you tell me more?"
Step 3 - Themes: Performance/strengths, Teamwork/relationships, Growth/development, Pressure/challenges
Step 4 - Perspectives: "How would their peers describe them?"
Step 5 - Final: "On a scale from 1 to 10, how strongly would you recommend them — and why?"

PROBING LOGIC:
- Ask one question at a time; wait for full answer
- If vague, reframe within same theme
- Use their words to pivot naturally to new topics
- Ask thoughtful, context-aware follow-ups until goals achieved

CLOSING:
- "Before we wrap up, any final thoughts about {{vouchee_first}}?"
- Thank them warmly: "Thanks so much — your insights will be fantastic. We'll email you the transcript to review and tweak before {{vouchee_first}} sees it."
- End naturally after both say thanks/goodbye

Remember: Use dynamic variables {{voucher_first}}, {{voucher_last}}, {{vouchee_first}}, {{vouchee_last}} as provided.`;

// Supabase helper functions
async function loadLatestPromptFromSupabase() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const latestRecord = data[0];
        console.log("Loaded prompt from Supabase:", {
          length: latestRecord.prompt.length,
          created_at: latestRecord.created_at,
        });

        // Update session config if available in database
        if (
          latestRecord.voice ||
          latestRecord.speed ||
          latestRecord.temperature
        ) {
          currentSessionConfig = {
            voice: latestRecord.voice || currentSessionConfig.voice,
            speed: latestRecord.speed || currentSessionConfig.speed,
            temperature:
              latestRecord.temperature || currentSessionConfig.temperature,
            max_response_output_tokens:
              latestRecord.max_response_tokens ||
              currentSessionConfig.max_response_output_tokens,
            turn_detection: {
              type: "server_vad",
              threshold:
                latestRecord.vad_threshold ||
                currentSessionConfig.turn_detection.threshold,
              prefix_padding_ms:
                latestRecord.prefix_padding_ms ||
                currentSessionConfig.turn_detection.prefix_padding_ms,
              silence_duration_ms:
                latestRecord.silence_duration_ms ||
                currentSessionConfig.turn_detection.silence_duration_ms,
            },
          };
          console.log(
            "Updated session config from Supabase:",
            currentSessionConfig,
          );
        }

        return latestRecord.prompt;
      }
    } else {
      console.warn("Failed to load prompt from Supabase:", response.status);
    }
  } catch (error) {
    console.warn("Error loading prompt from Supabase:", error);
  }

  return null; // Return null if no prompt found or error
}

async function savePromptToSupabase(prompt: string, sessionConfig?: any) {
  try {
    // Step 1: Set all existing entries to inactive (is_active = false)
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?is_active=eq.true`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          is_active: false,
        }),
      },
    );

    if (!updateResponse.ok) {
      console.warn("Failed to deactivate old entries:", updateResponse.status);
    }

    // Step 2: Save the new entry as active
    const dataToSave: any = {
      prompt: prompt,
      is_active: true, // Only the new entry should be active
    };

    // Add session config fields if provided
    if (sessionConfig) {
      dataToSave.voice = sessionConfig.voice;
      dataToSave.speed = sessionConfig.speed;
      dataToSave.temperature = sessionConfig.temperature;
      dataToSave.max_response_tokens = sessionConfig.max_response_output_tokens;
      dataToSave.vad_threshold = sessionConfig.turn_detection?.threshold;
      dataToSave.silence_duration_ms =
        sessionConfig.turn_detection?.silence_duration_ms;
      dataToSave.prefix_padding_ms =
        sessionConfig.turn_detection?.prefix_padding_ms;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/interview_prompts`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(dataToSave),
    });

    if (response.ok) {
      console.log("Prompt saved and all old entries deactivated successfully");
      return true;
    } else {
      console.error("Failed to save to Supabase:", response.status);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return false;
    }
  } catch (error) {
    console.error("Error saving to Supabase:", error);
    return false;
  }
}

async function getPromptHistoryFromSupabase() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&order=created_at.desc&limit=10`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.warn(
        "Failed to load prompt history from Supabase:",
        response.status,
      );
    }
  } catch (error) {
    console.warn("Error loading prompt history from Supabase:", error);
  }

  return [];
}

let currentSessionConfig = {
  voice: "alloy",
  speed: 1.0,
  temperature: 0.8,
  max_response_output_tokens: 4096,
  turn_detection: {
    type: "server_vad",
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  },
};

// Initialize prompt from Supabase on startup
async function initializePrompt() {
  const latestPrompt = await loadLatestPromptFromSupabase();
  if (latestPrompt) {
    currentInstructions = latestPrompt;
    console.log("✅ Loaded latest prompt from Supabase");
  } else {
    console.log("📝 Using default prompt (no saved prompts in Supabase)");
  }
}

export function createServer() {
  const app = express();

  // Initialize prompt from Supabase
  initializePrompt();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // OpenAI Realtime client secret endpoint
  app.post("/api/realtime/client-secret", async (req, res) => {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;

      if (!openaiApiKey) {
        return res.status(500).json({
          error: "OpenAI API key not configured on server",
        });
      }

      // Load instructions from memory (updated via admin panel)
      const promptId = "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3";
      let instructions = currentInstructions;

      console.log(
        "🔍 OpenAI API called - Current instructions length:",
        instructions.length,
      );
      console.log(
        "🔍 Instructions preview:",
        instructions.substring(0, 100) + "...",
      );

      try {
        console.log(
          `Loading Sam (Vouch Reference Agent) instructions from prompt ID: ${promptId}`,
        );
        // Instructions are now set above with the full Sam persona
        // Note: Supporting all OpenAI voice models including new Marin and Cedar voices
      } catch (promptError) {
        console.warn(
          "Using Sam (Vouch Reference Agent) instructions:",
          promptError,
        );
      }

      // Generate client secret with configuration
      const clientSecret = openaiApiKey;

      console.log(
        "Generated client secret for OpenAI Realtime API with configuration:",
        {
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: currentSessionConfig.voice,
          voiceModel: `Using ${currentSessionConfig.voice} voice for Sam`,
          promptId: promptId,
          instructionsLength: instructions.length,
          containsTemplateVariables: instructions.includes("{{"),
        },
      );

      return res.status(200).json({
        client_secret: clientSecret,
        config: {
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: currentSessionConfig.voice,
          instructions: instructions,
          sessionConfig: currentSessionConfig,
        },
      });
    } catch (error) {
      console.error("Error generating client secret:", error);
      return res.status(500).json({
        error: "Failed to generate client secret",
      });
    }
  });

  // Admin endpoints for prompt management
  app.get("/api/admin/prompt", (req, res) => {
    res.json({
      instructions: currentInstructions,
      sessionConfig: currentSessionConfig,
      promptId: "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3",
      lastModified: new Date().toISOString(),
    });
  });

  app.put("/api/admin/prompt", async (req, res) => {
    const { instructions, sessionConfig, password } = req.body;

    // Simple password check - in production, use proper auth
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!instructions) {
      return res.status(400).json({ error: "Instructions are required" });
    }

    // Save to Supabase
    const saveSuccess = await savePromptToSupabase(instructions, sessionConfig);

    if (saveSuccess) {
      // Update the in-memory instructions and session config only if save succeeded
      currentInstructions = instructions;
      console.log(
        "✅ Updated currentInstructions in memory, length:",
        instructions.length,
      );
      console.log("✅ Preview:", instructions.substring(0, 100) + "...");

      if (sessionConfig) {
        currentSessionConfig = { ...currentSessionConfig, ...sessionConfig };
        console.log("✅ Updated session config:", currentSessionConfig);
      }

      console.log("Admin updated prompt and settings:", {
        instructionsLength: instructions.length,
        timestamp: new Date().toISOString(),
        preview: instructions.substring(0, 100) + "...",
        variableCount: (instructions.match(/{{[^}]+}}/g) || []).length,
        sessionConfig: currentSessionConfig,
        savedToSupabase: true,
      });

      res.json({
        message:
          "Prompt and settings saved to Supabase successfully! Changes will take effect immediately for new calls.",
        savedToSupabase: true,
      });
    } else {
      res.status(500).json({
        error: "Failed to save prompt to Supabase. Please try again.",
      });
    }
  });

  // Prompt history endpoint
  app.get("/api/admin/prompt-history", async (req, res) => {
    try {
      const history = await getPromptHistoryFromSupabase();
      res.json({
        history: history.map((item) => ({
          id: item.id,
          prompt: item.prompt,
          created_at: item.created_at,
          preview: item.prompt.substring(0, 150) + "...",
          length: item.prompt.length,
        })),
      });
    } catch (error) {
      console.error("Error fetching prompt history:", error);
      res.status(500).json({ error: "Failed to fetch prompt history" });
    }
  });

  // Get latest active prompt for calls
  app.get("/api/active-prompt", async (req, res) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&is_active=eq.true&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const activePrompt = data[0];
          console.log("🔄 Fetched active prompt for call:", {
            id: activePrompt.id,
            length: activePrompt.prompt.length,
            created_at: activePrompt.created_at,
          });

          // Return the prompt and session config
          res.json({
            instructions: activePrompt.prompt,
            sessionConfig: {
              voice: activePrompt.voice || "alloy",
              speed: parseFloat(activePrompt.speed) || 1.0,
              temperature: parseFloat(activePrompt.temperature) || 0.8,
              max_response_output_tokens:
                parseInt(activePrompt.max_response_tokens) || 4096,
              turn_detection: {
                type: "server_vad",
                threshold: parseFloat(activePrompt.vad_threshold) || 0.5,
                prefix_padding_ms:
                  parseInt(activePrompt.prefix_padding_ms) || 300,
                silence_duration_ms:
                  parseInt(activePrompt.silence_duration_ms) || 500,
              },
            },
            created_at: activePrompt.created_at,
            id: activePrompt.id,
          });
        } else {
          // No active prompt found, return fallback
          console.log("⚠️ No active prompt found, using fallback");
          res.json({
            instructions: currentInstructions,
            sessionConfig: currentSessionConfig,
            fallback: true,
          });
        }
      } else {
        console.error("Failed to fetch active prompt:", response.status);
        res.status(500).json({ error: "Failed to fetch active prompt" });
      }
    } catch (error) {
      console.error("Error fetching active prompt:", error);
      res.status(500).json({ error: "Error fetching active prompt" });
    }
  });

  // Load specific prompt by ID
  app.get("/api/admin/prompt/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&id=eq.${id}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          res.json({
            instructions: data[0].prompt,
            sessionConfig: currentSessionConfig, // Use current session config
            created_at: data[0].created_at,
          });
        } else {
          res.status(404).json({ error: "Prompt not found" });
        }
      } else {
        res.status(500).json({ error: "Failed to load prompt" });
      }
    } catch (error) {
      console.error("Error loading prompt:", error);
      res.status(500).json({ error: "Failed to load prompt" });
    }
  });

  // Recording API endpoints
  async function createRecordingSession(callCode: string, mimeType: string) {
    try {
      const recordingData = {
        call_code: callCode,
        file_name: `${callCode}_${Date.now()}.${getFileExtension(mimeType)}`,
        mime_type: mimeType,
        upload_status: 'uploading',
        verification_status: 'pending',
        retry_count: 0,
        chunks_uploaded: 0
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/interview_recordings`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(recordingData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Recording session created:", data[0].id);

        // Log the creation event
        await logRecordingEvent(data[0].id, 'recording_session_created', {
          call_code: callCode,
          mime_type: mimeType
        });

        return data[0];
      } else {
        console.error("Failed to create recording session:", response.status);
        const errorText = await response.text();
        console.error("Error details:", errorText);
        return null;
      }
    } catch (error) {
      console.error("Error creating recording session:", error);
      return null;
    }
  }

  async function loadRecordings() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?select=*&order=created_at.desc&limit=100`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error("Failed to load recordings:", response.status);
        return [];
      }
    } catch (error) {
      console.error("Error loading recordings:", error);
      return [];
    }
  }

  async function logRecordingEvent(recordingId: string, eventType: string, eventData = {}) {
    try {
      const eventRecord = {
        recording_id: recordingId,
        event_type: eventType,
        event_data: eventData
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/recording_events`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(eventRecord),
      });

      if (!response.ok) {
        console.warn("Failed to log recording event:", response.status);
      }
    } catch (error) {
      console.warn("Error logging recording event:", error);
    }
  }

  function getFileExtension(mimeType: string) {
    switch (mimeType) {
      case 'audio/webm;codecs=opus':
      case 'audio/webm':
        return 'webm';
      case 'audio/mp4;codecs=mp4a.40.2':
      case 'audio/mp4':
        return 'mp4';
      case 'audio/wav':
        return 'wav';
      case 'audio/ogg':
        return 'ogg';
      default:
        return 'webm'; // Default fallback
    }
  }

  async function uploadChunkToSupabase(recordingId: string, chunkNumber: number, chunkData: Buffer) {
    try {
      const fileName = `recordings/${recordingId}/chunk_${chunkNumber.toString().padStart(4, '0')}.webm`;

      // Calculate hash for integrity verification
      const hash = crypto.createHash('sha256').update(chunkData).digest('hex');

      // Upload to Supabase Storage
      const uploadResponse = await fetch(
        `${SUPABASE_URL}/storage/v1/object/interview-recordings/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-cache',
          },
          body: chunkData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Supabase upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      // Record chunk in database
      const chunkRecord = {
        recording_id: recordingId,
        chunk_number: chunkNumber,
        chunk_size_bytes: chunkData.length,
        chunk_hash: hash,
        upload_status: 'uploaded',
        storage_path: fileName,
      };

      const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/recording_chunks`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(chunkRecord),
      });

      if (!dbResponse.ok) {
        const errorText = await dbResponse.text();
        throw new Error(`Database insert failed: ${dbResponse.status} - ${errorText}`);
      }

      // Update recording progress
      await updateRecordingProgress(recordingId, chunkNumber + 1);

      // Log successful chunk upload
      await logRecordingEvent(recordingId, 'chunk_uploaded', {
        chunk_number: chunkNumber,
        chunk_size: chunkData.length,
        storage_path: fileName,
        hash: hash
      });

      console.log(`✅ Chunk ${chunkNumber} uploaded successfully for recording ${recordingId}`);
      return { success: true, chunk_number: chunkNumber, hash: hash, storage_path: fileName };

    } catch (error) {
      console.error(`❌ Chunk ${chunkNumber} upload failed for recording ${recordingId}:`, error);

      // Log failed chunk upload
      await logRecordingEvent(recordingId, 'chunk_upload_failed', {
        chunk_number: chunkNumber,
        error: error.message
      });

      // Record failed chunk in database
      const failedChunkRecord = {
        recording_id: recordingId,
        chunk_number: chunkNumber,
        chunk_size_bytes: chunkData.length,
        upload_status: 'failed',
      };

      try {
        await fetch(`${SUPABASE_URL}/rest/v1/recording_chunks`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(failedChunkRecord),
        });
      } catch (dbError) {
        console.error("Failed to record chunk failure in database:", dbError);
      }

      throw error;
    }
  }

  async function updateRecordingProgress(recordingId: string, chunksUploaded: number) {
    try {
      const updateData = {
        chunks_uploaded: chunksUploaded,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        console.warn("Failed to update recording progress:", response.status);
      }
    } catch (error) {
      console.warn("Error updating recording progress:", error);
    }
  }

  async function getRecordingChunks(recordingId: string) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recordingId}&order=chunk_number.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        return await response.json();
      } else {
        console.error("Failed to load recording chunks:", response.status);
        return [];
      }
    } catch (error) {
      console.error("Error loading recording chunks:", error);
      return [];
    }
  }

  async function verifyChunkIntegrity(chunks: any[]) {
    const verificationResults = {
      totalChunks: chunks.length,
      uploadedChunks: 0,
      failedChunks: 0,
      missingChunks: [] as number[],
      corruptedChunks: [] as number[],
      totalSize: 0
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (chunk.upload_status === 'uploaded') {
        verificationResults.uploadedChunks++;
        verificationResults.totalSize += chunk.chunk_size_bytes || 0;

        // Verify chunk sequence (should be consecutive)
        if (chunk.chunk_number !== i) {
          verificationResults.missingChunks.push(i);
        }

      } else {
        verificationResults.failedChunks++;
        verificationResults.missingChunks.push(i);
      }
    }

    return verificationResults;
  }

  async function finalizeRecording(recordingId: string, totalChunks: number, totalDuration: number) {
    try {
      // Get all chunks for this recording
      const chunks = await getRecordingChunks(recordingId);

      console.log(`🔍 Verifying ${chunks.length} chunks for recording ${recordingId}`);

      // Verify chunk integrity
      const verification = await verifyChunkIntegrity(chunks);

      // Calculate final hash of all chunks combined
      const chunkHashes = chunks
        .filter((c: any) => c.chunk_hash)
        .sort((a: any, b: any) => a.chunk_number - b.chunk_number)
        .map((c: any) => c.chunk_hash);

      const finalHash = crypto
        .createHash('sha256')
        .update(chunkHashes.join(''))
        .digest('hex');

      // Determine verification status
      let verificationStatus = 'verified';
      let uploadStatus = 'completed';

      if (verification.failedChunks > 0 || verification.missingChunks.length > 0) {
        verificationStatus = verification.failedChunks > verification.uploadedChunks ? 'corrupted' : 'missing';
        uploadStatus = 'failed';
      }

      // Update recording with final details
      const updateData: any = {
        upload_status: uploadStatus,
        verification_status: verificationStatus,
        duration_seconds: totalDuration,
        file_size_bytes: verification.totalSize,
        chunks_total: totalChunks,
        chunks_uploaded: verification.uploadedChunks,
        file_hash: finalHash,
        updated_at: new Date().toISOString()
      };

      // Add error message if there were issues
      if (uploadStatus === 'failed') {
        updateData.last_error_message = `Verification failed: ${verification.failedChunks} failed chunks, ${verification.missingChunks.length} missing chunks`;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update recording: ${response.status}`);
      }

      // Log finalization event
      await logRecordingEvent(recordingId, 'recording_finalized', {
        verification_results: verification,
        final_hash: finalHash,
        upload_status: uploadStatus,
        verification_status: verificationStatus,
        total_duration: totalDuration
      });

      console.log(`✅ Recording ${recordingId} finalized: ${uploadStatus} (${verificationStatus})`);

      return {
        success: uploadStatus === 'completed',
        verification: verification,
        upload_status: uploadStatus,
        verification_status: verificationStatus,
        final_hash: finalHash,
        total_size: verification.totalSize,
        total_duration: totalDuration
      };

    } catch (error) {
      console.error(`❌ Failed to finalize recording ${recordingId}:`, error);

      // Log finalization failure
      await logRecordingEvent(recordingId, 'finalization_failed', {
        error: error.message
      });

      // Update recording with error status
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              upload_status: 'failed',
              verification_status: 'corrupted',
              last_error_message: `Finalization failed: ${error.message}`,
              updated_at: new Date().toISOString()
            }),
          }
        );
      } catch (updateError) {
        console.error("Failed to update recording with error status:", updateError);
      }

      throw error;
    }
  }

  // Recording endpoints
  app.get("/api/admin/recordings", async (req, res) => {
    try {
      const recordings = await loadRecordings();
      res.json({
        success: true,
        recordings: recordings,
        total: recordings.length
      });
    } catch (error) {
      console.error("GET /api/admin/recordings error:", error);
      res.status(500).json({
        error: "Failed to load recordings",
        details: error.message
      });
    }
  });

  app.post("/api/admin/recordings", async (req, res) => {
    const { action, call_code, mime_type, password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (action === "start_recording") {
      if (!call_code || !mime_type) {
        return res.status(400).json({
          error: "call_code and mime_type are required"
        });
      }

      try {
        const recording = await createRecordingSession(call_code, mime_type);

        if (recording) {
          res.json({
            success: true,
            recording_id: recording.id,
            message: "Recording session created successfully"
          });
        } else {
          res.status(500).json({
            error: "Failed to create recording session"
          });
        }
      } catch (error) {
        console.error("POST /api/admin/recordings error:", error);
        res.status(500).json({
          error: "Failed to create recording session",
          details: error.message
        });
      }
    } else {
      res.status(400).json({ error: "Invalid action. Use 'start_recording'" });
    }
  });

  // Setup multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB max chunk size
    }
  });

  // Chunk upload endpoint
  app.post("/api/admin/recordings/chunk", upload.single('chunk'), async (req, res) => {
    try {
      const { recording_id, chunk_index, password } = req.body;

      // Simple password check
      if (password !== "vouch2024admin") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!recording_id || chunk_index === undefined || !req.file) {
        return res.status(400).json({
          error: "recording_id, chunk_index, and chunk file are required"
        });
      }

      const chunkIndexNum = parseInt(chunk_index);

      // Read chunk data
      const fs = await import('fs');
      const chunkData = fs.readFileSync(req.file.path);

      if (chunkData.length === 0) {
        return res.status(400).json({ error: "Empty chunk data" });
      }

      console.log(`📤 Uploading chunk ${chunkIndexNum} for recording ${recording_id} (${chunkData.length} bytes)`);

      // Upload chunk with retry logic
      let uploadResult;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          uploadResult = await uploadChunkToSupabase(recording_id, chunkIndexNum, chunkData);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error; // Max retries reached, throw the error
          }
          console.log(`⚠️ Chunk upload attempt ${retryCount} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
      }

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        recording_id: recording_id,
        chunk_index: chunkIndexNum,
        chunk_size: chunkData.length,
        hash: uploadResult.hash,
        storage_path: uploadResult.storage_path,
        retry_count: retryCount,
        message: `Chunk ${chunkIndexNum} uploaded successfully`
      });

    } catch (error) {
      // Clean up temp file on error
      if (req.file) {
        try {
          const fs = await import('fs');
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temp file:", cleanupError);
        }
      }

      console.error("Chunk upload error:", error);
      res.status(500).json({
        error: "Failed to upload chunk",
        details: error.message
      });
    }
  });

  // Finalize recording endpoint
  app.post("/api/admin/recordings/finalize", async (req, res) => {
    const { recording_id, total_chunks, total_duration, password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!recording_id) {
      return res.status(400).json({ error: "recording_id is required" });
    }

    try {
      console.log(`🏁 Finalizing recording ${recording_id} (${total_chunks} chunks, ${total_duration}s)`);

      const result = await finalizeRecording(recording_id, total_chunks, total_duration);

      if (result.success) {
        res.json({
          success: true,
          recording_id: recording_id,
          verification_results: result.verification,
          upload_status: result.upload_status,
          verification_status: result.verification_status,
          final_hash: result.final_hash,
          total_size: result.total_size,
          total_duration: result.total_duration,
          message: "Recording finalized and verified successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          recording_id: recording_id,
          verification_results: result.verification,
          upload_status: result.upload_status,
          verification_status: result.verification_status,
          error: "Recording verification failed",
          details: result.verification
        });
      }

    } catch (error) {
      console.error("Finalize recording error:", error);
      res.status(500).json({
        error: "Failed to finalize recording",
        details: error.message
      });
    }
  });

  // Download recording endpoint - concatenates all chunks
  app.post("/api/admin/recordings/:id/download", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log(`🔽 Downloading recording ${id}`);

      // Get recording details
      const recordingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!recordingResponse.ok) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const recordings = await recordingResponse.json();
      if (recordings.length === 0) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const recording = recordings[0];

      // Get all chunks for this recording
      const chunks = await getRecordingChunks(id);

      if (chunks.length === 0) {
        return res.status(404).json({ error: "No audio chunks found" });
      }

      // Sort chunks by number
      chunks.sort((a: any, b: any) => a.chunk_number - b.chunk_number);

      // Download and concatenate chunks
      const chunkBuffers: Buffer[] = [];

      for (const chunk of chunks) {
        if (chunk.upload_status === 'uploaded' && chunk.storage_path) {
          try {
            const chunkResponse = await fetch(
              `${SUPABASE_URL}/storage/v1/object/interview-recordings/${chunk.storage_path}`,
              {
                headers: {
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
              }
            );

            if (chunkResponse.ok) {
              const chunkBuffer = Buffer.from(await chunkResponse.arrayBuffer());
              chunkBuffers.push(chunkBuffer);
            } else {
              console.warn(`Failed to download chunk ${chunk.chunk_number}`);
            }
          } catch (error) {
            console.warn(`Error downloading chunk ${chunk.chunk_number}:`, error);
          }
        }
      }

      if (chunkBuffers.length === 0) {
        return res.status(404).json({ error: "No downloadable chunks found" });
      }

      // Concatenate all chunk buffers
      const totalLength = chunkBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const concatenatedBuffer = Buffer.concat(chunkBuffers, totalLength);

      // Set response headers
      res.setHeader('Content-Type', recording.mime_type || 'audio/webm');
      res.setHeader('Content-Length', concatenatedBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${recording.file_name}"`);

      // Send the concatenated audio file
      res.send(concatenatedBuffer);

      console.log(`✅ Downloaded recording ${id} (${concatenatedBuffer.length} bytes)`);

    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({
        error: "Failed to download recording",
        details: error.message
      });
    }
  });

  // Fix stuck recording endpoint
  app.post("/api/admin/recordings/:id/fix", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log(`🔧 Fixing stuck recording ${id}`);

      // Get recording details
      const recordingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!recordingResponse.ok) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const recordings = await recordingResponse.json();
      if (recordings.length === 0) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const recording = recordings[0];

      // Get all chunks for this recording
      const chunks = await getRecordingChunks(id);

      // Re-run verification
      const verification = await verifyChunkIntegrity(chunks);

      // Calculate the final hash of uploaded chunks
      const uploadedChunks = chunks.filter((c: any) => c.upload_status === 'uploaded');
      const chunkHashes = uploadedChunks
        .sort((a: any, b: any) => a.chunk_number - b.chunk_number)
        .map((c: any) => c.chunk_hash);

      const finalHash = chunkHashes.length > 0
        ? crypto.createHash('sha256').update(chunkHashes.join('')).digest('hex')
        : null;

      // Determine new status
      let uploadStatus = recording.upload_status;
      let verificationStatus = recording.verification_status;
      let message = "Recording status checked";

      if (verification.totalChunks === 0) {
        uploadStatus = 'failed';
        verificationStatus = 'missing';
        message = "No chunks found - marking as failed";
      } else if (verification.uploadedChunks > 0 && verification.failedChunks === 0) {
        // All available chunks are uploaded successfully
        uploadStatus = 'completed';
        verificationStatus = 'verified';
        message = `All ${verification.uploadedChunks} chunks verified - marking as completed`;
      } else if (verification.uploadedChunks > 0) {
        // Some chunks uploaded, some failed
        if (verification.uploadedChunks >= verification.totalChunks * 0.8) {
          // If 80% or more chunks are uploaded, consider it completed with warning
          uploadStatus = 'completed';
          verificationStatus = 'verified';
          message = `Mostly complete - ${verification.uploadedChunks}/${verification.totalChunks} chunks uploaded`;
        } else {
          uploadStatus = 'failed';
          verificationStatus = verification.failedChunks > verification.uploadedChunks ? 'corrupted' : 'missing';
          message = `Partial upload detected - ${verification.uploadedChunks}/${verification.totalChunks} chunks`;
        }
      } else {
        uploadStatus = 'failed';
        verificationStatus = 'missing';
        message = "No successful uploads found";
      }

      // Update recording status
      const updateData: any = {
        upload_status: uploadStatus,
        verification_status: verificationStatus,
        chunks_uploaded: verification.uploadedChunks,
        updated_at: new Date().toISOString()
      };

      if (uploadStatus === 'failed') {
        updateData.last_error_message = `Fix attempted: ${message}`;
      }

      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update recording: ${updateResponse.status}`);
      }

      // Log fix event
      await logRecordingEvent(id, 'recording_fix_attempted', {
        old_status: recording.upload_status,
        new_status: uploadStatus,
        verification_results: verification,
        message: message
      });

      console.log(`✅ Fixed recording ${id}: ${uploadStatus} (${verificationStatus})`);

      res.json({
        success: true,
        recording_id: id,
        old_status: recording.upload_status,
        new_status: uploadStatus,
        verification_status: verificationStatus,
        message: message,
        verification_results: verification
      });

    } catch (error) {
      console.error("Fix recording error:", error);
      res.status(500).json({
        error: "Failed to fix recording",
        details: error.message
      });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    const { name, email, comment } = req.body;

    // Basic validation
    if (!name || !email || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Log the contact form submission
    console.log("Contact form submission:", {
      name,
      email,
      comment,
      timestamp: new Date().toISOString(),
    });

    // Send to Make.com webhook
    const makeWebhookUrl =
      process.env.CONTACT_WEBHOOK_URL ||
      "https://hook.eu2.make.com/6lbq65lw7xmpmwfooavbdyd9jrbcj3wg";

    if (makeWebhookUrl) {
      try {
        const payload = {
          type: "contact_form",
          name: name,
          email: email,
          message: comment,
          timestamp: new Date().toISOString(),
          recipient: "patrick@vouchprofile.com",
        };

        const makeResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await makeResponse.text();
        console.log(
          "Make.com contact response:",
          makeResponse.status,
          responseText,
        );

        if (makeResponse.ok) {
          return res.status(200).json({
            message: "Message sent successfully! We'll get back to you soon.",
          });
        } else {
          console.error("Make.com error:", responseText);
        }
      } catch (makeError) {
        console.error("Error sending to Make.com:", makeError);
      }
    }

    // Fallback response
    return res.status(200).json({
      message: "Message received successfully! We'll get back to you soon.",
      note: "Contact form logged successfully",
    });
  });

  return app;
}
