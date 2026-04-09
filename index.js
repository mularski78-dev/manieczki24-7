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

// 🌐 24/7
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

// 🔊 STREAM (TWÓJ)
const STREAM_URL = 'https://forum.radioparty.pl:8005/stream64aac';

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

// 🎛️ OBSŁUGA PRZYCISKÓW
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
            connection = null;
        }
        if (player) player.stop();

        interaction.reply('⛔ Radio zatrzymane');
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

    if (!player) return;

    const ffmpeg = spawn('ffmpeg', [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
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

    // 🔁 restart tylko raz
    player.removeAllListeners(AudioPlayerStatus.Idle);
    player.removeAllListeners('error');

    player.on(AudioPlayerStatus.Idle, () => {
        setTimeout(playRadio, 1000);
    });

    player.on('error', () => {
        setTimeout(playRadio, 1000);
    });
}

// ✅ READY
client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);
