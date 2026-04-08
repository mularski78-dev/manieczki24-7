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

// 🌐 24/7
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot działa 24/7 🎧'));
app.listen(process.env.PORT || 3000);

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

// 🔊 TWÓJ STREAM
const STREAM_URL = 'https://playback.media-streaming.soundcloud.cloud/nXLHSIMDt5ft/aac_160k/8f825a47-8b82-4256-ab81-19806241b217/playlist.m3u8?expires=1775587688&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wbGF5YmFjay5tZWRpYS1zdHJlYW1pbmcuc291bmRjbG91ZC5jbG91ZC9uWExIU0lNRHQ1ZnQvYWFjXzE2MGsvOGY4MjVhNDctOGI4Mi00MjU2LWFiODEtMTk4MDYyNDFiMjE3L3BsYXlsaXN0Lm0zdTg~ZXhwaXJlcz0xNzc1NTg3Njg4IiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzc1NTgwNjA4fX19XX0_&Signature=Wh-b-WZV87hdYkfehqV~q2wwFZgnq2yDqY34m2T13DrktjoMqZnq3CfMdmBTyPd27E85W6knwGB9eIWtyXVUTq~URm9F6DM8k-1WtzuP3NtGwBdhNektVL08XYJ~s4ry5JF0jzVbK1jUDXdcW9cKlZunda6H-W6VAnlVf~pabJlbKEDdsI5DeFV04E8Cm8GS2l8NrKmZBEOAdEHARNaqo4D4jiNisORCBgBD2iqlRfIL767uYTq6~tNniXgmIjJ9izFZs7clJgQEa-G2N14sic6W3-2Z4ftIHU18iRuK9GXJVzii0cBL13lsBJu6oATmRoaBgKHQX6pDrJzT9uxE8Q__&Key-Pair-Id=K34606QXLEIRF3';

let connection;
let player;

// 🎛️ PANEL
client.on('messageCreate', async message => {
    if (message.content === '!panel') {

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('play').setLabel('▶️ Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('stop').setLabel('⛔ Stop').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('move').setLabel('🔄 Move').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('status').setLabel('📻 Status').setStyle(ButtonStyle.Secondary)
        );

        message.channel.send({
            content: '📻 PANEL RADIA',
            components: [row]
        });
    }
});

// 🎛️ OBSŁUGA KLIKNIĘĆ
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const channel = interaction.member.voice.channel;

    // ▶️ START
    if (interaction.customId === 'play') {
        if (!channel) return interaction.reply({ content: '❌ Wejdź na voice!', ephemeral: true });

        if (connection) connection.destroy();

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Play }
        });

        connection.subscribe(player);
        playRadio();

        interaction.reply(`▶️ Radio gra na ${channel.name}`);
    }

    // ⛔ STOP
    if (interaction.customId === 'stop') {
        if (connection) {
            connection.destroy();
            interaction.reply('⛔ Radio zatrzymane');
        }
    }

    // 🔄 MOVE
    if (interaction.customId === 'move') {
        if (!channel) return interaction.reply({ content: '❌ Wejdź na voice!', ephemeral: true });

        if (connection) connection.destroy();

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        connection.subscribe(player);
        interaction.reply(`🔄 Przeniesiono na ${channel.name}`);
    }

    // 📻 STATUS
    if (interaction.customId === 'status') {
        if (connection) {
            interaction.reply('📻 Radio gra');
        } else {
            interaction.reply('❌ Radio wyłączone');
        }
    }
});

// 🎧 RADIO
function playRadio() {
    const ffmpeg = spawn('ffmpeg', [
        '-i', STREAM_URL,
        '-analyzeduration', '0',
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

    player.on(AudioPlayerStatus.Idle, () => playRadio());
    player.on('error', () => playRadio());
}

client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);