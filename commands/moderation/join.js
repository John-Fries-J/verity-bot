const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
const { getAdminRoleId } = require('../../config');

const JOIN_SOUND_PATH = path.join(__dirname, '../../sounds/join.mp3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Makes the bot join your voice channel.')
        .setDMPermission(false),

    async execute(interaction) {
        const adminRoleId = getAdminRoleId();
        const hasAdminRole = adminRoleId && interaction.member.roles.cache.has(adminRoleId);

        if (!interaction.member.permissions.has(PermissionFlagsBits.Connect) && !hasAdminRole) {
            return interaction.reply({ content: 'No permission.', ephemeral: true });
        }

        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({ content: 'Join a VC first.', ephemeral: true });
        }

        if (!fs.existsSync(JOIN_SOUND_PATH)) {
            console.warn(`[VOICE] Join sound is missing: ${JOIN_SOUND_PATH}`);
            return interaction.reply({
                content: 'I can join, but `sounds/join.mp3` is missing from the bot files. Rebuild the Docker image after adding it.',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });

        connection.on('stateChange', (oldState, newState) => {
            console.info(`[VOICE] Connection: ${oldState.status} -> ${newState.status}`);
        });

        connection.on('error', (error) => {
            console.error('[VOICE] Connection error:', error);
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15000);
        } catch (error) {
            connection.destroy();
            console.error('[VOICE] Connection did not become ready:', error);
            return interaction.editReply({ content: `Joined ${channel.name}, but the voice connection never became ready.` });
        }

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.info(`[VOICE] Playing join sound: ${JOIN_SOUND_PATH}`);
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.info('[VOICE] Join sound playback finished.');
        });

        player.on('error', (error) => {
            console.error('[VOICE] Audio player error:', error);
        });

        const subscription = connection.subscribe(player);
        if (!subscription) {
            console.error('[VOICE] Failed to subscribe audio player to connection.');
            return interaction.editReply({ content: `Joined ${channel.name}, but could not attach the audio player.` });
        }

        const resource = createAudioResource(JOIN_SOUND_PATH, { inlineVolume: true });
        resource.volume?.setVolume(1);
        player.play(resource);

        try {
            await entersState(player, AudioPlayerStatus.Playing, 5000);
            await interaction.editReply({ content: `Joined ${channel.name} and playing join.mp3.` });
        } catch (error) {
            console.error('[VOICE] Player did not start:', error);
            await interaction.editReply({ content: `Joined ${channel.name}, but join.mp3 did not start. Check \`docker compose logs -f verity-bot\`.` });
        }
    },
};
