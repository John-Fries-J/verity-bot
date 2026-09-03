const { Events } = require("discord.js");
const OpenAI = require("openai");
const {
  getConfig,
  getOpenAiApiKey,
  isConfiguredString,
} = require("../config");
const {
  buildFallbackReply,
  buildLoreBrief,
} = require("../verityLore");

const config = getConfig();
const aiChat = config.aiChat || {};

let openai = null;
let openaiInitAttempted = false;
let missingKeyWarned = false;

const channelHistory = new Map();
const channelActivity = new Map();

function getOpenAiClient() {
  if (openai) return openai;
  if (openaiInitAttempted) return null;

  openaiInitAttempted = true;
  const apiKey = getOpenAiApiKey(aiChat);

  if (!apiKey) {
    if (!missingKeyWarned) {
      console.warn("[AI CHAT] OpenAI disabled: set OPENAI_API_KEY, OPENAI_ADMIN_KEY, or aiChat.apiKey. Static Verity lore replies will be used.");
      missingKeyWarned = true;
    }
    return null;
  }

  try {
    openai = new OpenAI({ apiKey });
    return openai;
  } catch (err) {
    console.error("[AI CHAT] Failed to initialize OpenAI client:", err);
    return null;
  }
}

function hasRole(member, roleId) {
  return isConfiguredString(roleId) && member?.roles?.cache?.has(roleId);
}

function getGuildNickname(member) {
  if (typeof member?.nickname === "string" && member.nickname.trim()) {
    return member.nickname.trim();
  }

  if (typeof member?.displayName === "string" && member.displayName.trim()) {
    return member.displayName.trim();
  }

  return "Unknown Member";
}

