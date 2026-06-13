const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica botul'),
    new SlashCommandBuilder()
        .setName('mark')
        .setDescription('Marcheaza un scammer')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addStringOption(o => o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder()
        .setName('suspect')
        .setDescription('Marcheaza un utilizator ca suspect de hack')
        .addUserOption(o => o.setName('user').setDescription('User suspect').setRequired(true))
        .addStringOption(o => o.setName('motiv').setDescription('Motiv').setRequired(true)),
    new SlashCommandBuilder().setName('suggestionpanel').setDescription('Trimite panoul de sugestii')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async i => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') await i.reply('Pong!');
        
        if (i.commandName === 'mark') {
            const u = i.options.getUser('user');
            const motiv = i.options.getString('motiv');
            await i.reply({ embeds: [new EmbedBuilder().setTitle("🚨 Scammer Marcat").setDescription(`**User:** ${u}\n**Motiv:** ${motiv}`).setColor("#ff3333")] });
        }

        if (i.commandName === 'suspect') {
            const u = i.options.getUser('user');
            const motiv = i.options.getString('motiv');
            await i.reply({ embeds: [new EmbedBuilder().setTitle("⚠️ Utilizator Suspect").setDescription(`**User:** ${u}\n**Motiv:** ${motiv}`).setColor("#ffff00")] });
        }

        if (i.commandName === 'suggestionpanel') {
            const modal = new ModalBuilder().setCustomId('suggestModal').setTitle('Trimite o sugestie');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sugestieText').setLabel('Sugestia ta').setStyle(TextInputStyle.Paragraph)));
            await i.showModal(modal);
        }
    } else if (i.isModalSubmit() && i.customId === 'suggestModal') {
        await i.reply({ content: `✅ Sugestia ta a fost trimisă.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
