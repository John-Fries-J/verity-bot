const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getModRoleId } = require('../../config');
const mysql = require('../../mysql');
const { formatMySQLDateTime } = require('../../events/utils.js');

const savePunishment = async (punishment) => {
    const sql = 'INSERT INTO punishments (type, user_tag, user_id, punished_by_tag, punished_by_id, reason, length, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [
        punishment.type,
        punishment.userTag,
        punishment.userId,
        punishment.punishedByTag,
        punishment.punishedById,
        punishment.reason,
        punishment.length,
        formatMySQLDateTime(new Date())
    ];
    try {
        await mysql.query(sql, values);
    } catch (error) {
        console.error(`Error saving ${punishment.type} to database:`, error);
        throw error;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a user from the server.')
        .setDMPermission(false)
        .addUserOption(option => option.setName('user').setDescription('The user to unban').setRequired(true)),
    async execute(interaction) {
        const modRole = getModRoleId();
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers) && !interaction.member.roles.cache.has(modRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');

        try {
            await interaction.guild.members.unban(user.id, 'Manual unban by moderator');

            await interaction.reply({ content: `${user.tag} has been unbanned.`, ephemeral: true });

            const punishment = {
                type: 'Unban',
                userTag: user.tag,
                userId: user.id,
                punishedByTag: interaction.user.tag,
                punishedById: interaction.user.id,
                reason: 'Manual unban by moderator',
                length: 'N/A',
                date: new Date().toISOString()
            };
            await savePunishment(punishment);
        } catch (error) {
            console.error('Error unbanning user:', error);
            await interaction.reply({ content: 'Failed to unban the user', ephemeral: true });
        }
    },
};
