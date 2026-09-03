const { ActivityType, EmbedBuilder, Events } = require('discord.js');
const { getConfig, getLogChannelId, isConfiguredString } = require('../config');
const { green } = require('../colors.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        const { statusName } = getConfig();
        console.info(`Ready! Logged in as ${client.user.tag}`);

        if (isConfiguredString(statusName)) {
            client.user.setPresence({
                activities: [{ name: statusName, type: ActivityType.Watching }],
            });
        }

        const channelId = getLogChannelId('logChannel');
        if (!channelId) return;

        const channel = client.channels.cache.get(channelId);
        if (!channel?.isTextBased?.()) {
            console.warn('[READY] Log channel not found or is not text based.');
            return;
        }

        const logEmbed = new EmbedBuilder()
            .setTitle('Verity is ready')
            .setDescription('Verity is online and watching for lore.')
            .setColor(green)
            .setTimestamp();

        channel.send({ embeds: [logEmbed] }).catch((error) => {
            console.warn(`[READY] Failed to send ready log: ${error.message}`);
        });
    },
};
