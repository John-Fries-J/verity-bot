const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { orange } = require('../../colors.json');
const { getModRoleId } = require('../../config');
const mysql = require('../../mysql');
const { formatMySQLDateTime } = require('../../events/utils.js');

function parseDuration(durationString) {
    const regex = /^(\d+)([smhdwMy]|mo(?:nths?)?|y(?:ears?)?)$/i;
    const match = durationString ? durationString.match(regex) : null;
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        case 'mo': case 'mon': case 'mons': return value * 30 * 24 * 60 * 60 * 1000;
        case 'y': case 'yr': case 'yrs': return value * 365 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

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
        .setName('mute')
        .setDescription('Mutes a user from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('The duration of the mute e.g., 1s, 5m, 2h, 3d, 1w').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the mute').setRequired(false)),
    async execute(interaction) {
        const modRole = getModRoleId();
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) && !interaction.member.roles.cache.has(modRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const durationString = interaction.options.getString('duration');

        try {
            const member = await interaction.guild.members.fetch(user);
            if (!member) {
                return await interaction.reply({ content: 'User not found in the server.', ephemeral: true });
            }

            const durationInMs = parseDuration(durationString);
            if (!durationInMs) {
                return await interaction.reply({ content: 'Invalid duration format. Please use a valid format (e.g., 1s, 5m, 2h, 3d, 1w).', ephemeral: true });
            }

            await member.timeout(durationInMs, reason);

            const embed = new EmbedBuilder()
                .setTitle('User Muted')
                .setDescription(`**${member.user.tag}** has been muted for ${durationString}.\n**Reason:** ${reason}`)
                .setColor(orange)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const dmEmbed = new EmbedBuilder()
                .setTitle('User Muted')
                .setDescription(`You have been muted in **${interaction.guild.name}** for ${durationString}.\n**Reason:** ${reason}`)
                .setColor(orange)
                .setTimestamp();

            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.info(`Unable to DM ${user.tag}: ${error.message}`);
            }

            const punishment = {
                type: 'Mute',
                userTag: user.tag,
                userId: user.id,
                punishedByTag: interaction.user.tag,
                punishedById: interaction.user.id,
                reason,
                length: durationString
            };
            await savePunishment(punishment);
        } catch (error) {
            console.error('Failed to mute user:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Failed to mute the user', ephemeral: true });
            }
        }
    },
};
