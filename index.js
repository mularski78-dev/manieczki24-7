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
    StreamType,
    NoSubscriberBehavior
} = require('@discordjs/voice');

const express = require('express');

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

// 🔊 STREAM (radio)
const STREAM_URL = 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one';

let connection;
let player;

// 🌐 EXPRESS (NAPRAWIA TIMEOUT RENDER)
const app = express();

app.get("/", (req, res) => {
    res.send("Radio bot działa 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Serwer działa na porcie ${PORT}`);
});

// 🔥 LOGI BŁĘDÓW (WAŻNE)
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// 🎛️ PANEL
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!panel') {

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('play').setLabel('▶️ Start').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('stop').setLabel('⛔ Stop').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('move').setLabel('🔄 Move').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('status').setLabel('📻 Status').setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({
            content: '📻 PANEL RADIA',
            components: [row]
        });
    }
});

// 🎛️ BUTTONY
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const channel = interaction.member.voice.channel;

    // ▶️ START
    if (interaction.customId === 'play') {
        if (!channel) {
            return interaction.reply({ content: '❌ Wejdź na voice!', ephemeral: true });
        }

        try {
            if (connection) connection.destroy();

            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            player = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Play }
            });

            connection.subscribe(player);

            const resource = createAudioResource(STREAM_URL, {
                inputType: StreamType.Arbitrary
            });

            player.play(resource);

            // 🔁 AUTO RECONNECT (WAŻNE)
            player.on(AudioPlayerStatus.Idle, () => {
                player.play(createAudioResource(STREAM_URL, {
                    inputType: StreamType.Arbitrary
                }));
            });

            await interaction.reply(`▶️ Radio gra na ${channel.name}`);

        } catch (err) {
            console.error(err);
            interaction.reply({ content: '❌ Błąd podczas uruchamiania radia', ephemeral: true });
        }
    }

    // ⛔ STOP
    if (interaction.customId === 'stop') {
        try {
            if (connection) {
                connection.destroy();
                connection = null;
            }

            await interaction.reply('⛔ Radio zatrzymane');

        } catch (err) {
            console.error(err);
        }
    }

    // 🔄 MOVE
    if (interaction.customId === 'move') {
        if (!channel) {
            return interaction.reply({ content: '❌ Wejdź na voice!', ephemeral: true });
        }

        if (connection) connection.destroy();

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        await interaction.reply(`🔄 Przeniesiono na ${channel.name}`);
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

client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);
