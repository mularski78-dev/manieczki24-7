const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("OK"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const player = createAudioPlayer();
const RADIO_URL = "https://radioparty.pl:8015/energy2000";

client.on("messageCreate", async (message) => {
  if (message.content === "!radio") {
    const channel = message.member.voice.channel;
    if (!channel) return;

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    const resource = createAudioResource(RADIO_URL);
    player.play(resource);
    connection.subscribe(player);
  }
});

client.login(process.env.TOKEN);
