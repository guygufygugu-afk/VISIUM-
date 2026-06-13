// Server HTTP pentru a păstra botul activ
const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

// Importurile corecte pentru Discord.js v14
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Definirea comenzilor
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica daca botul este activ')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
    
    // Înregistrarea comenzilor la Discord
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzile au fost sincronizate!');
    } catch (error) {
        console.error('Eroare la sincronizarea comenzilor:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! Botul funcționează.');
    }
});

client.login(process.env.DISCORD_TOKEN);
