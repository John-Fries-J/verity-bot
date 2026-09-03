const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const {
    getBotToken,
    getConfig,
    isConfiguredString,
} = require('../config');

function loadCommandPayloads() {
    const commands = [];
    const foldersPath = path.join(__dirname, '..', 'commands');

    for (const folder of fs.readdirSync(foldersPath)) {
        const commandsPath = path.join(foldersPath, folder);
        if (!fs.statSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if (!command?.data?.toJSON || typeof command.execute !== 'function') {
                console.warn(`[COMMANDS] Skipping invalid command module: ${filePath}`);
                continue;
            }

            commands.push(command.data.toJSON());
        }
    }

    return commands;
}

async function main() {
    const config = getConfig();
    const token = getBotToken();
    const clientId = config.clientId;
    const guildId = config.guildId;

    if (!token) {
        console.error('[COMMANDS] Missing Discord token. Set DISCORD_TOKEN or config.json token.');
        process.exit(1);
    }

    if (!isConfiguredString(clientId)) {
        console.error('[COMMANDS] Missing clientId in config.json.');
        process.exit(1);
    }

    const commands = loadCommandPayloads();
    const rest = new REST({ version: '10' }).setToken(token);
    const route = isConfiguredString(guildId)
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

    console.info(`[COMMANDS] Refreshing ${commands.length} slash commands ${isConfiguredString(guildId) ? `for guild ${guildId}` : 'globally'}...`);
    const data = await rest.put(route, { body: commands });
    console.info(`[COMMANDS] Successfully reloaded ${data.length} slash commands.`);
}

main().catch((error) => {
    console.error('[COMMANDS] Failed to deploy slash commands:', error);
    process.exit(1);
});
