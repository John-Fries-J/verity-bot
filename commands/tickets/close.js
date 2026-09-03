const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { green } = require('../../colors.json');
const {
    loadConfig,
    isOpenTicketChannel,
    closeTicketChannel,
} = require('../../ticketUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close the current ticket channel'),
    async execute(interaction) {
        const config = loadConfig();
        const hasManageChannels = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
        const hasTicketRole = config.ticketRole && interaction.member.roles.cache.has(config.ticketRole);

        if (!hasManageChannels && !hasTicketRole) {
            return interaction.reply({ content: 'You do not have permission to close tickets.', ephemeral: true });
        }

        if (!isOpenTicketChannel(interaction.channel, config.ticketCategoryId)) {
            return interaction.reply({ content: 'You can only use this in an open ticket channel.', ephemeral: true });
        }

        const closeResult = await closeTicketChannel(interaction.channel, interaction.guild, config.ticketRole);
        if (!closeResult.ok) {
            return interaction.reply({ content: closeResult.error, ephemeral: true });
        }

        const closedEmbed = new EmbedBuilder()
            .setTitle('Ticket Closed')
            .setDescription(`Closed by <@${interaction.user.id}>`)
            .setColor(green);

        const ownerMember = await interaction.guild.members.fetch(closeResult.ownerId).catch(() => null);
        if (ownerMember) {
            ownerMember.send({ embeds: [closedEmbed] }).catch(() => null);
        }

        return interaction.reply({ content: `Ticket closed by <@${interaction.user.id}>.` });
    },
};
