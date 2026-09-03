const { Events } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

const ALONE_TIMEOUT_MS = 30 * 60 * 1000;
const aloneTimers = new Map();

function clearAloneTimer(guildId) {
    const timer = aloneTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        aloneTimers.delete(guildId);
    }
}

function isBotAlone(channel, botId) {
    if (!channel || !channel.members.has(botId)) return false;
    const nonBotCount = channel.members.filter((member) => !member.user.bot).size;
    return nonBotCount === 0;
}

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const me = guild.members.me;
        if (!me) return;

        const botVoiceChannel = me.voice?.channel;
        if (!botVoiceChannel) {
            clearAloneTimer(guild.id);
            return;
        }

        if (!isBotAlone(botVoiceChannel, me.id)) {
            clearAloneTimer(guild.id);
            return;
        }

        if (aloneTimers.has(guild.id)) return;

        const timer = setTimeout(() => {
            aloneTimers.delete(guild.id);

            const refreshedMember = guild.members.me;
            const refreshedChannel = refreshedMember?.voice?.channel;
            if (!refreshedChannel || !refreshedMember) return;
            if (!isBotAlone(refreshedChannel, refreshedMember.id)) return;

            const connection = getVoiceConnection(guild.id);
            if (connection) {
                connection.destroy();
                console.log(`[VC] Left ${refreshedChannel.name} in ${guild.name} after 30 minutes alone.`);
            }
        }, ALONE_TIMEOUT_MS);

        aloneTimers.set(guild.id, timer);
    },
};
