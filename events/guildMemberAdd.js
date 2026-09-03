const { EmbedBuilder } = require('discord.js');
const { getConfig, isConfiguredString } = require('../config');

module.exports = {
    name: 'guildMemberAdd',
    execute(member) {
        const { roles = {}, joinleaveID } = getConfig();
        const channelId = joinleaveID;
        const channel = member.guild.channels.cache.get(channelId);

        if (!channel && isConfiguredString(channelId)) {
            console.warn(`[GUILD MEMBER ADD] Channel with ID ${channelId} not found.`);
        }

        const created = Math.floor(member.user.createdTimestamp / 1000);
        const embed = new EmbedBuilder()
            .setTitle(member.user.username)
            .setDescription(`${member.user} **joined the server**`+ `\n⏲ **Age of Account:** \n<t:${created}:f>\n **${Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))} days ago**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Ottowispz Corporations", iconURL: member.guild.iconURL({ dynamic: true }) })
            .setColor('#0099ff')
            .setTimestamp();

        if (channel) {
            channel.send({ embeds: [embed] }).catch((error) => {
                console.warn(`[GUILD MEMBER ADD] Failed to send join log: ${error.message}`);
            });
        }

        const roleIds = [
            roles.autoRoleId,
            roles.autoRoleId1,
            roles.autoRoleId2,
            roles.autoRoleId3,
        ].filter(isConfiguredString);

        roleIds.forEach(roleId => {
            if (member.roles.cache.has(roleId)) {
                return;
            } else {
                member.roles.add(roleId)
                    .then(() => console.info(`Added role: ${roleId} to user: ${member.user.tag}`))
                    .catch(err => console.error(`Failed to add role: ${roleId} to user: ${member.user.tag} - Error: ${err}`));
            }
        });
    },
};
