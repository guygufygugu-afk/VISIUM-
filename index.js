const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const STAFF_ROLE_ID = '1490701828831052027';

const commands = [
    new SlashCommandBuilder().setName('supportpanel').setDescription('Panou de support'),
    new SlashCommandBuilder().setName('warn').setDescription('Da warn').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Da timeout').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o=>o.setName('minute').setDescription('Minute').setRequired(true)),
    new SlashCommandBuilder().setName('untimeout').setDescription('Scoate timeout').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Ban user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban user').addStringOption(o=>o.setName('userid').setDescription('ID user').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async i => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'supportpanel') {
            const embed = new EmbedBuilder()
                .setTitle("VISIUM Support Panel")
                .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👷 **Ai nevoie de ajutor? Deschide un ticket de support.**\n🏦 **Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n🎁 **Ai de revendicat un reward? Deschide Claim Reward.**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                .setColor("#2b2d31");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );
            await i.reply({ embeds: [embed], components: [row] });
        }
        // Moderare
        if (i.commandName === 'warn') { await i.reply(`✅ Warn dat lui ${i.options.getUser('user').tag}. Motiv: ${i.options.getString('motiv')}`); }
        if (i.commandName === 'timeout') { await i.options.getMember('user').timeout(i.options.getInteger('minute') * 60 * 1000); await i.reply('✅ Timeout aplicat.'); }
        if (i.commandName === 'untimeout') { await i.options.getMember('user').timeout(null); await i.reply('✅ Timeout eliminat.'); }
        if (i.commandName === 'ban') { await i.guild.members.ban(i.options.getUser('user')); await i.reply('✅ Ban aplicat.'); }
        if (i.commandName === 'unban') { await i.guild.members.unban(i.options.getString('userid')); await i.reply('✅ Unban aplicat.'); }
        if (i.commandName === 'kick') { await i.guild.members.kick(i.options.getUser('user')); await i.reply('✅ Kick aplicat.'); }
    } else if (i.isButton() && i.customId.startsWith('ticket_')) {
        const type = i.customId.split('_')[1];
        const channel = await i.guild.channels.create({
            name: `${type}-${i.user.username}`,
            permissionOverwrites: [{ id: i.guild.id, deny: ['ViewChannel'] }, { id: i.user.id, allow: ['ViewChannel', 'SendMessages'] }, { id: STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }]
        });
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close').setLabel('Închide').setStyle(ButtonStyle.Danger));
        await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [new EmbedBuilder().setTitle("Tichet").setDescription(`Tichet de ${type} deschis de ${i.user}`).setColor("#00ff00")], components: [btn] });
        await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
    } else if (i.isButton() && i.customId === 'close') {
        await i.channel.delete();
    }
});

client.login(process.env.DISCORD_TOKEN);
