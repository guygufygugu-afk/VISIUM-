const http = require('http');
http.createServer((req, res) => res.end("VISIUM Vouch & Staff Bot is Online!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildInvites, GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`💼 ${client.user.tag} este online!`);
    const commands = [
        new SlashCommandBuilder().setName('invites').setDescription('Vezi invitații').addUserOption(o => o.setName('user').setDescription('Membru')),
        new SlashCommandBuilder().setName('balanta').setDescription('Verifică banii tăi'),
        new SlashCommandBuilder().setName('work').setDescription('Lucrează pentru bani'),
        new SlashCommandBuilder().setName('mark').setDescription('Scammer').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('motiv').setRequired(true))
    ].map(cmd => cmd.toJSON());

    try {
        await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzi sincronizate!');
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    const { commandName, options, user, guild } = i;

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

    if (commandName === 'mark') {
        const u = options.getUser('user');
        const motiv = options.getString('motiv');
        return i.reply({ embeds: [new EmbedBuilder().setTitle("Scammer Marcat").setDescription(`🚨 ${u}\nMotiv: ${motiv}`).setColor("#ff3333")] });
    }
});

client.login(process.env.DISCORD_TOKEN);
