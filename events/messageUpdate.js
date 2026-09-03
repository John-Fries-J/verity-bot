const { Events, EmbedBuilder } = require('discord.js');
const { blue } = require('../colors.json');
const { getLogChannelId } = require('../config');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild) return;

        const channelId = getLogChannelId('editMessage');
        if (!channelId) return;

        const channel = oldMessage.guild.channels.cache.get(channelId) || oldMessage.guild.channels.cache.find(ch => ch.name === 'logs');
        
        if (!channel) {
            console.warn('[MESSAGE UPDATE] Log channel not found.');
            return;
        }

        if (oldMessage.author?.bot || !newMessage.content || newMessage.content.trim() === '') return;

        const logEmbed = new EmbedBuilder()
            .setTitle(`Message edited in #${oldMessage.channel.name}`)
            .setDescription(`Message edited by ${oldMessage.author.tag}\nOld message: ${oldMessage.content}\nNew message: ${newMessage.content}\n[Jump to message](${newMessage.url})`)
            .setColor(blue)
            .setTimestamp();
        await channel.send({ embeds: [logEmbed] });
    }
};
