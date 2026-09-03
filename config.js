const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const EXAMPLE_CONFIG_PATH = path.join(__dirname, 'configexample.json');

const PLACEHOLDER_PATTERNS = [
    /^enter\b/i,
    /^optional\b/i,
    /^your\b/i,
    /^replace\b/i,
    /^paste\b/i,
    /^1234567890+$/,
    /^0+$/,
];

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return {};

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new Error(`${path.basename(filePath)} is not valid JSON: ${error.message}`);
    }
}

const loadedConfigPath = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_CONFIG_PATH;
const config = readJsonFile(loadedConfigPath);

function isConfiguredString(value) {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();
    if (!trimmed) return false;

    return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getByPath(source, dottedPath, fallback = undefined) {
    const value = String(dottedPath)
        .split('.')
        .reduce((current, key) => (current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined), source);

    return value === undefined ? fallback : value;
}

function getFirstConfiguredString(...paths) {
    for (const dottedPath of paths) {
        const value = getByPath(config, dottedPath);
        if (isConfiguredString(value)) return value.trim();
    }

    return null;
}

function getConfig() {
    return config;
}

function getBotToken() {
    if (isConfiguredString(process.env.DISCORD_TOKEN)) return process.env.DISCORD_TOKEN.trim();
    return getFirstConfiguredString('token');
}

function getOpenAiApiKey(aiChatConfig = config.aiChat || {}) {
    const envCandidates = [
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_ADMIN_KEY,
    ];

    for (const value of envCandidates) {
        if (isConfiguredString(value)) return value.trim();
    }

    const configCandidates = [
        aiChatConfig.apiKey,
        aiChatConfig.adminAPIKey,
        aiChatConfig.openaiApiKey,
    ];

    for (const value of configCandidates) {
        if (isConfiguredString(value)) return value.trim();
    }

    return null;
}

function getRoleId(roleName) {
    return getFirstConfiguredString(`roles.${roleName}`, roleName);
}

function getModRoleId() {
    return getRoleId('modRole');
}

function getAdminRoleId() {
    return getRoleId('adminRole');
}

function getLogChannelId(logName) {
    return getFirstConfiguredString(`logChannels.${logName}`);
}

module.exports = {
    CONFIG_PATH,
    EXAMPLE_CONFIG_PATH,
    getAdminRoleId,
    getBotToken,
    getByPath,
    getConfig,
    getFirstConfiguredString,
    getLogChannelId,
    getModRoleId,
    getOpenAiApiKey,
    getRoleId,
    isConfiguredString,
};
