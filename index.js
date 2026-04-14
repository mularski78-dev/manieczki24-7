const ffmpeg = require("ffmpeg-static");
process.env.FFMPEG_PATH = ffmpeg;

const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");

const express = require("express");
const app = express();

// 🌐 WEB SERVER (Render wymaga)
app.get("/", (req, res) => {
  res.send("Bot działa 24/7!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Serwer działa na porcie ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "!";

// 🎵 PLAYER (stabilniejszy)
const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play
  }
});

// 🔥 RADIO LINK
const RADIO_URL = "https://radioparty.pl:8015/energy2000";

client.once("clientReady", () => {
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

      const resource = createAudioResource(RADIO_URL);

      player.play(resource);
      connection.subscribe(player);

      message.reply("📻 Gram Energy2000!");
    } catch (err) {
      console.error(err);
      message.reply("❌ Błąd radia");
    }
  }

  // 🛑 STOP
  if (command === "stop") {
    player.stop();
    message.reply("🛑 Radio zatrzymane");
  }
});

// 🔁 AUTO RESTART (jak się zatrzyma)
player.on(AudioPlayerStatus.Idle, () => {
  console.log("🔄 Strumień zatrzymany");
});

player.on("error", error => {
  console.error("❌ Błąd playera:", error.message);
});

// 🔑 TOKEN z Render ENV
if (!process.env.TOKEN) {
  console.log("❌ BRAK TOKENA!");
  process.exit(1);
}

client.login(process.env.TOKEN);
