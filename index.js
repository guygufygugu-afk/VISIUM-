const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= DATABASE JSON =================

const dbFile = "./db.json";
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, "{}");

const loadDB = () => JSON.parse(fs.readFileSync(dbFile));
const saveDB = (db) => fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

// ================= COMMANDS =================

const commands = [
  new SlashCommandBuilder().setName("ban").setDescription("Ban user")
    .addUserOption(o => o.setName("user").setRequired(true)),

  new SlashCommandBuilder().setName("mute").setDescription("Mute user")
    .addUserOption(o => o.setName("user").setRequired(true)),

  new SlashCommandBuilder().setName("unmute").setDescription("Unmute user")
    .addUserOption(o => o.setName("user").setRequired(true)),

  new SlashCommandBuilder().setName("markscammer").setDescription("Mark scammer")
    .addUserOption(o => o.setName("user").setRequired(true)),

  new SlashCommandBuilder().setName("balance").setDescription("Check balance"),
  new SlashCommandBuilder().setName("daily").setDescription("Daily reward"),
  new SlashCommandBuilder().setName("work").setDescription("Work for money"),

  new SlashCommandBuilder().setName("ticketpanel").setDescription("Create ticket panel"),
  new SlashCommandBuilder().setName("suggestpanel").setDescription("Suggestion panel")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Commands loaded");
})();

// ================= READY =================

client.once("ready", () => {
  console.log(`${client.user.tag} online`);
});

// ================= INTERACTIONS =================

client.on("interactionCreate", async interaction => {

  // ========== SLASH COMMANDS ==========
  if (interaction.isChatInputCommand()) {

    const db = loadDB();

    if (!db.users) db.users = {};

    const userId = interaction.user.id;
    if (!db.users[userId]) db.users[userId] = { coins: 0 };

    // BAN
    if (interaction.commandName === "ban") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return interaction.reply({ content: "No permission", ephemeral: true });

      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id);
      await member.ban();

      return interaction.reply(`${user.tag} banned`);
    }

    // MUTE (timeout 10 min)
    if (interaction.commandName === "mute") {
      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id);

      await member.timeout(10 * 60 * 1000);
      return interaction.reply(`${user.tag} muted`);
    }

    // UNMUTE
    if (interaction.commandName === "unmute") {
      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id);

      await member.timeout(null);
      return interaction.reply(`${user.tag} unmuted`);
    }

    // SCAMMER
    if (interaction.commandName === "markscammer") {
      db.users[interaction.options.getUser("user").id] = { scammer: true };
      saveDB(db);

      return interaction.reply("User marked as scammer");
    }

    // ECONOMY
    if (interaction.commandName === "balance") {
      saveDB(db);
      return interaction.reply(`Coins: ${db.users[userId].coins}`);
    }

    if (interaction.commandName === "daily") {
      db.users[userId].coins += 500;
      saveDB(db);
      return interaction.reply("+500 coins");
    }

    if (interaction.commandName === "work") {
      const earned = Math.floor(Math.random() * 300) + 50;
      db.users[userId].coins += earned;
      saveDB(db);
      return interaction.reply(`You earned ${earned}`);
    }

    // TICKET PANEL
    if (interaction.commandName === "ticketpanel") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("Create Ticket")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ content: "Ticket system", components: [row] });
    }

    // SUGGEST PANEL
    if (interaction.commandName === "suggestpanel") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("suggest_open")
          .setLabel("Send Suggestion")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ content: "Suggestions", components: [row] });
    }
  }

  // ========== BUTTONS ==========
  if (interaction.isButton()) {

    // TICKET CREATE
    if (interaction.customId === "ticket_create") {
      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ["ViewChannel"]
          },
          {
            id: interaction.user.id,
            allow: ["ViewChannel", "SendMessages"]
          }
        ]
      });

      return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    // SUGGEST MODAL
    if (interaction.customId === "suggest_open") {

      const modal = new ModalBuilder()
        .setCustomId("suggest_modal")
        .setTitle("Suggestion");

      const input = new TextInputBuilder()
        .setCustomId("suggest_text")
        .setLabel("Your suggestion")
        .setStyle(TextInputStyle.Paragraph);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }
  }

  // ========== MODAL ==========
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "suggest_modal") {
      const text = interaction.fields.getTextInputValue("suggest_text");

      const embed = new EmbedBuilder()
        .setTitle("New Suggestion")
        .setDescription(text)
        .setColor("Green");

      interaction.guild.channels.cache
        .find(c => c.name === "suggestions")
        ?.send({ embeds: [embed] });

      return interaction.reply({ content: "Suggestion sent!", ephemeral: true });
    }
  }
});

// ================= ANTI LINK =================

client.on("messageCreate", message => {
  if (message.author.bot) return;

  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      message.delete();
      message.channel.send(`${message.author}, links not allowed`);
    }
  }
});

client.login(TOKEN);
