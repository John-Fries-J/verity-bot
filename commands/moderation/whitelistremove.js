const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const whitelistFile = path.join(__dirname, '../../whitelist.json');
const logsFile = path.join(__dirname, '../../whitelistlogs.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('whitelistremove')
		.setDescription('Removes a username from the whitelist')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)
		.addStringOption(option =>
			option.setName('username')
				.setDescription('The username to remove')
				.setRequired(true)
		),
	async execute(interaction) {
		const usernameToRemove = interaction.options.getString('username');

		let logs = {};
		if (fs.existsSync(logsFile)) {
			logs = JSON.parse(fs.readFileSync(logsFile, 'utf8'));
		}

		let whitelistEntries = [];
		if (fs.existsSync(whitelistFile)) {
			whitelistEntries = JSON.parse(fs.readFileSync(whitelistFile, 'utf8'));
		}

		const beforeLength = whitelistEntries.length;
		whitelistEntries = whitelistEntries.filter(entry => entry.name.toLowerCase() !== usernameToRemove.toLowerCase());
		const afterLength = whitelistEntries.length;

		if (beforeLength === afterLength) {
			return interaction.reply({ content: `❌ Username **${usernameToRemove}** not found in the whitelist.`, ephemeral: true });
		}

		for (const [id, entry] of Object.entries(logs)) {
			if (entry.username.toLowerCase() === usernameToRemove.toLowerCase()) {
				delete logs[id];
				break;
			}
		}

		fs.writeFileSync(whitelistFile, JSON.stringify(whitelistEntries, null, 2), 'utf8');
		fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2), 'utf8');

		await interaction.reply({ content: `✅ Username **${usernameToRemove}** has been removed from the whitelist.`, ephemeral: true });
	},
};
