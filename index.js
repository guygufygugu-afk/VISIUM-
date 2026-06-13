const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalSubmitInteraction } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica daca botul este activ'),
    new SlashCommandBuilder()
        .setName('mark')
        .setDescription('Marcheaza un utilizator ca scammer')
        .addUserOption(o => o.setName('user').setDescription('Userul de marcat').setRequired(true))
        .addStringOption(o => o.setName('motiv').setDescription('Motivul pentru scam').setRequired(true)),
    new SlashCommandBuilder()
        .setName('suggestionpanel')
        .setDescription('Trimite panoul pentru sugestii')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log('✅ Botul este ONLINE!');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ping') await interaction.reply('Pong!');
        
        if (interaction.commandName === 'mark') {
            const u = interaction.options.getUser('user');
            const motiv = interaction.options.getString('motiv');
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("🚨 Scammer Marcat").setDescription(`**User:** ${u}\n**Motiv:** ${motiv}`).setColor("#ff3333")] });
        }

        if (interaction.commandName === 'suggestionpanel') {
            const modal = new ModalBuilder().setCustomId('suggestModal').setTitle('Trimite o sugestie');
            const input = new TextInputBuilder().setCustomId('sugestieText').setLabel('Sugestia ta').setStyle(TextInputStyle.Paragraph);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit() && interaction.customId === 'suggestModal') {
        const text = interaction.fields.getTextInputValue('sugestieText');
        await interaction.reply({ content: `✅ Sugestia ta a fost trimisă: "${text}"`, ephemeral: true });
        // Aici poți adăuga codul să trimită mesajul într-un canal specific
    }
});

client.login(process.env.DISCORD_TOKEN);
