const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { orange } = require('../colors.json');
const { getConfig, getModRoleId, isConfiguredString } = require('../config');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const { spamReportChannel } = getConfig();
        const modRole = getModRoleId();

        if (!message.content) return;
        if (!message.reference) return;
        if (message.author.bot) return;
        if (!isConfiguredString(spamReportChannel) || !modRole) return;

        if (!message.mentions.users.has(message.client.user.id)) return;

        if (!message.content.toLowerCase().includes('spam')) return;

        try {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
            const targetUser = repliedMessage.author;

            const reportChannel = await message.client.channels.fetch(spamReportChannel);
            if (!reportChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('Spam Report')
                .setDescription(`**Reported User**: ${targetUser.tag} (${targetUser.id})\n**Message**: ${repliedMessage.content}\n**Reported By**: ${message.author.tag}\n**Channel**: ${message.channel}\n**Message Link**: [Jump to message](${repliedMessage.url})`)
                .setColor(orange)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`spam_delete_${targetUser.id}`)
                        .setLabel('Delete Recent Messages')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`spam_ban_${targetUser.id}`)
                        .setLabel('Ban User')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('spam_do_nothing')
                        .setLabel('Do Nothing')
                        .setStyle(ButtonStyle.Secondary)
                );

            await reportChannel.send({ content: `<@&${modRole}>`, embeds: [embed], components: [row] });
        } catch (error) {}
    }
};
