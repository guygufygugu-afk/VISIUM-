const http = require('http');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.write("Botul este online!");
  res.end();
}).listen(port, () => {
  console.log(`Serverul HTTP a pornit pe portul ${port}`);
});
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ===== JSON DATABASE =====

if (!fs.existsSync('./economy.json')) {
    fs.writeFileSync('./economy.json', '{}');
}

if (!fs.existsSync('./scammers.json')) {
    fs.writeFileSync('./scammers.json', '{}');
}

function loadEconomy() {
    return JSON.parse(fs.readFileSync('./economy.json'));
}

function saveEconomy(data) {
    fs.writeFileSync('./economy.json', JSON.stringify(data, null, 2));
}

function loadScammers() {
    return JSON.parse(fs.readFileSync('./scammers.json'));
}

function saveScammers(data) {
    fs.writeFileSync('./scammers.json', JSON.stringify(data, null, 2));
}

// ===== SLASH COMMANDS =====

const commands = [

new SlashCommandBuilder()
.setName('ban')
.setDescription('Ban a user')
.addUserOption(option =>
option.setName('user')
.setDescription('User')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('balance')
.setDescription('View balance'),

new SlashCommandBuilder()
.setName('daily')
.setDescription('Claim daily reward'),

new SlashCommandBuilder()
.setName('work')
.setDescription('Work for coins'),

new SlashCommandBuilder()
.setName('markscammer')
.setDescription('Mark a user as scammer')
.addUserOption(option =>
option.setName('user')
.setDescription('User')
.setRequired(true)
)

].map(cmd => cmd.toJSON());

// ===== REGISTER =====

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Commands loaded.');
    } catch (err) {
        console.error(err);
    }
})();

// ===== READY =====

client.once('ready', () => {
    console.log(`${client.user.tag} online`);
});

// ===== INTERACTIONS =====

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // BAN

    if (interaction.commandName === 'ban') {

        if (!interaction.member.permissions.has(
            PermissionsBitField.Flags.BanMembers
        )) {
            return interaction.reply({
                content: 'No permission.',
                ephemeral: true
            });
        }

        const user =
        interaction.options.getUser('user');

        const member =
        interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.reply({
                content: 'User not found.'
            });
        }

        await member.ban();

        return interaction.reply({
            content: `${user.tag} banned.`
        });
    }

    // BALANCE

    if (interaction.commandName === 'balance') {

        const data = loadEconomy();

        if (!data[interaction.user.id]) {
            data[interaction.user.id] = {
                coins: 0
            };
            saveEconomy(data);
        }

        return interaction.reply({
            content:
            `💰 Balance: ${data[interaction.user.id].coins}`
        });
    }

    // DAILY

    if (interaction.commandName === 'daily') {

        const data = loadEconomy();

        if (!data[interaction.user.id]) {
            data[interaction.user.id] = {
                coins: 0
            };
        }

        data[interaction.user.id].coins += 500;

        saveEconomy(data);

        return interaction.reply({
            content:
            'You received 500 coins.'
        });
    }

    // WORK

    if (interaction.commandName === 'work') {

        const data = loadEconomy();

        if (!data[interaction.user.id]) {
            data[interaction.user.id] = {
                coins: 0
            };
        }

        const earned =
        Math.floor(Math.random() * 300) + 50;

        data[interaction.user.id].coins += earned;

        saveEconomy(data);

        return interaction.reply({
            content:
            `You earned ${earned} coins.`
        });
    }

    // MARK SCAMMER

    if (interaction.commandName === 'markscammer') {

        if (!interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
        )) {
            return interaction.reply({
                content: 'No permission.',
                ephemeral: true
            });
        }

        const target =
        interaction.options.getUser('user');

        const scammers =
        loadScammers();

        scammers[target.id] = true;

        saveScammers(scammers);

        const embed =
        new EmbedBuilder()
        .setTitle('⚠️ Scammer Marked')
        .setDescription(
            `${target.tag} has been marked as scammer`
        )
        .setColor('Red');

        return interaction.reply({
            embeds: [embed]
        });
    }

});

client.on('messageCreate', message => {

    if (message.author.bot) return;

    const scammers = loadScammers();

    if (scammers[message.author.id]) {

        message.reply(
            '⚠️ This user is marked as scammer.'
        );
    }

    if (
        message.content.includes('http://') ||
        message.content.includes('https://')
    ) {

        if (
            !message.member.permissions.has(
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            message.delete().catch(() => {});

            message.channel.send(
                `${message.author}, links are not allowed.`
            );
        }
    }
});

client.login(TOKEN);
