/**
 * A/B Test Script: Context Compression Token Savings
 *
 * Sends identical messages to two OpenClaw Telegram bots via UniPile,
 * with a configurable delay between them. One instance has the
 * context-compress skill installed, the other runs raw.
 *
 * Setup:
 *   1. Deploy two OpenClaw instances from Railway template
 *   2. Create two Telegram bots via BotFather
 *   3. Connect each bot to its respective OpenClaw instance
 *   4. Start a chat with each bot from your Telegram account
 *   5. Fill in the config below
 *   6. Run: bun run test/ab-test.ts
 *
 * Prerequisites:
 *   bun add unipile-node-sdk
 */

import { UnipileClient } from "unipile-node-sdk";

// ─── CONFIG ────────────────────────────────────────────────────────────
const CONFIG = {
  // UniPile
  unipileBaseUrl: process.env.UNIPILE_BASE_URL || "https://api1.unipile.com:13111",
  unipileApiKey: process.env.UNIPILE_API_KEY || "",

  // Telegram chat IDs (from UniPile, not Telegram's native IDs)
  // Find these by running: bun run test/ab-test.ts --list-chats
  botA_chatId: process.env.BOT_A_CHAT_ID || "", // compressed instance
  botB_chatId: process.env.BOT_B_CHAT_ID || "", // baseline instance

  // Delay between sending to Bot A and Bot B (ms)
  delayBetweenBots: 20_000, // 20 seconds

  // Delay between test messages (ms) — wait for bot to finish responding
  delayBetweenMessages: 60_000, // 60 seconds
};

// ─── TEST MESSAGES ─────────────────────────────────────────────────────
// These simulate a realistic day of conversations.
// Mix of simple and complex to test compression across scenarios.
const TEST_MESSAGES = [
  // Simple recall — does the bot know user preferences?
  "What package manager do I use?",

  // Memory lookup — requires reading compressed vs raw memory
  "Remind me what decisions we made about the database?",

  // Skill invocation — triggers skill index lookup
  "Can you run a healthcheck on my deployment?",

  // Coding task — typical dev workflow
  "Help me write a function that validates email addresses in TypeScript",

  // Multi-step reasoning — longer context usage
  "I need to set up authentication for my Next.js app with Supabase. What are the steps?",

  // Memory about people/entities
  "When is my next meeting with Alice?",

  // Opinion/preference recall
  "How do I feel about over-engineering?",

  // Debug scenario — tests lesson recall
  "I'm getting an error with Expo EAS build. Any tips?",

  // Infrastructure question
  "Where is my app deployed and what's the repo URL?",

  // Wrap-up
  "Give me a summary of what we discussed today",
];

// ─── HELPERS ───────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// ─── LIST CHATS ────────────────────────────────────────────────────────
async function listTelegramChats(client: UnipileClient) {
  console.log("Fetching Telegram chats...\n");
  const response = await client.messaging.getAllChats({
    account_type: "TELEGRAM",
    limit: 50,
  });

  console.log("ID                         | Name");
  console.log("---------------------------|---------------------------");
  for (const chat of response.items) {
    console.log(`${chat.id} | ${chat.name || "(unnamed)"}`);
  }
  console.log(`\nFound ${response.items.length} Telegram chats.`);
  console.log("Use these IDs as BOT_A_CHAT_ID and BOT_B_CHAT_ID in your .env");
}

// ─── SEND MESSAGE ──────────────────────────────────────────────────────
async function sendMessage(
  client: UnipileClient,
  chatId: string,
  text: string,
  label: string,
): Promise<void> {
  console.log(`[${timestamp()}] [${label}] Sending: "${text.slice(0, 60)}..."`);
  await client.messaging.sendMessage(chatId, { text });
  console.log(`[${timestamp()}] [${label}] Sent.`);
}

