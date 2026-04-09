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
// EXPRESS (FIX RENDER PORT)
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
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let connection;
let player;
let ffmpeg;

// =====================
// RADIO STREAM
// =====================
const STREAM_URL = "http://stream.radioparty.pl:8000/radioparty";

function startRadio() {

    if (ffmpeg) ffmpeg.kill('SIGKILL');

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

        // 🔁 AUTO RESTART
        player.on(AudioPlayerStatus.Idle, () => {
            console.log("🔁 Restart radio...");
            startRadio();
        });

        player.on('error', err => {
            console.log("❌ Player error:", err.message);
            startRadio();
        });
    }

    player.play(resource);
    connection.subscribe(player);

    console.log("🎧 Radio STARTED");
}

// =====================
// BOT READY
// =====================
client.once('ready', () => {
    console.log(`✅ Logged as ${client.user.tag}`);
});

// =====================
// BUTTONS (FIX 10062)
// =====================
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) return;

    try {

        // 🔥 MUST BE FIRST (fix 10062)
        await interaction.deferReply({ flags: 64 });

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

            startRadio();

            return interaction.editReply("▶️ Radio Party działa!");

        }

        if (interaction.customId === 'stop') {

            if (player) player.stop();
            if (connection) connection.destroy();
            if (ffmpeg) ffmpeg.kill('SIGKILL');

            return interaction.editReply("⏹️ Radio zatrzymane");
        }

    } catch (err) {
        console.error("Interaction error:", err);
    }
});

// =====================
// COMMAND PANEL
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
