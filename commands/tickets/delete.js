const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadConfig, isTicketChannel } = require('../../ticketUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete the current ticket channel'),
    async execute(interaction) {
        const config = loadConfig();
        const hasManageChannels = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
        const hasTicketRole = config.ticketRole && interaction.member.roles.cache.has(config.ticketRole);

        if (!hasManageChannels && !hasTicketRole) {
            return interaction.reply({ content: 'You do not have permission to delete tickets.', ephemeral: true });
        }

        if (!isTicketChannel(interaction.channel, config.ticketCategoryId)) {
            return interaction.reply({ content: 'You can only use this in a ticket channel.', ephemeral: true });
        }

        await interaction.reply({ content: 'Deleting this ticket channel...', ephemeral: true });
        await interaction.channel.delete('Ticket deleted with /delete');
    },
};
