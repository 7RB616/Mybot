const fs = require("fs");
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

let links = {};
let codes = {};

if (fs.existsSync("links.json")) {
  links = JSON.parse(fs.readFileSync("links.json", "utf8"));
}

function saveLinks() {
  fs.writeFileSync("links.json", JSON.stringify(links, null, 2));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("ربط حسابك مع خادم MTA")
    .addStringOption(option =>
      option
        .setName("code")
        .setDescription("كود الربط من داخل الخادم")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

client.once("ready", async () => {
  console.log(`Bot logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {
    const code = interaction.options.getString("code");
    const data = codes[code];

    if (!data) {
      return interaction.reply({
        content: "❌ الكود غير صحيح أو منتهي.",
        ephemeral: true
      });
    }

    links[data.serial] = interaction.user.id;
    saveLinks();

    delete codes[code];

    await interaction.reply({
      content: "✅ تم ربط حسابك بنجاح.",
      ephemeral: true
    });

    try {
      await interaction.user.send("✅ تم ربط حسابك مع خادم MTA بنجاح.");
    } catch {}
  }
});

app.get("/", (req, res) => {
  res.send("MTA Discord API is running");
});

app.post("/generate-code", (req, res) => {
  const { key, serial, playerName, code } = req.body;

  if (key !== SECRET_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!serial || !code) {
    return res.status(400).json({ error: "Missing serial or code" });
  }

  codes[String(code)] = {
    serial,
    playerName: playerName || "Unknown",
    createdAt: Date.now()
  };

  res.json({ success: true, message: "Code stored" });
});

app.post("/send-dm", async (req, res) => {
  const { key, serial, message } = req.body;

  if (key !== SECRET_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const discordId = links[serial];

  if (!discordId) {
    return res.status(404).json({ error: "Player not linked" });
  }

  try {
    const user = await client.users.fetch(discordId);
    await user.send(message || "رسالة من خادم MTA");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send DM" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

client.login(process.env.TOKEN);
