const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const http = require('http');

// 1. Baza de date temporară pentru Economie (se resetează la restartul botului)
const economy = new Map();
const dailyCooldowns = new Map();

// 2. Server HTTP (pentru a ține botul online 24/7)
http.createServer((req, res) => {
    res.write("Bot is online!");
    res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Funcții ajutătoare pentru economie
const getBalance = (userId) => economy.get(userId) || 0;
const addBalance = (userId, amount) => economy.set(userId, getBalance(userId) + amount);

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} este online!`);
    
    // Toate comenzile (Admin + Economie) cu descrieri corecte ca să nu dea eroare
    const commands = [
        new SlashCommandBuilder().setName('ticket').setDescription('Deschide un tichet de suport'),
        new SlashCommandBuilder().setName('ban').setDescription('Banează un utilizator').addUserOption(o => o.setName('user').setDescription('Alege utilizatorul').setRequired(true)),
        new SlashCommandBuilder().setName('kick').setDescription('Dă afară un utilizator').addUserOption(o => o.setName('user').setDescription('Alege utilizatorul').setRequired(true)),
        
        // Comenzi Economie
        new SlashCommandBuilder()
            .setName('cash')
            .setDescription('Verifică portofelul tău sau al altui utilizator')
            .addUserOption(o => o.setName('user').setDescription('Pe cine verifici?').setRequired(false)),
        new SlashCommandBuilder()
            .setName('daily')
            .setDescription('Ia-ți recompensa zilnică de monede'),
        new SlashCommandBuilder()
            .setName('give')
            .setDescription('Transferă bani altui utilizator')
            .addUserOption(o => o.setName('user').setDescription('Cui îi trimiți bani?').setRequired(true))
            .addIntegerOption(o => o.setName('suma').setDescription('Câți bani?').setRequired(true)),
        new SlashCommandBuilder()
            .setName('coinflip')
            .setDescription('Dă cu banul la dublu sau nimic!')
            .addIntegerOption(o => o.setName('suma').setDescription('Suma pariată').setRequired(true))
            .addStringOption(o => o.setName('alegere').setDescription('Cap sau Pajură?').setRequired(true).addChoices({name: 'Cap', value: 'cap'}, {name: 'Pajura', value: 'pajura'}))
    ].map(cmd => cmd.toJSON());

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comenzile (inclusiv economia) au fost sincronizate!');
    } catch (error) { 
        console.error('❌ Eroare la comenzi:', error); 
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // ----- PROCESAREA COMENZILOR SLASH -----
    if (interaction.isChatInputCommand()) {
        const { commandName, user, options } = interaction;

        // Tichete
        if (commandName === 'ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Deschide Tichet').setStyle(ButtonStyle.Primary)
            );
            await interaction.reply({ content: 'Apasă pe butonul de mai jos:', components: [row] });
        }
        
        // Ban / Kick
        if (commandName === 'ban') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: 'Nu ai permisiuni!', ephemeral: true });
            const target = options.getMember('user');
            if (target) { await target.ban(); await interaction.reply(`${target.user.tag} a fost banat!`); }
        }
        if (commandName === 'kick') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: 'Nu ai permisiuni!', ephemeral: true });
            const target = options.getMember('user');
            if (target) { await target.kick(); await interaction.reply(`${target.user.tag} a luat kick!`); }
        }

        // Economie: CASH
        if (commandName === 'cash') {
            const target = options.getUser('user') || user;
            const bal = getBalance(target.id);
            await interaction.reply({ content: `💰 **${target.username}** are **${bal}** monede în portofel.`, ephemeral: false });
        }

        // Economie: DAILY
        if (commandName === 'daily') {
            const lastClaim = dailyCooldowns.get(user.id);
            const now = Date.now();
            if (lastClaim && now - lastClaim < 86400000) { // 24 de ore
                const timeLeft = Math.floor((86400000 - (now - lastClaim)) / 3600000);
                return interaction.reply({ content: `⏳ Ai luat deja banii azi! Mai așteaptă **${timeLeft} ore**.`, ephemeral: true });
            }
            
            const reward = Math.floor(Math.random() * 500) + 100; // Între 100 și 600 monede
            addBalance(user.id, reward);
            dailyCooldowns.set(user.id, now);
            await interaction.reply({ content: `🎁 Ai revendicat recompensa zilnică și ai primit **${reward}** monede!`, ephemeral: false });
        }

        // Economie: GIVE
        if (commandName === 'give') {
            const target = options.getUser('user');
            const amount = options.getInteger('suma');

            if (target.id === user.id) return interaction.reply({ content: '❌ Nu îți poți trimite bani ție!', ephemeral: true });
            if (amount <= 0) return interaction.reply({ content: '❌ Suma trebuie să fie mai mare ca 0!', ephemeral: true });
            if (getBalance(user.id) < amount) return interaction.reply({ content: '❌ Nu ai destui bani!', ephemeral: true });

            addBalance(user.id, -amount);
            addBalance(target.id, amount);
            await interaction.reply({ content: `💸 Ai transferat **${amount}** monede către **${target.username}**!`, ephemeral: false });
        }

        // Economie: COINFLIP
        if (commandName === 'coinflip') {
            const amount = options.getInteger('suma');
            const choice = options.getString('alegere');
            
            if (amount <= 0) return interaction.reply({ content: '❌ Pariul trebuie să fie mai mare ca 0!', ephemeral: true });
            if (getBalance(user.id) < amount) return interaction.reply({ content: '❌ Nu ai destui bani pentru acest pariu!', ephemeral: true });

            const result = Math.random() < 0.5 ? 'cap' : 'pajura';
            if (choice === result) {
                addBalance(user.id, amount);
                await interaction.reply({ content: `🪙 Moneda a picat pe **${result.toUpperCase()}**! Ai câștigat **${amount}** monede!`, ephemeral: false });
            } else {
                addBalance(user.id, -amount);
                await interaction.reply({ content: `🪙 Moneda a picat pe **${result.toUpperCase()}**... Ai pierdut **${amount}** monede.`, ephemeral: false });
            }
        }
    }

    // ----- PROCESAREA BUTOANELOR (Tichete) -----
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        try {
            const channel = await interaction.guild.channels.create({
                name: `tichet-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            await interaction.reply({ content: `Tichetul tău a fost creat: ${channel}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: 'Eroare la crearea tichetului.', ephemeral: true });
        }
    }
});

// Protecție anti-crash
process.on('unhandledRejection', error => console.error('Eroare neprevazuta:', error));
process.on('uncaughtException', error => console.error('Exceptie:', error));

client.login(process.env.DISCORD_TOKEN);
        
