const http = require('http');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const STAFF_ROLE_ID = '1490701828831052027';
const VOUCH_CHANNEL_ID = '1514651853348929738';

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Arata toate comenzile'),
    new SlashCommandBuilder().setName('supportpanel').setDescription('Panou de support'),
    new SlashCommandBuilder().setName('suspect').setDescription('Marcheaza un suspect').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('mark').setDescription('Marcheaza un scammer').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('giveaway').setDescription('Porneste giveaway'),
    new SlashCommandBuilder().setName('clear').setDescription('Sterge mesaje').addIntegerOption(o=>o.setName('nr').setDescription('Numar').setRequired(true)),
    new SlashCommandBuilder().setName('suggestionpanel').setDescription('Panou sugestii'),
    new SlashCommandBuilder().setName('ban').setDescription('Ban user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban user').addStringOption(o=>o.setName('userid').setDescription('ID user').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Da timeout').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o=>o.setName('minute').setDescription('Minute').setRequired(true)),
    new SlashCommandBuilder().setName('untimeout').setDescription('Scoate timeout').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Botul este ONLINE!');
});

// Comenzi prefix (+p, +vouch, etc)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+p') message.reply(`Profilul lui ${args[1] || message.author.username} este gata!`);
    if (cmd === '+vouch') {
        if (!args[1] || !args[2]) return message.reply("↗️ Scrie și comentariul vouch-ului. Exemplu: `+vouch @user 24€ LTC to MM`");
        const embed = new EmbedBuilder().setTitle("🔔 Vouch Nou").setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${message.mentions.users.first()}\n**Comentariu:** ${args.slice(2).join(' ')}`).setColor("#FFD700");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_deny').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );
        message.guild.channels.cache.get(VOUCH_CHANNEL_ID)?.send({ embeds: [embed], components: [row] });
        message.reply("🟢 Vouch-ul a fost primit!");
    }
    if (cmd === '+profile') message.reply("📋 Acesta este profilul tău.");
    if (cmd === '+leaderboard') message.reply("🏆 Iată topul!");
    if (cmd === '+help') message.reply("📋 **Comenzi:** +p, +vouch, +profile, +leaderboard, /help, /supportpanel, /ban, /kick, /timeout, /untimeout, /unban, /clear, /mark, /suspect");
});

// Slash Commands si Moderare
client.on('interactionCreate', async i => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ban') { await i.guild.members.ban(i.options.getUser('user')); await i.reply('✅ Ban aplicat.'); }
        if (i.commandName === 'unban') { await i.guild.members.unban(i.options.getString('userid')); await i.reply('✅ Unban aplicat.'); }
        if (i.commandName === 'kick') { await i.guild.members.kick(i.options.getUser('user')); await i.reply('✅ Kick aplicat.'); }
        if (i.commandName === 'timeout') { await i.options.getMember('user').timeout(i.options.getInteger('minute') * 60 * 1000); await i.reply('✅ Timeout aplicat.'); }
        if (i.commandName === 'untimeout') { await i.options.getMember('user').timeout(null); await i.reply('✅ Timeout eliminat.'); }
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await i.reply({ content: "Apasă butonul:", components: [row] });
        }
    } else if (i.isButton()) {
        if (i.customId === 'v_accept' || i.customId === 'v_deny') {
            const embedVechi = i.message.embeds[0];
            const embedNou = new EmbedBuilder().setTitle(i.customId === 'v_accept' ? "✅ Vouch Aprobat" : "❌ Vouch Respins").setDescription(`${embedVechi.description}\n\n**Statut:**\nAcceptat de: ${i.user}`).setColor(i.customId === 'v_accept' ? "#00FF00" : "#FF0000");
            await i.update({ embeds: [embedNou], components: [] });
        }
    }
});

http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 10000);
client.login(process.env.DISCORD_TOKEN);
                                              
