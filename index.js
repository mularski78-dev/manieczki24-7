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

// 🔊 STABILNY STREAM (działa 24/7)
const STREAM_URL = 'https://www.youtube.com/watch?v=0v_EUOUHL4M&list=PLu0HO7zwoMMm7R_DTweC39Tr0X50gBquM';

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

// 🎛️ BUTTONY
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

        const resource = createAudioResource(STREAM_URL, {
            inputType: StreamType.Arbitrary
        });

        player.play(resource);

        interaction.reply(`▶️ Radio gra na ${channel.name}`);
    }

    // ⛔ STOP
    if (interaction.customId === 'stop') {
        if (connection) {
            connection.destroy();
            interaction.reply('⛔ Radio zatrzymane');
        } else {
            interaction.reply({ content: '❌ Radio nie działa', ephemeral: true });
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

client.once('ready', () => {
    console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

client.login(TOKEN);
