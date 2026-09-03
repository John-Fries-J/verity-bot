const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mysql = require('../mysql');
const { orange } = require('../colors.json');
const { getModRoleId } = require('../config');
const { formatMySQLDateTime } = require('./utils.js');

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
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('spam_')) return;

        await interaction.deferReply({ ephemeral: true });
        const modRole = getModRoleId();

        if (!modRole) {
            return await interaction.editReply({ content: 'Error: Moderator role not configured.' });
        }
        if (!interaction.member.roles.cache.has(modRole)) {
            return await interaction.editReply({ content: 'You do not have permission to use these buttons.' });
        }

        let action, targetUserId;
        if (interaction.customId === 'spam_do_nothing') {
            action = 'spam_do_nothing';
            targetUserId = null;
        } else {
            const parts = interaction.customId.split('_');
            if (parts.length < 3) {
                return await interaction.editReply({ content: 'Error: Invalid button ID format.' });
            }
            action = `${parts[0]}_${parts[1]}`;
            targetUserId = parts[2];
        }

        try {
            if (action === 'spam_delete') {
                const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
                let totalDeleted = 0;

                const channels = interaction.guild.channels.cache.filter(ch => ch.isTextBased());
                for (const channel of channels.values()) {
                    if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
                        continue;
                    }

                    try {
                        const messages = await channel.messages.fetch({ limit: 100 });
                        const userMessages = messages.filter(msg => 
                            msg.author.id === targetUserId && 
                            msg.createdTimestamp > sixHoursAgo
                        );
                        
                        if (userMessages.size > 0) {
                            await channel.bulkDelete(userMessages, true);
                            totalDeleted += userMessages.size;
                        }
                    } catch (error) {}
                }

                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle('Deleted Messages | Spam Report')
                    .setColor(orange);

                await interaction.message.edit({ embeds: [embed] });

                if (totalDeleted > 0) {
                    const punishment = {
                        type: 'Purge',
                        userTag: (await interaction.client.users.fetch(targetUserId)).tag,
                        userId: targetUserId,
                        punishedByTag: interaction.user.tag,
                        punishedById: interaction.user.id,
                        reason: 'Spam report - deleted recent messages',
                        length: `${totalDeleted} messages`
                    };
                    await savePunishment(punishment);
                    await interaction.editReply({ content: `Deleted ${totalDeleted} recent messages from <@${targetUserId}>.` });
                } else {
                    await interaction.editReply({ content: 'No recent messages found to delete.' });
                }
            } else if (action === 'spam_ban') {
                const member = await interaction.guild.members.fetch(targetUserId);
                if (!member.bannable) {
                    return await interaction.editReply({ content: 'I cannot ban this user.' });
                }

                await member.ban({ reason: 'Spam report' });

                const dmEmbed = new EmbedBuilder()
                    .setTitle('Banned for Spam')
                    .setDescription(`You have been banned from ${interaction.guild.name} for spamming.`)
                    .setColor(orange)
                    .setTimestamp();

                try {
                    await member.send({ embeds: [dmEmbed] });
                } catch (error) {}

                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle('Banned | Spam Report')
                    .setDescription(`${interaction.message.embeds[0].description}\n**Banned By**: ${interaction.user.tag}`)
                    .setColor(orange);

                await interaction.message.edit({ embeds: [embed] });

                const punishment = {
                    type: 'Ban',
                    userTag: member.user.tag,
                    userId: targetUserId,
                    punishedByTag: interaction.user.tag,
                    punishedById: interaction.user.id,
                    reason: 'Spam report',
                    length: 'Permanent'
                };
                await savePunishment(punishment);
                await interaction.editReply({ content: `User <@${targetUserId}> has been banned for spamming.` });
            } else if (action === 'spam_do_nothing') {
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle('Resolved | Spam Report')
                    .setColor('#808080');

                await interaction.message.edit({ embeds: [embed] });
                await interaction.editReply({ content: 'No action taken.' });
            } else {
                await interaction.editReply({ content: 'Error: Unknown button action.' });
            }
        } catch (error) {
            await interaction.editReply({ content: 'An error occurred while processing the action.' });
        }
    }
};
