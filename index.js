const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const STAFF_ROLE_ID = '1490701828831052027';

const commands = [
    new SlashCommandBuilder().setName('supportpanel').setDescription('Afiseaza panoul de support'),
    new SlashCommandBuilder().setName('ping').setDescription('Verifica botul'),
    new SlashCommandBuilder().setName('ban').setDescription('Ban user').addUserOption(o => o.setName('user').setDescription('Userul de banat').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick user').addUserOption(o => o.setName('user').setDescription('Userul de dat afara').setRequired(true))
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
                .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                                "👷 **Ai nevoie de ajutor? Deschide un ticket de support.**\n" +
                                "🏦 **Pentru cumpărare, apasă Purchase. Fără alte opțiuni.**\n" +
                                "🎁 **Ai de revendicat un reward? Deschide Claim Reward.**\n\n" +
                                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                .setColor("#2b2d31");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary)
            );

            await i.reply({ embeds: [embed], components: [row] });
        }
        if (i.commandName === 'ping') await i.reply('Pong!');
    } 
    
    else if (i.isButton()) {
        if (i.customId.startsWith('ticket_')) {
            const type = i.customId.split('_')[1]; 
            const channel = await i.guild.channels.create({
                name: `${type}-${i.user.username}`,
                permissionOverwrites: [
                    { id: i.guild.id, deny: ['ViewChannel'] },
                    { id: i.user.id, allow: ['ViewChannel', 'SendMessages'] },
                    { id: STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }
                ]
            });
            const embed = new EmbedBuilder()
                .setTitle(`Tichet de ${type.toUpperCase()}`)
                .setDescription(`User ${i.user} a deschis un tichet pentru: **${type}**.\nStaff-ul te va ajuta imediat.`)
                .setColor("#00ff00");
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close').setLabel('Închide').setStyle(ButtonStyle.Danger));
            await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [btn] });
            await i.reply({ content: `✅ Tichet de ${type} creat: ${channel}`, ephemeral: true });
        } else if (i.customId === 'close') {
            await i.channel.delete();
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
