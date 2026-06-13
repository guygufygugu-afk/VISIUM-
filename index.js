// --- SERVER HTTP (pentru Render) ---
const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

// --- IMPORTURI ---
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- COMENZI SLASH ---
const commands = [
    new SlashCommandBuilder().setName('mark').setDescription('Marchează scammer').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('motiv').setRequired(true)),
    new SlashCommandBuilder().setName('balanta').setDescription('Verifică banii'),
    new SlashCommandBuilder().setName('work').setDescription('Lucrează')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`${client.user.tag} este online!`);
    await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    
    if (i.commandName === 'mark') {
        const u = i.options.getUser('user');
        const motiv = i.options.getString('motiv');
        const embed = new EmbedBuilder().setTitle("🚨 Scammer Marcat").setDescription(`User: ${u}\nMotiv: ${motiv}`).setColor("#ff3333");
        await i.reply({ embeds: [embed] });
    }
    
    if (i.commandName === 'balanta') {
        const bal = await db.get(`money_${i.user.id}`) || 0;
        await i.reply(`💰 Ai ${bal} monede.`);
    }

    if (i.commandName === 'work') {
        const castig = Math.floor(Math.random() * 50) + 1;
        await db.add(`money_${i.user.id}`, castig);
        await i.reply(`👷 Ai lucrat și ai câștigat ${castig} monede!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