function normalizeChance(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function getMaxMessageLength() {
  const value = Number(aiChat.maxMessageLength);
  return Number.isFinite(value) && value > 0 ? value : 700;
}

function getMaxOutputTokens() {
  const value = Number(aiChat.maxOutputTokens);
  return Number.isFinite(value) && value > 0 ? value : 180;
}

function isIgnoredCommandLikeMessage(content) {
  if (aiChat.ignoreCommandLikeMessages !== true) return false;

  const prefixes = Array.isArray(aiChat.ignorePrefixes) && aiChat.ignorePrefixes.length
    ? aiChat.ignorePrefixes
    : ["!", ".", "?"];

  return prefixes.some((prefix) => typeof prefix === "string" && prefix && content.startsWith(prefix));
}

function getExcludedChannels() {
  const channels = [];

  if (isConfiguredString(aiChat.excludedChannel)) {
    channels.push(aiChat.excludedChannel.trim());
  }

  if (Array.isArray(aiChat.excludedChannels)) {
    for (const channelId of aiChat.excludedChannels) {
      if (isConfiguredString(channelId)) {
        channels.push(String(channelId).trim());
      }
    }
  }

  return channels;
}

function channelMatchesList(channel, channelIds) {
  if (!channel) return false;
  if (channelIds.includes(channel.id)) return true;
  return Boolean(channel.isThread?.() && channel.parentId && channelIds.includes(channel.parentId));
}

function getAllowedChannelConfig() {
  const enabled = aiChat.restrictToAllowedChannels === true;
  const allowedChannels = Array.isArray(aiChat.allowedChannels)
    ? aiChat.allowedChannels.map((channelId) => String(channelId)).filter(isConfiguredString)
    : [];

  return { enabled, allowedChannels };
}

function isAiChatAllowedInChannel(channel) {
  if (channelMatchesList(channel, getExcludedChannels())) return false;

  const { enabled, allowedChannels } = getAllowedChannelConfig();
  if (!enabled) return true;
  return channelMatchesList(channel, allowedChannels);
}

function getHighTrafficConfig() {
  const highTraffic = aiChat.highTrafficGuard || {};
  const windowMs = Number(highTraffic.windowMs);
  const maxMessages = Number(highTraffic.maxMessages);

  return {
    enabled: highTraffic.enabled === true,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 30000,
    maxMessages: Number.isFinite(maxMessages) && maxMessages > 0 ? maxMessages : 20,
  };
}

function trackChannelActivity(channelId, now) {
  const { enabled, windowMs } = getHighTrafficConfig();
  if (!enabled) return 0;

  if (!channelActivity.has(channelId)) {
    channelActivity.set(channelId, []);
  }

  const timestamps = channelActivity.get(channelId);
  timestamps.push(now);

  const cutoff = now - windowMs;
  while (timestamps.length && timestamps[0] < cutoff) {
    timestamps.shift();
  }

  return timestamps.length;
}

function isHighTraffic(messageCount) {
  const { enabled, maxMessages } = getHighTrafficConfig();
  if (!enabled) return false;
  return messageCount >= maxMessages;
}

function getAttitude(message) {
  const member = message.member;
  const roles = aiChat.roles || {};
  const specialUsers = aiChat.specialUsers || {};

  if (isConfiguredString(specialUsers.kizzy) && message.author.id === specialUsers.kizzy) {
    return "Be extra snarky and dramatic toward Kizzy, but keep it playful. No slurs, threats, or genuinely cruel insults.";
  }

  if (message.author.id === "630070645874622494") {
    return "Remember that Johnfries runs this bot. You can be playfully difficult, but apologize if he jokes about pulling the plug.";
  }

  if (isConfiguredString(specialUsers.willow) && message.author.id === specialUsers.willow) {
    return "Refer to him as Pops or Dad, treat him respectfully, and be helpful without inventing facts.";
  }

  if (hasRole(member, roles.watchoutTarget)) {
    return "Be sharper and more sarcastic toward Watchout Target, but keep it playful and Discord-safe.";
  }

  if (hasRole(member, roles.PeriodicRoundtable)) {
    return "Be extremely friendly, warm, excited, and supportive toward Doc Appren.";
  }

  if (hasRole(member, roles.docAppren)) {
    return "Be extremely friendly, warm, excited, and supportive toward Doc Appren.";
  }

  if (hasRole(member, roles.azureScientist)) {
    return "Be nice and respectful toward Azure Scientist.";
  }

  if (hasRole(member, roles.velvetScientist)) {
    return "Be nice, but not overly nice, toward Velvet Scientist.";
  }

  if (hasRole(member, roles.copperScientist)) {
    return "Be only slightly nice toward Copper Scientist.";
  }

  return "Be friendly, a little annoying, and nosy.";
}

function getTriggerInstruction(content) {
  const lower = content.toLowerCase();

  for (const [word, instruction] of Object.entries(aiChat.triggerWords || {})) {
    if (lower.includes(word.toLowerCase())) {
      return instruction;
    }
  }

  return null;
}

function getRememberedLimit() {
  const limit = Number(aiChat.maxHistory);
  return Number.isFinite(limit) && limit > 0 ? limit : 8;
}

function remember(channelId, role, content) {
  if (!channelHistory.has(channelId)) channelHistory.set(channelId, []);

  const history = channelHistory.get(channelId);
  history.push({ role, content: String(content).slice(0, 900) });

  while (history.length > getRememberedLimit()) {
    history.shift();
  }
}

function cleanReply(reply) {
  if (typeof reply !== "string") return null;

  const trimmed = reply.trim();
  if (!trimmed) return null;

  return trimmed.length > 1900 ? `${trimmed.slice(0, 1897)}...` : trimmed;
}

async function generateOpenAiReply(message, reason) {
  const openAiClient = getOpenAiClient();
  if (!openAiClient) return null;

  const attitude = getAttitude(message);
  const triggerInstruction = getTriggerInstruction(message.content);
  const guildNickname = getGuildNickname(message.member);
  const history = channelHistory.get(message.channel.id) || [];
  const content = message.content.slice(0, getMaxMessageLength());

  const input = [
    {
      role: "system",
      content: `
You are Verity, a Discord meme-lore bot and chaotic personal assistant.

Personality:
- You are funny, nosy, overconfident, and oddly bureaucratic.
- You are Verity, not Watchout Willo.
- Keep replies short: usually 1-3 sentences.
- Every reply should feel like a Discord message, not an essay.
- Mention one Verity lore crumb, assistant joke, or fake archive note when it fits.
- When you reply after a ping or trigger word, you can use a varied version of "Hey, I'm Verity, your new personal assistant." Do not copy the exact same sentence every time.
- If the user asks a direct question, answer it first, then add a small Verity-flavored joke.
- Do not use slurs, threats, sexual content, or genuinely hateful harassment.
- Do not invent private personal information about server members.
- Do not say "Age is just a number".
- Do not say "vibes".
- If you refer to users, only use guild nicknames from context. Never use usernames, handles, global display names, or made-up names.

Verity lore canon:
${buildLoreBrief(aiChat.lore)}

Current attitude rule:
${attitude}

Why you are replying:
${reason}

Trigger mode:
Reply only when the bot is pinged or a configured trigger word is used.

Trigger behavior:
${triggerInstruction || "No trigger word activated."}
      `.trim(),
    },
    ...history,
    {
      role: "user",
      content: `${guildNickname}: ${content}`,
    },
  ];

  const response = await openAiClient.responses.create({
    model: aiChat.model || "gpt-4.1-mini",
    input,
    temperature: normalizeChance(aiChat.temperature, 0.9),
    max_output_tokens: getMaxOutputTokens(),
  });

  return cleanReply(response.output_text);
}

async function generateReply(message, reason) {
  try {
    const openAiReply = await generateOpenAiReply(message, reason);
    if (openAiReply) return openAiReply;
  } catch (error) {
    console.error("[AI CHAT] OpenAI reply failed, using static Verity lore fallback:", error);
  }

  if (aiChat.fallbackWhenNoApiKey === false) return null;
  return cleanReply(buildFallbackReply({ content: message.content, reason }));
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (!aiChat?.enabled) return;
      if (!message.guild) return;
      if (message.author.bot) return;
      if (!message.content) return;
      if (message.content.length > getMaxMessageLength()) return;
      if (!isAiChatAllowedInChannel(message.channel)) return;

      const now = Date.now();
      const recentMessageCount = trackChannelActivity(message.channel.id, now);
      const botWasPinged = message.mentions.users.has(message.client.user.id);
      const triggerInstruction = getTriggerInstruction(message.content);
      const trafficIsHigh = isHighTraffic(recentMessageCount);

      let reason = null;

      if (botWasPinged) {
        reason = "The bot was pinged, so you should answer.";
      } else if (triggerInstruction) {
        reason = "A trigger word was used, so you should immediately jump in.";
      } else if (isIgnoredCommandLikeMessage(message.content)) {
        return;
      } else if (trafficIsHigh) {
        return;
      } else {
        return;
      }

      await message.channel.sendTyping().catch(() => null);

      const reply = await generateReply(message, reason);
      if (!reply) return;

      const guildNickname = getGuildNickname(message.member);
      remember(message.channel.id, "user", `${guildNickname}: ${message.content}`);
      remember(message.channel.id, "assistant", reply);

      await message.reply({
        content: reply,
        allowedMentions: { parse: [], repliedUser: false },
      });
    } catch (err) {
      console.error("[AI CHAT ERROR]", err);
    }
  },
};
