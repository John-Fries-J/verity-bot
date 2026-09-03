const { Events, EmbedBuilder } = require('discord.js');
const { blue } = require('../colors.json');
const { getLogChannelId } = require('../config');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const channelId = getLogChannelId('roleLogs');
        if (!channelId) return;

        const channel = newMember.guild.channels.cache.get(channelId) || newMember.guild.channels.cache.find(ch => ch.name === 'logs');

        if (!channel) {
            console.warn('[ROLE ADD/REMOVE] Log channel not found.');
            return;
        }

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        if (addedRoles.size > 0) {
            const roleNames = addedRoles.map(role => `<@&${role.id}>`).join(', ');
            const logEmbed = new EmbedBuilder()
                .setTitle(`Role Added`)
                .setDescription(`User <@${newMember.id}> was given the role(s): ${roleNames}`)
                .setColor(blue)
                .setTimestamp();
            await channel.send({ embeds: [logEmbed] });
        }

        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
        if (removedRoles.size > 0) {
            const roleNames = removedRoles.map(role => `<@&${role.id}>`).join(', ');
            const logEmbed = new EmbedBuilder()
                .setTitle(`Role Removed`)
                .setDescription(`User <@${newMember.id}> had the role(s) removed: ${roleNames}`)
                .setColor(blue)
                .setTimestamp();
            await channel.send({ embeds: [logEmbed] });
        }
    }
};
