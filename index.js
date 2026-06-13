const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// --- Calea sigură către data.json ---
const dbPath = path.join(process.cwd(), 'data.json');

// --- Funcție sigură de încărcare ---
function getDB() {
    try {
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Exemplu +p (Profil)
    if (message.content.startsWith("+p")) {
        const db = getDB();
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`Profil: ${user.username}`)
            .setDescription(`Vouch-uri: ${db[user.id]?.total || 0}`);
        message.reply({ embeds: [embed] });
    }
});

// Aici adaugi restul comenzilor slash menționate anterior
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    // Exemplu Mark Scammer
    if (interaction.commandName === 'mark') {
        await interaction.reply("Utilizator marcat ca scammer.");
    }
});

client.login(process.env.DISCORD_TOKEN);
