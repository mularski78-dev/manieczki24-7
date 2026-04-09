process.env.OPUS_ENGINE = 'opusscript';

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    NoSubscriberBehavior
} = require('@discordjs/voice');

const { spawn } = require('child_process');
const express = require('express');
const ffmpegPath = require('ffmpeg-static');

// 🌐 SERWER (RENDER)
const app = express();
app.get('/', (req, res) => res.send('Bot działa 24/7 🎧'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serwer działa na porcie', PORT));

// 🤖 BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

// 🔊 STREAM (PEWNIAK TESTOWY)
const STREAM_URL = 'http://stream.radioparadise.com/mp3-192';

let connection;
let player;

// 📻 PANEL
client.on('messageCreate', async message => {
    if (message.content === '!panel') {

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('play').setLabel('▶️ Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('stop').setLabel('⛔ Stop').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('status').setLabel('📻 Status').setStyle(ButtonStyle.Secondary)
        );

        message.channel.send({
            content: '📻 PANEL RADIA',
            components: [row]
        });
    }
});

// 🎛️ INTERAKCJE
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        const voiceChannel = interaction.member?.voice?.channel;

        if (interaction.customId === 'play') {

            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ Wejdź na kanał głosowy!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            if (connection) connection.destroy();

            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            player = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Play }
            });

            connection.subscribe(player);

            playRadio();

            await interaction.editReply(`▶️ Radio gra na ${voiceChannel.name}`);
        }

        if (interaction.customId === 'stop') {

            await interaction.deferReply();

            if (connection) {
                connection.destroy();
                connection = null;
            }

            if (player) player.stop();

            await interaction.editReply('⛔ Radio zatrzymane');
        }

        if (interaction.customId === 'status') {

            await interaction.deferReply();

            await interaction.editReply(
                connection ? '📻 Radio gra' : '❌ Radio wyłączone'
            );
        }

    } catch (err) {
        console.error(err);
    }
});

// 🎧 RADIO (FINAL FIX – OPUS)
function playRadio() {

    if (!player) return;

    const ffmpeg = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', STREAM_URL,
        '-vn',
        '-c:a', 'libopus',
        '-f', 'opus',
        'pipe:1'
    ]);

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Opus
    });

    player.removeAllListeners();

    player.play(resource);

    player.on(AudioPlayerStatus.Playing, () => {
        console.log('🔥 AUDIO DZIAŁA');
    });

    player.on(AudioPlayerStatus.Idle, () => {
        setTimeout(playRadio, 1000);
    });

    player.on('error', (err) => {
        console.error('PLAYER ERROR:', err);
        setTimeout(playRadio, 1000);
    });
}

// ✅ READY
client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);
