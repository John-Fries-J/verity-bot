module.exports = {
    name: 'guildCreate',
    once: false,
    execute(guild) {
        console.info(`Joined a new guild: ${guild.name}`);
    },
};
