const ffmpeg = require("ffmpeg-static");
process.env.FFMPEG_PATH = ffmpeg;

const playdl = require("play-dl");

const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource
} = require("@discordjs/voice");

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

// 🔥 RADIO LINK
const RADIO_URL = "https://radioparty.pl:8015/energy2000";

client.once("ready", () => {
  console.log("✅ Bot działa (radio)");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 🎵 RADIO START
  if (command === "radio") {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply("❌ Wejdź na voice!");

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      const stream = await playdl.stream(RADIO_URL);

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type
      });

      player.play(resource);
      connection.subscribe(player);

      message.reply("📻 Gram Energy2000!");
    } catch (err) {
      console.error(err);
      message.reply("❌ Błąd radia");
    }
  }

  // 🛑 STOP RADIO
  if (command === "stop") {
    player.stop();
    message.reply("🛑 Radio zatrzymane");
  }
});

client.login(process.env.TOKEN);
