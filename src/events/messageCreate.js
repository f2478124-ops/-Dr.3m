import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import fs from 'fs';

const FILE = './data/autoreplies.json';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;

// تحميل الردود
function loadReplies() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      // =========================
      // 1) AUTO REPLY SYSTEM
      // =========================
      const replies = loadReplies();

      for (const word in replies) {
        if (message.content.toLowerCase().includes(word.toLowerCase())) {
          await message.reply(replies[word]);
          break;
        }
      }

      // =========================
      // 2) LEVELING SYSTEM
      // =========================
      await handleLeveling(message, client);

    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

// =========================
// LEVELING FUNCTION
// =========================
async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;

    const canProcess = await checkRateLimit(
      rateLimitKey,
      MESSAGE_XP_RATE_LIMIT_ATTEMPTS,
      MESSAGE_XP_RATE_LIMIT_WINDOW_MS
    );

    if (!canProcess) return;

    const levelingConfig = await getLevelingConfig(client, message.guild.id);

    if (!levelingConfig?.enabled) return;

    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) return;

    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) return;

    const member = message.member;
    if (!member) return;

    if (
      levelingConfig.ignoredRoles?.length > 0 &&
      member.roles.cache.some(r => levelingConfig.ignoredRoles.includes(r.id))
    ) {
      return;
    }

    if (!message.content || !message.content.trim()) return;

    const userData = await getUserLevelData(
      client,
      message.guild.id,
      message.author.id
    );

    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();

    if (now - (userData.lastMessage || 0) < cooldownTime * 1000) {
      return;
    }

    const minXP = levelingConfig.xpRange?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || 25;

    const xpToGive =
      Math.floor(Math.random() * (maxXP - minXP + 1)) + minXP;

    const result = await addXp(
      client,
      message.guild,
      member,
      xpToGive
    );

    if (result.success && result.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to ${result.level} in ${message.guild.name}`
      );
    }

  } catch (error) {
    logger.error('Leveling error:', error);
  }
}
