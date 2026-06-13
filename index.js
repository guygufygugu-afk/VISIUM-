const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
// Am adăugat MessageContent pentru ca "+p" să meargă
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const STAFF_ROLE_ID = '1490701828831052027';

const commands = [
    new SlashCommandBuilder().setName('supportpanel').setDescription('Panou de support'),
    new SlashCommandBuilder().setName('suspect').setDescription('Marcheaza un suspect').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('mark').setDescription('Marcheaza un scammer').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('giveaway').setDescription('Porneste giveaway'),
    new SlashCommandBuilder().setName('clear').setDescription('Sterge mesaje').addIntegerOption(o=>o.setName('nr').setDescription('Numar').setRequired(true)),
    new SlashCommandBuilder().setName('suggestionpanel').setDescription('Panou sugestii')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// Sistemul de mesaje pentru "+p", "+vouch", "+profile", "+leaderboard"
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content.startsWith('+p')) {
        const user = message.mentions.users.first() || message.author;
        message.reply(`Profilul lui ${user.username} este gata! (Sistem Vouch activ)`);
    }
    if (message.content.startsWith('+vouch')) message.reply("✅ Vouch înregistrat!");
    if (message.content.startsWith('+profile')) message.reply("📋 Acesta este profilul tău.");
    if (message.content.startsWith('+leaderboard')) message.reply("🏆 Iată topul utilizatorilor!");
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() && !i.isButton()) return;

    if (i.isChatInputCommand()) {
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder().setTitle("VISIUM Support Panel").setDescription("👷 **Support** | 🏦 **Purchase** | 🎁 **Claim Reward**").setColor("#2b2d31");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await i.reply({ embeds: [embed], components: [row] });
        }
        // Restul comenzilor Slash...
        if (i.commandName === 'mark') await i.reply(`🚨 ${i.options.getUser('user')} marcat ca scammer.`);
        if (i.commandName === 'suspect') await i.reply(`⚠️ ${i.options.getUser('user')} marcat ca suspect.`);
    }

    if (i.isButton() && i.customId.startsWith('ticket_')) {
        const type = i.customId.split('_')[1];
        const channel = await i.guild.channels.create({
            name: `${type}-${i.user.username}`,
            permissionOverwrites: [{ id: i.guild.id, deny: ['ViewChannel'] }, { id: i.user.id, allow: ['ViewChannel', 'SendMessages'] }, { id: STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }]
        });
        await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
    }
    if (i.isButton() && i.customId === 'close') await i.channel.delete();
});

client.login(process.env.DISCORD_TOKEN);
