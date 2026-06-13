// Adaugă 'suspect' la comenzile Slash
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica botul'),
    new SlashCommandBuilder()
        .setName('suspect')
        .setDescription('Marcheaza un utilizator ca suspect de hack')
        .addUserOption(o => o.setName('user').setDescription('Userul suspect').setRequired(true))
        .addStringOption(o => o.setName('motiv').setDescription('Motivul').setRequired(true))
].map(cmd => cmd.toJSON());

// Adaugă logica pentru interacțiunea 'suspect'
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'ping') await i.reply('Pong!');

    if (i.commandName === 'suspect') {
        const u = i.options.getUser('user');
        const motiv = i.options.getString('motiv');
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Utilizator Suspect')
            .setDescription(`Utilizator: ${u}\nMotiv: ${motiv}`)
            .setColor('#ffff00');
        await i.reply({ embeds: [embed] });
    }
});