// ─── MAIN ──────────────────────────────────────────────────────────────
async function main() {
  // Validate config
  if (!CONFIG.unipileApiKey) {
    console.error("Error: UNIPILE_API_KEY is required.");
    console.error("Set it via environment variable or in the CONFIG object.");
    process.exit(1);
  }

  const client = new UnipileClient(CONFIG.unipileBaseUrl, CONFIG.unipileApiKey);

  // --list-chats mode
  if (process.argv.includes("--list-chats")) {
    await listTelegramChats(client);
    return;
  }

  // Validate chat IDs
  if (!CONFIG.botA_chatId || !CONFIG.botB_chatId) {
    console.error("Error: BOT_A_CHAT_ID and BOT_B_CHAT_ID are required.");
    console.error("Run with --list-chats first to find your chat IDs.");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("A/B Test: Context Compression Token Savings");
  console.log("=".repeat(60));
  console.log(`Bot A (compressed): ${CONFIG.botA_chatId}`);
  console.log(`Bot B (baseline):   ${CONFIG.botB_chatId}`);
  console.log(`Messages to send:   ${TEST_MESSAGES.length}`);
  console.log(`Delay between bots: ${CONFIG.delayBetweenBots / 1000}s`);
  console.log(`Delay between msgs: ${CONFIG.delayBetweenMessages / 1000}s`);
  console.log(`Estimated duration: ${Math.round((TEST_MESSAGES.length * (CONFIG.delayBetweenBots + CONFIG.delayBetweenMessages)) / 60000)} minutes`);
  console.log("=".repeat(60));
  console.log("");

  const results: Array<{
    message: string;
    botA_sent: string;
    botB_sent: string;
  }> = [];

  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const msg = TEST_MESSAGES[i];
    console.log(`\n--- Message ${i + 1}/${TEST_MESSAGES.length} ---`);

    // Send to Bot A (compressed)
    const botA_time = timestamp();
    await sendMessage(client, CONFIG.botA_chatId, msg, "Bot A (compressed)");

    // Wait before sending to Bot B
    console.log(`[${timestamp()}] Waiting ${CONFIG.delayBetweenBots / 1000}s before Bot B...`);
    await sleep(CONFIG.delayBetweenBots);

    // Send to Bot B (baseline)
    const botB_time = timestamp();
    await sendMessage(client, CONFIG.botB_chatId, msg, "Bot B (baseline)");

    results.push({
      message: msg,
      botA_sent: botA_time,
      botB_sent: botB_time,
    });

    // Wait for bots to finish responding before next message
    if (i < TEST_MESSAGES.length - 1) {
      console.log(`[${timestamp()}] Waiting ${CONFIG.delayBetweenMessages / 1000}s for responses...`);
      await sleep(CONFIG.delayBetweenMessages);
    }
  }

  // Write results log
  console.log("\n" + "=".repeat(60));
  console.log("Test Complete");
  console.log("=".repeat(60));

  const logContent = [
    `# A/B Test Results — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Bot A (compressed): ${CONFIG.botA_chatId}`,
    `Bot B (baseline):   ${CONFIG.botB_chatId}`,
    `Messages sent: ${TEST_MESSAGES.length}`,
    "",
    "## Messages Sent",
    "",
    ...results.map(
      (r, i) =>
        `${i + 1}. "${r.message}"\n   Bot A: ${r.botA_sent} | Bot B: ${r.botB_sent}`,
    ),
    "",
    "## Next Steps",
    "",
    "1. Check each OpenClaw instance's logs for prompt_tokens per request",
    "2. Sum prompt_tokens for Bot A vs Bot B",
    "3. The difference = tokens saved by context compression",
    "4. Compare response quality between the two bots",
    "",
  ].join("\n");

  const logPath = `test/ab-test-results-${new Date().toISOString().slice(0, 10)}.md`;
  await Bun.write(logPath, logContent);
  console.log(`Results log written to: ${logPath}`);
  console.log("");
  console.log("Now compare token usage from your MiniMax dashboard or instance logs.");
}

main().catch(console.error);
