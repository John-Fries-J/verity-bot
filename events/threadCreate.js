const { Events, EmbedBuilder } = require('discord.js');
const { blue } = require('../colors.json');
const { getLogChannelId } = require('../config');

module.exports = {
    name: Events.ThreadCreate,
    async execute(thread) {
        const channelId = getLogChannelId('threadCreate');
        if (!channelId) return;

        const channel = thread.guild.channels.cache.get(channelId) || thread.guild.channels.cache.find(ch => ch.name === 'logs');
        
        if (!channel) {
            console.warn('[THREAD CREATE] Log channel not found.');
            return;
        }
        const logEmbed = new EmbedBuilder()
            .setTitle(`Thread created`)
            .setDescription(`Thread ${thread.parent.name} was created by <@${thread.ownerId}>`)
            .setColor(blue)
            .setTimestamp();
        await channel.send({ embeds: [logEmbed] });
    }
};
