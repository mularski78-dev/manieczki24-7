const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    StreamType
} = require('@discordjs/voice');

const { spawn } = require('child_process');
const express = require('express');
const ffmpegPath = require('ffmpeg-static');

// 🌐 24/7
const app = express();
app.get('/', (req, res) => res.send('Bot działa 24/7 🎧'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serwer działa na porcie', PORT));

// 🔑 BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

// 🔊 STREAM
const STREAM_URL = 'https://forum.radioparty.pl:8005/stream64aac';

let connection;
let player;

// 🎛️ PANEL
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

// 🎛️ PRZYCISKI
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const voiceChannel = interaction.member.voice.channel;

    // ▶️ START
    if (interaction.customId === 'play') {

        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ Wejdź na kanał głosowy!',
                ephemeral: true
            });
        }

        if (connection) connection.destroy();

        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Play }
        });

        connection.subscribe(player);

        playRadio();

        interaction.reply(`▶️ Radio gra na ${voiceChannel.name}`);
    }

    // ⛔ STOP
    if (interaction.customId === 'stop') {

        if (connection) {
            connection.destroy();
            connection = null;
        }

        if (player) player.stop();

        interaction.reply('⛔ Radio zatrzymane');
    }

    // 📻 STATUS
    if (interaction.customId === 'status') {
        interaction.reply(connection ? '📻 Radio gra' : '❌ Radio wyłączone');
    }
});

// 🎧 RADIO (NAPRAWIONE)
function playRadio() {

    if (!player) return;

    const ffmpeg = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', STREAM_URL,
        '-vn',
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ]);

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw
    });

    player.play(resource);

    ffmpeg.on('error', console.error);
}

// ✅ READY
client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);
