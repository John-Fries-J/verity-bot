const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { roles } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a specified amount of messages.')
        .setDMPermission(false)
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of messages to delete').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) && !interaction.member.roles.cache.has(roles.adminRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
        const amount = interaction.options.getInteger('amount');

        if (amount < 1 || amount > 100) {
            return await interaction.reply({ content: 'You need to input a number between 1 and 100.', ephemeral: true });
        }

        await interaction.channel.bulkDelete(amount, true).catch(error => {
            console.error(error);
            return interaction.reply({ content: 'There was an error trying to delete messages in this channel!', ephemeral: true });
        });

        await interaction.reply({ content: `Successfully deleted ${amount} messages.`, ephemeral: true });
    },
};