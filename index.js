const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica botul'),
    new SlashCommandBuilder().setName('mark').setDescription('Scammer').addUserOption(o=>o.setName('user').setRequired(true)).addStringOption(o=>o.setName('motiv').setRequired(true)),
    new SlashCommandBuilder().setName('suspect').setDescription('Hack').addUserOption(o=>o.setName('user').setRequired(true)).addStringOption(o=>o.setName('motiv').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Sterge mesaje').addIntegerOption(o=>o.setName('n').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder().setName('ban').setDescription('Ban').addUserOption(o=>o.setName('user').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('kick').setDescription('Kick').addUserOption(o=>o.setName('user').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('suggestionpanel').setDescription('Panou sugestii'),
    new SlashCommandBuilder().setName('supportpanel').setDescription('Panou tichete')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul e ONLINE!');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async i => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') await i.reply('Pong!');
        if (i.commandName === 'mark') await i.reply({ embeds: [new EmbedBuilder().setTitle("🚨 Scammer").setDescription(`**User:** ${i.options.getUser('user')}\n**Motiv:** ${i.options.getString('motiv')}`).setColor("#ff3333")] });
        if (i.commandName === 'suspect') await i.reply({ embeds: [new EmbedBuilder().setTitle("⚠️ Suspect Hack").setDescription(`**User:** ${i.options.getUser('user')}\n**Motiv:** ${i.options.getString('motiv')}`).setColor("#ffff00")] });
        if (i.commandName === 'clear') { await i.channel.bulkDelete(i.options.getInteger('n'), true); await i.reply({ content: 'Șters!', ephemeral: true }); }
        if (i.commandName === 'ban') { await i.options.getUser('user').send("Ai primit ban!"); await i.guild.members.ban(i.options.getUser('user')); await i.reply('User banat.'); }
        if (i.commandName === 'kick') { await i.guild.members.kick(i.options.getUser('user')); await i.reply('User kick-uit.'); }
        
        if (i.commandName === 'suggestionpanel') {
            const modal = new ModalBuilder().setCustomId('sugModal').setTitle('Sugestie');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s').setLabel('Sugestia ta').setStyle(TextInputStyle.Paragraph)));
            await i.showModal(modal);
        }
        
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket').setLabel('Deschide Tichet').setStyle(ButtonStyle.Primary));
            await i.reply({ content: 'Apasa butonul pentru support:', components: [row] });
        }
    } else if (i.isButton() && i.customId === 'ticket') {
        await i.reply({ content: 'Tichet creat!', ephemeral: true });
    } else if (i.isModalSubmit() && i.customId === 'sugModal') {
        await i.reply({ content: 'Sugestie trimisa!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
