const { Events, EmbedBuilder } = require('discord.js');
const { blue } = require('../colors.json');
const { getLogChannelId } = require('../config');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;
        if (!message.content || message.content.trim() === '') return;

        const channelId = getLogChannelId('messageDelete');
        if (!channelId) return;

        const channel = message.guild.channels.cache.get(channelId) || message.guild.channels.cache.find(ch => ch.name === 'logs');
        if (!channel) return;

        const messageContent = message.content || '[No content]';
        let deleter = 'Unknown or self-deleted';

        try {
            await new Promise(resolve => setTimeout(resolve, 4000));

            const fetchedLogs = await message.guild.fetchAuditLogs({
                type: 72,
                limit: 5
            });
            const deletionLog = fetchedLogs.entries.find(entry => {
                return (
                    entry.target.id === message.author.id &&
                    (Date.now() - entry.createdTimestamp) < 10000
                );
            });

            if (deletionLog) {
                deleter = `<@${deletionLog.executor.id}>`;
            }
        } catch (error) {}

        const logEmbed = new EmbedBuilder()
            .setTitle(`Message deleted in #${message.channel.name}`)
            .setDescription(
                `**Author:** ${message.author.tag}\n` +
                `**Message:** ${messageContent}\n` +
                `**Deleted by:** ${deleter}\n` +
                `**Location:** [Jump to message](${message.url})`
            )
            .setColor(blue)
            .setTimestamp();

        await channel.send({ embeds: [logEmbed] });
    }
};
