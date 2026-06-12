const http = require('http');
http.createServer((req, res) => res.end("VISIUM Vouch & Staff Bot is Online!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildInvites, GatewayIntentBits.MessageContent
    ]
});

const STAFF_ROLE_ID = "1490701828831052027"; 
const VOUCH_LOGS_CHANNEL_ID = "1514651853348929738"; 
const BANNER_URL = "https://dummyimage.com/600x150/1a1c1e/ff3333.png&text=%E2%9A%A0%20VISIUM%20SCAMMER%20%E2%9A%A0"; 
const VOUCHES_FILE = path.join('/tmp', 'vouches.json');
if (!fs.existsSync(VOUCHES_FILE)) fs.writeFileSync(VOUCHES_FILE, JSON.stringify({}));

client.once('ready', async () => {
    console.log(`💼 ${client.user.tag} este online!`);
    const commands = [
        new SlashCommandBuilder().setName('setup-ticket').setDescription('Panou tichete'),
        new SlashCommandBuilder().setName('invites').setDescription('Vezi invitații').addUserOption(o => o.setName('user').setDescription('Membru')),
        new SlashCommandBuilder().setName('balanta').setDescription('Bani economie'),
        new SlashCommandBuilder().setName('work').setDescription('Lucrează pentru bani'),
        new SlashCommandBuilder().setName('mark').setDescription('Scammer').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('motiv').setRequired(true)),
        new SlashCommandBuilder().setName('clear').setDescription('Șterge mesaje').addIntegerOption(o => o.setName('numar').setRequired(true)),
        new SlashCommandBuilder().setName('ban').setDescription('Ban').addUserOption(o => o.setName('user').setRequired(true))
    ].map(cmd => cmd.toJSON());

    await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Comenzi sincronizate!');
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    const { commandName, options, user, guild, channel } = i;

    // Comenzi Noi
    if (commandName === 'invites') {
        const target = options.getUser('user') || user;
        const gInvites = await guild.invites.fetch();
        const count = gInvites.filter(inv => inv.inviter.id === target.id).reduce((p, v) => v.uses + p, 0);
        return i.reply({ content: `👤 **${target.username}** are **${count}** invitații.`, ephemeral: true });
    }

    if (commandName === 'balanta') {
        const bal = await db.get(`money_${user.id}`) || 0;
        return i.reply(`💰 Ai **${bal}** monede.`);
    }

    if (commandName === 'work') {
        const castig = Math.floor(Math.random() * 100) + 10;
        await db.add(`money_${user.id}`, castig);
        return i.reply(`👷 Ai lucrat și ai câștigat **${castig}** monede!`);
    }

    // Comenzi Vechi (Staff)
    if (commandName === 'mark') {
        const u = options.getUser('user');
        const motiv = options.getString('motiv');
        return i.reply({ embeds: [new EmbedBuilder().setTitle("Scammer Marcat").setDescription(`🚨 ${u}\nMotiv: ${motiv}`).setColor("#ff3333").setImage(BANNER_URL)] });
    }
    
    if (commandName === 'clear') {
        await channel.bulkDelete(options.getInteger('numar'), true);
        return i.reply({ content: `🧹 Am șters mesajele!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
        
