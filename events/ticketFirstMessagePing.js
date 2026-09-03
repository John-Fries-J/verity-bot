const { Events } = require('discord.js');
const {
    loadConfig,
    getTicketMeta,
    isOpenTicketChannel,
    buildTicketTopic,
} = require('../ticketUtils.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild) return;
        if (message.author.bot) return;
        if (!message.content || !message.content.trim()) return;

        const config = loadConfig();
        if (!config.ticketRole || !config.ticketCategoryId) return;
        if (!isOpenTicketChannel(message.channel, config.ticketCategoryId)) return;

        const ticketMeta = getTicketMeta(message.channel);
        if (!ticketMeta.ownerId) return;
        if (ticketMeta.modPinged) return;
        if (message.author.id !== ticketMeta.ownerId) return;

        await message.channel.send(`<@&${config.ticketRole}>`);
        await message.channel.setTopic(
            buildTicketTopic(ticketMeta.ownerId, { modPinged: true, closed: false })
        );
    },
};
