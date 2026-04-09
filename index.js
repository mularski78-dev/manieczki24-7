const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    NoSubscriberBehavior
} = require('@discordjs/voice');

const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

// 📻 RADIO LINK
const STREAM_URL = 'http://stream.radioparadise.com/mp3-192';

let connection;
let player;

client.on('messageCreate', async (message) => {
    if (message.content !== '!radio') return;

    const voiceChannel = message.member?.voice?.channel;

    if (!voiceChannel) {
        return message.reply('❌ Wejdź na voice!');
    }

    connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true
    });

    player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });

    connection.subscribe(player);

    const ffmpeg = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', STREAM_URL,
        '-vn',
        '-f', 'opus',
        'pipe:1'
    ]);

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Opus
    });

    player.play(resource);

    player.on(AudioPlayerStatus.Playing, () => {
        console.log('RADIO GRA');
    });
});

client.once('ready', () => {
    console.log('BOT ONLINE');
});

client.login(TOKEN);
