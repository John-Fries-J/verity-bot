const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const whitelistFile = path.join(__dirname, '../../whitelist.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('whitelist')
		.setDMPermission(false)
		.setDescription('Sends the whitelist.json file'),
	async execute(interaction) {
		if (
			!interaction.member.roles.cache.has('1346690872661770311') &&
			!interaction.member.permissions.has(PermissionFlagsBits.Administrator)
		) {
			return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
		}

		if (!fs.existsSync(whitelistFile)) {
			return interaction.reply({ content: 'Whitelist file does not exist.', ephemeral: true });
		}

		await interaction.reply({
			content: 'Here is the whitelist file:',
			files: [whitelistFile],
		});
	},
};
