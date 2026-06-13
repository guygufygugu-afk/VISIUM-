const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 1. AICI DEFINIM COMENZILE ---
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica daca botul este activ'),
    new SlashCommandBuilder()
        .setName('mark')
        .setDescription('Marcheaza un utilizator ca scammer')
        .addUserOption(o => o.setName('user').setDescription('Utilizatorul de marcat').setRequired(true))
        .addStringOption(o => o.setName('motiv').setDescription('Motivul pentru scam').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzile au fost sincronizate!');
    } catch (error) {
        console.error('Eroare la sincronizare:', error);
    }
});

// --- 2. AICI FACEM LOGICA COMENZILOR ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! Botul funcționează.');
    }

    if (interaction.commandName === 'mark') {
        const u = interaction.options.getUser('user');
        const motiv = interaction.options.getString('motiv');
        
        const embed = new EmbedBuilder()
            .setTitle("🚨 Scammer Marcat")
            .setDescription(`**Utilizator:** ${u}\n**Motiv:** ${motiv}`)
            .setColor("#ff3333")
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
