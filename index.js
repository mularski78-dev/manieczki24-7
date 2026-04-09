const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType
} = require('@discordjs/voice');
const { spawn } = require('child_process');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let connection;
let player;

client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

// 🔥 FUNKCJA RADIO (stabilna)
function playRadio() {
    const ffmpeg = spawn('ffmpeg', [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', 'http://stream.radioparty.pl:8000/radioparty',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Arbitrary
    });

    player = createAudioPlayer();

    // 🔁 AUTO RESTART
    player.on(AudioPlayerStatus.Idle, () => {
        console.log("🔁 Restart streama...");
        playRadio();
    });

    player.on('error', err => {
        console.log("❌ Player error:", err.message);
        playRadio();
    });

    player.play(resource);
    connection.subscribe(player);
}

// 🎛️ BUTTONY
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
        // 🔥 NAJWAŻNIEJSZE — brak błędu 10062
        await interaction.deferReply({ ephemeral: true });

        if (interaction.customId === 'start') {

            const channel = interaction.member.voice.channel;
            if (!channel) {
                return interaction.editReply("❌ Wejdź na kanał głosowy!");
            }

            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
            });

            playRadio();

            await interaction.editReply("▶️ Radio Party gra!");

        }

        if (interaction.customId === 'stop') {
            if (player) player.stop();
            if (connection) connection.destroy();

            await interaction.editReply("⏹️ Radio zatrzymane");
        }

    } catch (err) {
        console.error(err);
    }
});

// 📩 KOMENDA DO PANELU
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
            content: "🎧 Radio Party",
            components: [row]
        });
    }
});

client.login(process.env.TOKEN);
