const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const { getConfig } = require('./config');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const TICKET_OWNER_REGEX = /^\d{17,20}$/;

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return getConfig();
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function parseTicketTopic(topic) {
    if (typeof topic !== 'string') {
        return { ownerId: null, modPinged: false, closed: false };
    }

    const trimmed = topic.trim();
    if (!trimmed) {
        return { ownerId: null, modPinged: false, closed: false };
    }

    if (TICKET_OWNER_REGEX.test(trimmed)) {
        return { ownerId: trimmed, modPinged: false, closed: false };
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
            const ownerId = typeof parsed.ownerId === 'string' && TICKET_OWNER_REGEX.test(parsed.ownerId)
                ? parsed.ownerId
                : null;

            return {
                ownerId,
                modPinged: Boolean(parsed.modPinged),
                closed: Boolean(parsed.closed),
            };
        }
    } catch {
        return { ownerId: null, modPinged: false, closed: false };
    }

    return { ownerId: null, modPinged: false, closed: false };
}

function buildTicketTopic(ownerId, options = {}) {
    return JSON.stringify({
        ownerId: String(ownerId),
        modPinged: Boolean(options.modPinged),
        closed: Boolean(options.closed),
    });
}

function getTicketMeta(channel) {
    return parseTicketTopic(channel?.topic);
}

function isTicketChannel(channel, ticketCategoryId) {
    if (!channel || typeof channel.name !== 'string') return false;

    const isNamedTicket = channel.name.startsWith('ticket-') || channel.name.startsWith('closed-');
    if (!isNamedTicket) return false;

    if (!ticketCategoryId) return true;
    return channel.parentId === ticketCategoryId;
}

function isOpenTicketChannel(channel, ticketCategoryId) {
    if (!channel || typeof channel.name !== 'string') return false;
    if (!channel.name.startsWith('ticket-')) return false;

    if (!ticketCategoryId) return true;
    return channel.parentId === ticketCategoryId;
}

function findOpenTicketByOwner(guild, ownerId, ticketCategoryId) {
    if (!guild || !ownerId) return null;

    return guild.channels.cache.find((channel) => {
        if (!isOpenTicketChannel(channel, ticketCategoryId)) return false;
        const ticketMeta = getTicketMeta(channel);
        return ticketMeta.ownerId === ownerId;
    }) || null;
}

async function closeTicketChannel(channel, guild, ticketRoleId) {
    const ticketMeta = getTicketMeta(channel);
    if (!ticketMeta.ownerId) {
        return { ok: false, error: 'Could not determine the ticket owner from this channel.' };
    }

    const updatedName = channel.name.startsWith('ticket-')
        ? channel.name.replace('ticket-', 'closed-')
        : channel.name;

    const permissionOverwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: ticketMeta.ownerId,
            deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
    ];

    if (ticketRoleId) {
        permissionOverwrites.push({
            id: ticketRoleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        });
    }

    await channel.edit({
        name: updatedName,
        topic: buildTicketTopic(ticketMeta.ownerId, {
            modPinged: ticketMeta.modPinged,
            closed: true,
        }),
        permissionOverwrites,
    });

    return { ok: true, ownerId: ticketMeta.ownerId };
}

module.exports = {
    loadConfig,
    parseTicketTopic,
    buildTicketTopic,
    getTicketMeta,
    isTicketChannel,
    isOpenTicketChannel,
    findOpenTicketByOwner,
    closeTicketChannel,
};
