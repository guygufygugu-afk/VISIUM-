const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const fs = require('fs');

// --- ÎNCĂRCARE BAZĂ DE DATE ---
const db = JSON.parse(fs.readFileSync('./data.json', 'utf8')); // Asigură-te că ai acest fișier

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        // --- SISTEM MARK (SCAMMER/HACKER) ---
        if (interaction.commandName === 'mark') {
            const user = interaction.options.getUser('user');
            const tip = interaction.options.getString('tip');
            const motiv = interaction.options.getString('motiv');
            const embed = new EmbedBuilder()
                .setTitle(`${tip.toUpperCase()} MARCAT`)
                .setColor(0xFF0000)
                .setDescription(`🚨 Utilizator marcat: ${tip}`)
                .addFields({ name: '👤 Utilizator', value: `<@${user.id}>` }, { name: '≫ Motiv', value: motiv });
            await interaction.reply({ embeds: [embed] });
        }

        // --- SISTEM WARNS ---
        if (interaction.commandName === 'warn') {
            const user = interaction.options.getUser('user');
            // Logica: Adaugă în JSON, apoi:
            await interaction.reply(`⚠️ Utilizatorul ${user.tag} a primit un avertisment.`);
        }

        if (interaction.commandName === 'warns') {
            const user = interaction.options.getUser('user');
            await interaction.reply(`📊 ${user.username} are X avertismente.`);
        }

        // --- SISTEM PROFIL (+p) ---
        if (interaction.commandName === 'p') {
            const user = interaction.options.getUser('user') || interaction.user;
            const embed = new EmbedBuilder()
                .setTitle(`👤 Profil: ${user.username}`)
                .addFields({ name: '⭐ Vouch-uri', value: '0' });
            await interaction.reply({ embeds: [embed] });
        }

        // --- SISTEM OWO ---
        if (interaction.commandName === 'owo') {
            await interaction.reply("🐾 Ai vânat și ai găsit 50 monede!");
        }

    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'A apărut o eroare!', ephemeral: true });
    }
});

client.login('TOKEN_AICI');
