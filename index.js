const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const STAFF_ROLE_ID = '1490701828831052027';

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Arata comenzile'),
    new SlashCommandBuilder().setName('supportpanel').setDescription('Panou de support'),
    new SlashCommandBuilder().setName('mark').setDescription('Scammer').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('suspect').setDescription('Hack').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Sterge mesaje').addIntegerOption(o=>o.setName('n').setDescription('Nr').setRequired(true)),
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Botul este ONLINE!');
});

// Sistemul de mesaje text (cele cu "+")
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');
    const cmd = args[0];

    if (cmd === '+p') message.reply(`Profilul lui ${args[1] || message.author.username} este gata!`);
    if (cmd === '+help') message.reply("📋 **Comenzi:** +p, +vouch, +profile, +leaderboard, /help, /supportpanel, /mark, /suspect, /clear");
    if (cmd === '+vouch') message.reply("✅ Vouch înregistrat!");
    if (cmd === '+profile') message.reply("📋 Acesta este profilul tău.");
    if (cmd === '+leaderboard') message.reply("🏆 Iată topul!");
});

// Sistemul de Slash Commands
client.on('interactionCreate', async i => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'help') await i.reply("📋 **Comenzi:** +p, +vouch, +profile, +leaderboard, /supportpanel, /mark, /suspect, /clear");
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await i.reply({ content: "Apasă butonul:", components: [row] });
        }
    } else if (i.isButton()) {
        const type = i.customId.split('_')[1];
        const channel = await i.guild.channels.create({
            name: `${type}-${i.user.username}`,
            permissionOverwrites: [{ id: i.guild.id, deny: ['ViewChannel'] }, { id: i.user.id, allow: ['ViewChannel', 'SendMessages'] }, { id: STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }]
        });
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close').setLabel('Închide').setStyle(ButtonStyle.Danger));
        await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [new EmbedBuilder().setTitle("Ticket").setDescription(`Tichet de ${type} deschis.`).setColor("#00ff00")], components: [btn] });
        await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
    } else if (i.isButton() && i.customId === 'close') await i.channel.delete();
});

client.login(process.env.DISCORD_TOKEN);
