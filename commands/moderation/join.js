const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    generateDependencyReport,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
const { getAdminRoleId } = require('../../config');

const JOIN_SOUND_PATH = path.join(__dirname, '../../sounds/join.mp3');
const VOICE_READY_TIMEOUT_MS = 30000;
let dependencyReportLogged = false;

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

        const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
        const botPermissions = channel.permissionsFor(botMember);
        if (!botPermissions?.has(PermissionFlagsBits.Connect)) {
            return interaction.reply({ content: `I do not have permission to connect to ${channel.name}.`, ephemeral: true });
        }

        if (!botPermissions.has(PermissionFlagsBits.Speak)) {
            return interaction.reply({ content: `I can join ${channel.name}, but I do not have permission to speak there.`, ephemeral: true });
        }

        if (!fs.existsSync(JOIN_SOUND_PATH)) {
            console.warn(`[VOICE] Join sound is missing: ${JOIN_SOUND_PATH}`);
            return interaction.reply({
                content: 'I can join, but `sounds/join.mp3` is missing from the bot files.',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        if (!dependencyReportLogged) {
            console.info(generateDependencyReport());
            dependencyReportLogged = true;
        }

        const existingConnection = getVoiceConnection(interaction.guild.id);
        if (existingConnection) {
            existingConnection.destroy();
        }

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
            await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_TIMEOUT_MS);
        } catch (error) {
            connection.destroy();
            console.error('[VOICE] Connection did not become ready:', error);
            return interaction.editReply({
                content: `I tried joining ${channel.name}, but the Discord voice connection never became ready. Check Docker host networking and outbound UDP access.`,
            });
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
