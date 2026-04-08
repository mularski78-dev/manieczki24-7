const { Client, GatewayIntentBits } = require("discord.js");
const { Player } = require("discord-player");
const express = require("express");

// 🔧 TOKEN (ustaw w ENV na Renderze)
const TOKEN = process.env.TOKEN;

// 🎧 Twoja playlista
const PLAYLIST_URL = "https://www.youtube.com/watch?v=0v_EUOUHL4M&list=PLu0HO7zwoMMm7R_DTweC39Tr0X50gBquM";

// 🤖 Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 🎵 Player
const player = new Player(client);

// 🌐 SERWER (WAŻNE dla Render)
const app = express();

app.get("/", (req, res) => {
    res.send("Bot działa 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Serwer działa na porcie ${PORT}`);
});

// 🔥 LOGI
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// 🤖 READY
client.once("ready", async () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

// 🎧 KOMENDA PLAY (prosta)
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!play") {
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply("Wejdź na kanał głosowy!");
        }

        const queue = player.nodes.create(message.guild, {
            metadata: {
                channel: message.channel
            }
        });

        try {
            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }
        } catch {
            queue.destroy();
            return message.reply("Nie mogę połączyć się z kanałem!");
        }

        const result = await player.search(PLAYLIST_URL, {
            requestedBy: message.author
        });

        if (!result.hasPlaylist()) {
            return message.reply("Nie znaleziono playlisty!");
        }

        queue.addTrack(result.playlist.tracks);

        if (!queue.node.isPlaying()) {
            await queue.node.play();
        }

        message.reply(`🎧 Odtwarzam playlistę: **${result.playlist.title}**`);
    }
});

// 🔐 LOGIN
client.login(TOKEN);
