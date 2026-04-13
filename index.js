const ffmpeg = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpeg;

const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType
} = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "!";
const player = createAudioPlayer();

// 🔥 TWÓJ LINK RADIA
const RADIO_URL = "https://radioparty.pl:8015/energy2000";

client.once('ready', () => {
  console.log("✅ Bot działa (radio)");
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  if (message.content === "!radio") {

    const channel = message.member.voice.channel;
    if (!channel) return message.reply("❌ Wejdź na voice!");

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      const resource = createAudioResource(RADIO_URL, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });

      player.play(resource);
      connection.subscribe(player);

      message.reply("📻 Gram Energy2000!");
    } catch (err) {
      console.error(err);
      message.reply("❌ Błąd radia");
    }
  }
});

client.login(process.env.TOKEN);
