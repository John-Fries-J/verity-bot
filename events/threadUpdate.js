const { Events, EmbedBuilder } = require('discord.js');
const { blue } = require('../colors.json');
const { getLogChannelId } = require('../config');

module.exports = {
    name: Events.ThreadUpdate,
    async execute(oldThread, newThread) {
        const channelId = getLogChannelId('threadUpdate');
        if (!channelId) return;

        const channel = oldThread.guild.channels.cache.get(channelId) || oldThread.guild.channels.cache.find(ch => ch.name === 'logs');
        
        if (!channel) {
            console.warn('[THREAD UPDATE] Log channel not found.');
            return;
        }

        if (oldThread.name === newThread.name && oldThread.ownerId === newThread.ownerId) return;

        const logEmbed = new EmbedBuilder()
            .setTitle(`Thread edited in ${oldThread.parent.name}`)
            .setDescription(`Thread edited by <@${oldThread.ownerId}>\nOld thread: ${oldThread.name}\nNew thread: ${newThread.name}`)
            .setColor(blue)
            .setTimestamp();
        await channel.send({ embeds: [logEmbed] });
    }
};
