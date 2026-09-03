const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
const path = require('node:path');
const { roles } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Makes the bot join your voice channel.')
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Connect) && !interaction.member.roles.cache.has(roles.adminRole)) {
            return interaction.reply({ content: 'No permission.', ephemeral: true });
        }

        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({ content: 'Join a VC first.', ephemeral: true });
        }

        await interaction.reply({ content: `Joining ${channel.name}...`, ephemeral: true });

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });

        connection.on('stateChange', (oldState, newState) => {
            console.log(`Voice: ${oldState.status} -> ${newState.status}`);
        });

        connection.on('error', console.error);

        const player = createAudioPlayer();

        player.on(AudioPlayerStatus.Playing, () => {
            console.log('Playing join sound');
        });

        player.on('error', console.error);

        const resource = createAudioResource(
            path.join(__dirname, '../../sounds/join.mp3'),
            { inlineVolume: true }
        );

        resource.volume.setVolume(1);

        let attempts = 0;

        const tryPlay = () => {
            attempts++;

            if (attempts > 5) {
                console.log('Failed to stabilize voice connection');
                return;
            }

            try {
                connection.subscribe(player);
                player.play(resource);
            } catch (e) {
                console.log('Retrying play...');
                setTimeout(tryPlay, 1000);
            }
        };

        setTimeout(tryPlay, 1500);

        await interaction.editReply({ content: `Joined ${channel.name}` });
    },
};