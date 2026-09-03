const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { red } = require('../../colors.json');
const { getModRoleId } = require('../../config');
const mysql = require('../../mysql');
const { formatMySQLDateTime } = require('../../events/utils.js');

function parseDuration(durationString) {
    const regex = /^(\d+)([smhdwMy]|mo(?:nths?)?|y(?:ears?)?)$/i;
    const match = durationString ? durationString.match(regex) : null;
    if (!match) return NaN;

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
        default: return NaN;
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
        .setName('ban')
        .setDescription('Bans a user from the server')
        .setDMPermission(false)
        .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the ban'))
        .addStringOption(option => option.setName('duration').setDescription('The duration of the ban (e.g., 1d, 1h)').setRequired(false)),
    async execute(interaction) {
        const modRole = getModRoleId();
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers) && !interaction.member.roles.cache.has(modRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getString('duration');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member?.bannable) {
            return await interaction.reply({ content: 'I cannot ban this user', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('User Banned')
            .setDescription(`You have been banned from ${interaction.guild.name}${reason ? ` for: ${reason}` : ''}`)
            .setTimestamp()
            .setColor(red);

        try {
            await member.send({ embeds: [embed] });
        } catch (error) {
            console.info(`Unable to DM ${user.tag}: ${error.message}`);
        }

        try {
            await member.ban({ reason });
            await interaction.reply({ content: `User ${user.tag} has been banned for ${reason}`, ephemeral: true });

            const punishment = {
                type: 'Ban',
                userTag: user.tag,
                userId: user.id,
                punishedByTag: interaction.user.tag,
                punishedById: interaction.user.id,
                reason,
                length: duration || 'Permanent',
                date: new Date().toISOString()
            };
            await savePunishment(punishment);

            if (duration) {
                const durationInMillis = parseDuration(duration);
                if (!isNaN(durationInMillis) && durationInMillis > 0) {
                    setTimeout(async () => {
                        try {
                            await interaction.guild.members.unban(user.id, 'Automatic unban after specified duration');
                            const unbanPunishment = {
                                type: 'Unban',
                                userTag: user.tag,
                                userId: user.id,
                                punishedByTag: 'Automatic',
                                punishedById: '0',
                                reason: 'Automatic unban after specified duration',
                                length: 'N/A',
                                date: new Date().toISOString()
                            };
                            await savePunishment(unbanPunishment);
                        } catch (error) {
                            console.error('Error during automatic unban:', error);
                        }
                    }, durationInMillis);
                }
            }
        } catch (error) {
            console.error('Failed to ban user:', error);
            await interaction.reply({ content: 'Failed to ban the user', ephemeral: true });
        }
    },
};
