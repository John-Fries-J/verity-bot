const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { getBotToken } = require('./config');

const token = getBotToken();

if (!token) {
	console.error('[STARTUP] Missing Discord token. Set DISCORD_TOKEN or add a real token to config.json.');
	process.exit(1);
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildVoiceStates,
	],
	partials: [Partials.Channel],
});

client.commands = new Collection();

function loadCommands() {
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		if (!fs.statSync(commandsPath).isDirectory()) continue;

		const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);

			if (command?.data?.name && typeof command.execute === 'function') {
				client.commands.set(command.data.name, command);
				console.info(`[COMMAND] /${command.data.name}`);
			} else {
				console.warn(`[COMMAND] Skipping invalid command module: ${filePath}`);
			}
		}
	}
}

function loadEvents() {
	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js') && file !== 'utils.js');

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);

		if (!event?.name || typeof event.execute !== 'function') {
			console.warn(`[EVENT] Skipping invalid event module: ${filePath}`);
			continue;
		}

		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
			console.info(`[EVENT] ${event.name} (once)`);
		} else {
			client.on(event.name, (...args) => event.execute(...args));
			console.info(`[EVENT] ${event.name}`);
		}
	}
}

loadCommands();
loadEvents();

client.login(token);
