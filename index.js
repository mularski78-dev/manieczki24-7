const express = require('express');
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType
} = require('@discordjs/voice');

const { spawn } = require('child_process');

// =====================
// EXPRESS (Render keep alive)
// =====================
const app = express();
app.get('/', (req, res) => res.send('Radio bot is alive'));
app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Web server running");
});

// =====================
// DISCORD BOT
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// =====================
// GLOBAL STATE
// =====================
let connection;
let player;
let ffmpeg;

// =====================
// STREAM
// =====================
const STREAM_URL = "http://stream.radioparty.pl:8000/radioparty";

function startRadio() {

    if (ffmpeg) {
        try { ffmpeg.kill('SIGKILL'); } catch {}
    }

    ffmpeg = spawn('ffmpeg', [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', STREAM_URL,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Arbitrary
    });

    if (!player) {
        player = createAudioPlayer();

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("🔁 Stream idle (no auto-restart spam)");
        });

        player.on('error', err => {
            console.log("❌ Player error:", err.message);
        });
    }

    player.play(resource);

    if (connection) {
        connection.subscribe(player);
    }

    console.log("🎧 Radio STARTED");
}

// =====================
// READY
// =====================
client.once('ready', () => {
    console.log(`✅ Logged as ${client.user.tag}`);
});

// =====================
// BUTTON HANDLER (FIX 10062)
// =====================
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) return;

    try {

        // 🔥 PROTECTION (10062 FIX)
        if (interaction.deferred || interaction.replied) return;

        await interaction.deferReply({ flags: 64 });

        // =====================
        // START
        // =====================
        if (interaction.customId === 'start') {

            const channel = interaction.member.voice.channel;

            if (!channel) {
                return interaction.editReply("❌ Wejdź na voice channel");
            }

            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
            });

            // 🔥 WAŻNE: delay fix (stabilność voice)
            setTimeout(() => {
                startRadio();
            }, 500);

            return interaction.editReply("▶️ Radio Party działa!");

        }

        // =====================
        // STOP
        // =====================
        if (interaction.customId === 'stop') {

            try { if (player) player.stop(); } catch {}
            try { if (connection) connection.destroy(); } catch {}
            try { if (ffmpeg) ffmpeg.kill('SIGKILL'); } catch {}

            return interaction.editReply("⏹️ Radio zatrzymane");
        }

    } catch (err) {
        console.error("Interaction error:", err);

        try {
            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Błąd interakcji",
                    flags: 64
                });
            }
        } catch {}
    }
});

// =====================
// SLASH COMMAND /radio
// =====================
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'radio') {

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start')
                .setLabel('▶️ Start')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: "📻 Radio Party 24/7",
            components: [row]
        });
    }
});

// =====================
client.login(process.env.TOKEN);
