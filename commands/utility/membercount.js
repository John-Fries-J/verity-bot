const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { blue } = require('../../colors.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('membercount')
		.setDescription('Replies with the server member count.'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
		.setTitle('Members:')
		.setDescription(`${interaction.guild.memberCount}`)
		.setColor(blue)
		.setTimestamp();
		await interaction.reply({ embeds: [embed] });
	},
};