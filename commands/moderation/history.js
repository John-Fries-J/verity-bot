const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { green } = require('../../colors.json');
const mysql = require('../../mysql');
const { getModRoleId } = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Replies user\'s punishment history')
        .addUserOption(option => option.setName('user').setDescription('The user to check the history of.').setRequired(true)),
    async execute(interaction) {
        const modRole = getModRoleId();
        const user = interaction.options.getUser('user');
        const sql = 'SELECT * FROM punishments WHERE user_id = ? ORDER BY date DESC';
        const values = [user.id];
        if (!interaction.member.roles.cache.has(modRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command', ephemeral: true });
        }
        try {
            await interaction.deferReply();
            const rows = await mysql.query(sql, values);
            if (rows.length === 0) {
                return await interaction.followUp({ content: 'No punishment history found for this user.', ephemeral: true });
            }
            let embeds = [];
            let currentDescription = '';
            rows.forEach((row, index) => {
                const reason = row.reason ? (row.reason.length > 25 ? row.reason.substring(0, 25) + '...' : row.reason) : 'No reason provided';
                const punishmentDate = new Date(row.date);
                currentDescription += `**ID: ${row.id}**\n`;
                currentDescription += `> **Type:** ${row.type}\n`;
                currentDescription += `> **Punished By:** <@${row.punished_by_id}>\n`;
                currentDescription += `> **Reason:** ${reason}\n`;
                currentDescription += `> **Length:** ${row.length}\n`;
                currentDescription += `> **Date:** <t:${Math.floor(punishmentDate.getTime() / 1000)}:F>\n`;
                currentDescription += '\n';

                if ((index + 1) % 5 === 0 || index === rows.length - 1) {
                    let embed = {
                        title: `Punishment History for ${user.tag}`,
                        description: currentDescription,
                        timestamp: new Date(),
                        color: parseInt(green.replace('#', ''), 16),
                        thumbnail: {
                            url: user.displayAvatarURL({ dynamic: true })
                        }
                    };
                    embeds.push(embed);
                    currentDescription = ''; 
                }
            });
            let currentPage = 0;
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(embeds.length === 1)
                );
            const message = await interaction.followUp({ embeds: [embeds[currentPage]], components: [row], ephemeral: true });
            const filter = i => i.customId === 'prev' || i.customId === 'next';
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'prev') {
                    currentPage--;
                } else if (i.customId === 'next') {
                    currentPage++;
                }
                await i.update({
                    embeds: [embeds[currentPage]],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('prev')
                                    .setLabel('Previous')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(currentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('next')
                                    .setLabel('Next')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(currentPage === embeds.length - 1)
                            )
                    ]
                });
            });
            collector.on('end', collected => {
                interaction.editReply({ components: [] });
            });
        } catch (error) {
            console.error('Error fetching punishment history from database:', error);
            await interaction.followUp({ content: 'Failed to fetch punishment history. Please try again later.', ephemeral: true });
        }
    },
};
