const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { green } = require('../../colors.json');
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
        .setName('unmute')
        .setDescription('Unmutes a user from the server.')
        .setDMPermission(false)
        .addUserOption(option => option.setName('user').setDescription('The user to unmute').setRequired(true)),
    async execute(interaction) {
        const modRole = getModRoleId();
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) && !interaction.member.roles.cache.has(modRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');

        try {
            const member = await interaction.guild.members.fetch(user);
            if (!member) {
                return await interaction.reply({ content: 'User not found in the server.', ephemeral: true });
            }

            await member.timeout(null, 'Manual unmute by moderator');

            const embed = new EmbedBuilder()
                .setTitle('User Unmuted')
                .setDescription(`**${member.user.tag}** has been unmuted.`)
                .setColor(green)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const dmEmbed = new EmbedBuilder()
                .setTitle('User Unmuted')
                .setDescription(`You have been unmuted in **${interaction.guild.name}**.`)
                .setColor(green)
                .setTimestamp();

            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.info(`Unable to DM ${user.tag}: ${error.message}`);
            }

            const punishment = {
                type: 'Unmute',
                userTag: user.tag,
                userId: user.id,
                punishedByTag: interaction.user.tag,
                punishedById: interaction.user.id,
                reason: 'Manual unmute by moderator',
                length: 'N/A',
                date: new Date().toISOString()
            };
            await savePunishment(punishment);
        } catch (error) {
            console.error('Error unmuting user:', error);
            await interaction.reply({ content: 'Failed to unmute the user', ephemeral: true });
        }
    },
};
