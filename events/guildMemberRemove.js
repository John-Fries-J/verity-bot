const { EmbedBuilder } = require('discord.js');
const { getConfig, isConfiguredString } = require('../config');

module.exports = {
    name: 'guildMemberRemove',
    execute(member) {
        const { joinleaveID } = getConfig();
        const channelId = joinleaveID;
        const channel = member.guild.channels.cache.get(channelId);
        if (!channel) {
            if (isConfiguredString(channelId)) {
                console.warn(`[GUILD MEMBER REMOVE] Channel with ID ${channelId} not found.`);
            }
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(member.user.username)
            .setDescription(`${member.user} **left.**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Ottowispz Corporations", iconURL: member.guild.iconURL({ dynamic: true }) })
            .setColor('#0099ff')
            .setTimestamp();
        channel.send({ embeds: [embed] }).catch((error) => {
            console.warn(`[GUILD MEMBER REMOVE] Failed to send leave log: ${error.message}`);
        });
    },
};
