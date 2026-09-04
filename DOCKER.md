# Docker Deployment

This repo is a Node.js Discord bot. Docker uses the detected `npm start` command from `package.json`, which runs `node index.js`.

## Build And Start

From a fresh clone:

```bash
cp configexample.json config.json
nano config.json
docker compose up -d --build
```

The Compose file targets `linux/arm64`, suitable for Debian 12 ARM64 on a Raspberry Pi 3.

The container uses host networking. That is intentional for Discord voice because voice connections rely on outbound UDP, which can be unreliable through some Docker bridge/NAT setups on small Linux hosts.

## Config And Secrets

Do not put real secrets in the Docker image. `config.json` is ignored by Git and excluded from the Docker build context.

Put the real runtime config at:

```text
./config.json
```

Compose mounts it into the container at:

```text
/app/config.json
```

You can also copy `.env.example` to `.env` and set `DISCORD_TOKEN` or `OPENAI_API_KEY` there. Environment variables override those token fields without changing the rest of `config.json`.

If you use the ticket setup command, the bot may update `config.json`, so the mount is writable by default.

The `/join` command plays:

```text
./sounds/join.mp3
```

Compose mounts `./sounds` into `/app/sounds` as read-only, so replacing `sounds/join.mp3` on the Pi is enough for the next `/join` run. Keep the filename exactly `join.mp3`.

## Slash Commands

If slash commands need to be registered or refreshed:

```bash
docker compose run --rm verity-bot npm run deploy:commands
```

Then start normally:

```bash
docker compose up -d --build
```

## Logs

The bot logs to stdout and stderr, so logs are available through Docker and Portainer:

```bash
docker compose logs -f verity-bot
```

## Restart Or Stop

```bash
docker compose restart verity-bot
docker compose stop verity-bot
```

To remove the stopped container:

```bash
docker compose down
```

## Rebuild After Git Pull

```bash
git pull
docker compose up -d --build
```

## Notes

No ports are exposed because the bot does not run a web server or API.

Even with host networking, the bot does not listen on a local web port.

No Docker healthcheck is included because this bot has no local HTTP endpoint or reliable process-local health probe for Discord gateway connectivity.
