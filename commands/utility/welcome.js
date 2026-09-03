const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { blue } = require('../../colors.json');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Sends welcome embed reminding the user to read the rules.')
        .addUserOption(option => option.setName('user').setDescription('Ping the user with the message')),
    async execute(interaction) {
        if (!config.WelcomeEmbed.title || !config.WelcomeEmbed.description || !config.WelcomeEmbed.footer || !config.WelcomeEmbed.thumbnail) {
            interaction.reply({ content: 'The welcome embed is not set up properly. Please check the config file.', ephemeral: true });
            console.warn('The welcome embed is not set up properly. Please check the config file.');
            return;
        }

        const user = interaction.options.getUser('user');
        const embed = new EmbedBuilder()
            .setTitle(config.WelcomeEmbed.title)
            .setDescription(config.WelcomeEmbed.description.replace('${user}', user ? `<@${user.id}>` : ''))
            .setFooter({ text: config.WelcomeEmbed.footer })
            .setThumbnail(config.WelcomeEmbed.thumbnail)
            .setColor(blue);

        if (!user) {
            interaction.reply({ embeds: [embed] });
        } else {
            const channel = interaction.guild.channels.cache.get(interaction.channelId);
            channel.send({ content: `${user}`, embeds: [embed] });
            interaction.reply({ content: `Welcome embed has been sent to ${user}`, ephemeral: true });
        }
    }
};