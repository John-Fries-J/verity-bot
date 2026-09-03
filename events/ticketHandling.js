const {
    Events,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ChannelType,
    PermissionsBitField,
    PermissionFlagsBits,
} = require('discord.js');
const {
    loadConfig,
    buildTicketTopic,
    findOpenTicketByOwner,
    isTicketChannel,
    closeTicketChannel,
} = require('../ticketUtils.js');

function canManageTicket(interaction, ticketRoleId) {
    if (interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
    if (!ticketRoleId) return false;
    return interaction.member.roles.cache.has(ticketRoleId);
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!['open_ticket', 'close_ticket', 'delete_ticket'].includes(interaction.customId)) return;

        const config = loadConfig();
        if (!config.ticketMessageID) return;

        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });

            if (!config.ticketCategoryId || !config.ticketRole) {
                return interaction.editReply({ content: 'Ticket system is not configured yet.' });
            }

            const existingTicket = findOpenTicketByOwner(interaction.guild, interaction.user.id, config.ticketCategoryId);
            if (existingTicket) {
                return interaction.editReply({ content: `You already have an open ticket: <#${existingTicket.id}>` });
            }

            const newChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: config.ticketCategoryId,
                topic: buildTicketTopic(interaction.user.id, { modPinged: false, closed: false }),
                permissionOverwrites: [
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: config.ticketRole,
                        allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
                    },
                ],
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle('Ticket Created')
                .setDescription('Send your issue details here. Staff will be pinged after your first message.')
                .setColor('Green');

            const closeButton = new ButtonBuilder()
                .setStyle('Primary')
                .setLabel('Close Ticket')
                .setCustomId('close_ticket');

            await newChannel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [ticketEmbed],
                components: [new ActionRowBuilder().addComponents(closeButton)],
            });

            return interaction.editReply({ content: `Ticket created: <#${newChannel.id}>` });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.deferReply({ ephemeral: true });

            if (!isTicketChannel(interaction.channel, config.ticketCategoryId) || !interaction.channel.name.startsWith('ticket-')) {
                return interaction.editReply({ content: 'This button only works in an open ticket channel.' });
            }

            if (!canManageTicket(interaction, config.ticketRole)) {
                return interaction.editReply({ content: 'You do not have permission to close tickets.' });
            }

            const closeResult = await closeTicketChannel(interaction.channel, interaction.guild, config.ticketRole);
            if (!closeResult.ok) {
                return interaction.editReply({ content: closeResult.error });
            }

            const closedEmbed = new EmbedBuilder()
                .setTitle('Ticket Closed')
                .setDescription(`Closed by <@${interaction.user.id}>.`)
                .setColor('Red');

            const deleteButton = new ButtonBuilder()
                .setStyle('Danger')
                .setLabel('Delete Ticket')
                .setCustomId('delete_ticket');

            await interaction.channel.send({
                embeds: [closedEmbed],
                components: [new ActionRowBuilder().addComponents(deleteButton)],
            });

            return interaction.editReply({ content: 'Ticket closed.' });
        }

        if (!isTicketChannel(interaction.channel, config.ticketCategoryId)) {
            await interaction.reply({ content: 'This button only works in a ticket channel.', ephemeral: true });
            return;
        }

        if (!canManageTicket(interaction, config.ticketRole)) {
            await interaction.reply({ content: 'You do not have permission to delete tickets.', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'Deleting ticket channel...', ephemeral: true });
        await interaction.channel.delete('Ticket deleted by staff');
    },
};
