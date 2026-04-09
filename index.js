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


// =====================
// 🌐 EXPRESS (RENDER KEEP ALIVE)
// =====================
const app = express();
app.get('/', (req, res) => res.send('Bot działa 24/7 🎧'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🌐 Serwer działa na porcie', PORT));


// =====================
// 🤖 DISCORD BOT
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;


// =====================
// 📻 RADIO (STABILNY STREAM)
// =====================
const STREAM_URL = 'http://stream.radioparadise.com/mp3-192';

let connection = null;
let player = null;
let restarting = false;


// =====================
// 📻 PANEL
// =====================
client.on('messageCreate', async (message) => {
    if (message.content !== '!panel') return;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('play')
            .setLabel('▶️ START')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('⛔ STOP')
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId('status')
            .setLabel('📡 STATUS')
            .setStyle(ButtonStyle.Secondary)
    );

    message.channel.send({
        content: '📻 **PANEL RADIA 24/7**',
        components: [row]
    });
});


// =====================
// 🎛️ INTERACTIONS (FIX 10062)
// =====================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {

        // =====================
        // ▶️ START
        // =====================
        if (interaction.customId === 'play') {

            const voiceChannel = interaction.member?.voice?.channel;

            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ Wejdź na kanał głosowy!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            if (connection) {
                try { connection.destroy(); } catch {}
                connection = null;
            }

            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            });

            connection.subscribe(player);

            startRadio();

            await interaction.editReply(`▶️ Radio działa na: **${voiceChannel.name}**`);
        }


        // =====================
        // ⛔ STOP
        // =====================
        if (interaction.customId === 'stop') {

            await interaction.deferReply();

            try {
                if (connection) connection.destroy();
                connection = null;

                if (player) player.stop();
                player = null;

            } catch {}

            await interaction.editReply('⛔ Radio zatrzymane');
        }


        // =====================
        // 📡 STATUS
        // =====================
        if (interaction.customId === 'status') {

            await interaction.deferReply();

            await interaction.editReply(
                connection ? '📡 Radio: **AKTYWNE**' : '❌ Radio: **OFFLINE**'
            );
        }

    } catch (err) {
        console.error('INTERACTION ERROR:', err);

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: '❌ Błąd interakcji', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Błąd interakcji', ephemeral: true });
        }
    }
});


// =====================
// 🎧 RADIO ENGINE (STABILNY + AUTO RECONNECT)
// =====================
function startRadio() {
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

    player.play(resource);

    player.removeAllListeners();

    player.on(AudioPlayerStatus.Playing, () => {
        console.log('🔥 RADIO GRA');
    });

    player.on(AudioPlayerStatus.Idle, () => {
        if (restarting) return;

        restarting = true;
        setTimeout(() => {
            restarting = false;
            startRadio();
        }, 2000);
    });

    player.on('error', (err) => {
        console.error('❌ PLAYER ERROR:', err);

        setTimeout(() => {
            startRadio();
        }, 2000);
    });
}


// =====================
// ✅ READY
// =====================
client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);
