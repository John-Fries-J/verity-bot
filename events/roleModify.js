const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { blue } = require('../colors.json');
const { getLogChannelId } = require('../config');

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        const channelId = getLogChannelId('roleLogs');
        if (!channelId) return;

        const channel = newRole.guild.channels.cache.get(channelId) || newRole.guild.channels.cache.find(ch => ch.name === 'logs');
        if (!channel || !channel.permissionsFor(newRole.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
            console.warn('[ROLE MODIFY] Log channel not found or bot lacks permission to send messages.');
            return;
        }

        try {
            const fetchedLogs = await newRole.guild.fetchAuditLogs({ type: 30, limit: 1 });
            const roleCreateLog = fetchedLogs.entries.first();

            if (roleCreateLog && roleCreateLog.target.id === newRole.id) {
                const timeSinceCreation = Date.now() - roleCreateLog.createdTimestamp;
                
                if (timeSinceCreation < 5000) {
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }

        let changes = [];
        const oldPerms = new PermissionsBitField(oldRole.permissions.bitfield);
        const newPerms = new PermissionsBitField(newRole.permissions.bitfield);
        const oldPermsList = Object.keys(oldPerms.serialize()).filter(perm => oldPerms.has(perm));
        const newPermsList = Object.keys(newPerms.serialize()).filter(perm => newPerms.has(perm));
        const addedPerms = newPermsList.filter(perm => !oldPermsList.includes(perm));
        const removedPerms = oldPermsList.filter(perm => !newPermsList.includes(perm));

        if (addedPerms.length > 0) {
            changes.push(`**Added Permissions:** \`${addedPerms.join('`, `')}\``);
        }
        if (removedPerms.length > 0) {
            changes.push(`**Removed Permissions:** \`${removedPerms.join('`, `')}\``);
        }
        if (oldRole.name !== newRole.name) {
            changes.push(`**Name Changed:** \`${oldRole.name}\` → \`${newRole.name}\``);
        }
        if (oldRole.color !== newRole.color) {
            changes.push(`**Color Changed:** \`#${oldRole.color.toString(16)}\` → \`#${newRole.color.toString(16)}\``);
        }
        if (oldRole.hoist !== newRole.hoist) {
            changes.push(`**Displayed Separately:** \`${oldRole.hoist}\` → \`${newRole.hoist}\``);
        }
        if (oldRole.mentionable !== newRole.mentionable) {
            changes.push(`**Mentionable:** \`${oldRole.mentionable}\` → \`${newRole.mentionable}\``);
        }
        if (oldRole.position !== newRole.position) {
            changes.push(`**Position Changed:** \`${oldRole.position}\` → \`${newRole.position}\``);
        }

        if (changes.length === 0) {
            return;
        }

        let executor = "Unknown User";
        try {
            const fetchedLogs = await newRole.guild.fetchAuditLogs({ type: 31, limit: 1 });
            const roleUpdateLog = fetchedLogs.entries.first();
            
            if (roleUpdateLog && roleUpdateLog.target.id === newRole.id) {
                executor = `<@${roleUpdateLog.executor.id}>`;
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }

        const logEmbed = new EmbedBuilder()
            .setTitle(`Role Updated: ${newRole.name}`)
            .setDescription(`**Edited by:** ${executor}\n\n${changes.join("\n")}`)
            .setColor(blue)
            .setTimestamp();

        await channel.send({ embeds: [logEmbed] });
    }
};
