const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Botul Visium este online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const CONFIG = {
    SCAMMER_ROLE_ID: '1492892376979738715',
    STAFF_ROLE_ID: '1490701828831052027',      
    TICKET_CATEGORY_ID: '1492885716856868978',
    ALLOWED_CLOSE_ID: '1485154781247967356',
    VOUCH_CHANNEL_ID: '1517878554619150476' // Canalul de verificare extras din link-ul tau
};

const vouches = new Map();
const pendingVouches = new Map(); // Stocam cererile de vouch aflate in asteptare

client.once('ready', async () => {
    console.log(`Conectat ca ${client.user.tag}!`);
    const commands = [
        { name: 'clear', description: 'Sterge mesaje', options: [{ name: 'cantitate', type: ApplicationCommandOptionType.Integer, description: 'Nr mesaje', required: true }] },
        { name: 'lock', description: 'Blocheaza' },
        { name: 'unlock', description: 'Deblocheaza' },
        { name: 'timeout', description: 'Da timeout', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'minute', type: ApplicationCommandOptionType.Integer, description: 'Minute', required: true }] },
        { name: 'untimeout', description: 'Scoate timeout', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }]},
        { name: 'warn', description: 'Warn', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'kick', description: 'Kick', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'ban', description: 'Ban', options: [{ name: 'membru', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: false }] },
        { name: 'mark', description: 'Marcheaza scammer', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'suspect', description: 'Alias mark', options: [{ name: 'utilizator', type: ApplicationCommandOptionType.User, description: 'User', required: true }, { name: 'motiv', type: ApplicationCommandOptionType.String, description: 'Motiv', required: true }] },
        { name: 'supportpanel', description: 'Panou tickete' }
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    
    // --- CONFORMARE BUTOANE (TICKET CLOSE ȘI VERIFICARE VOUCH) ---
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            const isUser = interaction.user.id === CONFIG.ALLOWED_CLOSE_ID;
            const hasRole = interaction.member.roles.cache.has(CONFIG.ALLOWED_CLOSE_ID);

            if (!isUser && !hasRole) {
                return interaction.reply({ content: `❌ Nu ai permisiunea sa inchizi acest ticket! Doar <@${CONFIG.ALLOWED_CLOSE_ID}> poate face asta.`, ephemeral: true });
            }

            await interaction.reply({ content: '🔒 Acest ticket se va inchide in 5 secunde...' });
            setTimeout(() => {
                interaction.channel.delete().catch(console.error);
            }, 5000);
            return;
        }

        // Gestionarea sistemului de aprobare Vouch
        if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
            if (!pendingVouches.has(interaction.message.id)) {
                return interaction.reply({ content: '❌ Această cerere de vouch a expirat sau a fost deja procesată.', ephemeral: true });
            }

            const data = pendingVouches.get(interaction.message.id);
            const targetUser = await client.users.fetch(data.targetId).catch(() => null);

            if (interaction.customId === 'vouch_accept') {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ author: data.authorName, comment: data.comment, date: Date.now(), status: 'accepted' });

                await interaction.update({
                    content: `✅ Vouch-ul trimis de **${data.authorName}** pentru ${targetUser || `\`${data.targetId}\``} a fost **ACCEPTAT** de către ${interaction.user}.`,
                    embeds: [],
                    components: []
                });
            } else {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ author: data.authorName, comment: data.comment, date: Date.now(), status: 'rejected' });

                await interaction.update({
                    content: `❌ Vouch-ul trimis de **${data.authorName}** pentru ${targetUser || `\`${data.targetId}\``} a fost **RESPINS** de către ${interaction.user}.`,
                    embeds: [],
                    components: []
                });
            }
            
            pendingVouches.delete(interaction.message.id);
            return;
        }
    }
    
    // --- CREARE TICKET PANEL ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const ticketType = interaction.values[0];
        await interaction.reply({ content: '⏳ Creez ticketul...', ephemeral: true });

        try {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: 0,
                parent: CONFIG.TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] },
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    { id: CONFIG.STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket - ${ticketType}`)
                .setColor(0x1ABC9C)
                .setDescription(`Salut ${interaction.user}! Un membru staff va veni in curand sa te ajute.\nMotivul ticketului: **${ticketType}**`);

            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Închide Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await channel.send({ content: `<@${interaction.user.id}> | <@&${CONFIG.STAFF_ROLE_ID}>`, embeds: [ticketEmbed], components: [buttonRow] });
            return interaction.editReply({ content: `✅ Ticket deschis cu succes: ${channel}` });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Eroare la crearea ticketului.' });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'clear') {
        const amount = options.getInteger('cantitate');
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 Am sters ${amount} mesaje.`, ephemeral: true });
    }

    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        return interaction.reply('🔒 Canal blocat.');
    }

    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        return interaction.reply('🔓 Canal deblocat.');
    }

    if (commandName === 'timeout') {
        const member = interaction.options.getMember('membru');
        const minutes = options.getInteger('minute');
        await member.timeout(minutes * 60 * 1000);
        return interaction.reply({ content: `⏱️ ${member.user.tag} a primit timeout ${minutes} minute.` });
    }

    if (commandName === 'untimeout') {
        const member = interaction.options.getMember('membru');
        await member.timeout(null);
        return interaction.reply({ content: `✅ Timeout scos pentru ${member.user.tag}.` });
    }

    if (commandName === 'mark' || commandName === 'suspect') {
        const user = options.getUser('utilizator');
        const reason = options.getString('motiv');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(console.error);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(`# 🚨 Scammer Marcat\n## ⚠️ Utilizator marcat scammer\n\n🛑 ***Utilizator: ${user} | Motiv: ${reason}***`);
            
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder()
            .setTitle('⚔️ VisiumCommunity Support Panel')
            .setColor(0x1ABC9C)
            .setDescription('Selectează o categorie din meniul de mai jos pentru a deschide un ticket.\nEchipa noastră te va prelua în cel mai scurt timp.')
            .setImage('https://cdn.discordapp.com/attachments/1515449144599249038/1516171455941841107/1780855051320.png');
            
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Alege tipul ticketului >')
                .addOptions([{ label: 'Support', value: 'support', emoji: '🎒' }, { label: 'Purchase', value: 'purchase', emoji: '💸' }, { label: 'Claim Reward', value: 'claim_reward', emoji: '✅' }])
        );
        
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '✅ Panoul a fost generat!', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;
    const args = message.content.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === '+help') {
        return message.reply('📜 **Comenzi:** `+vouch`, `+p`, `+leaderboard`');
    }

    if (cmd === '+vouch') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Specifica un user!');
        if (target.id === message.author.id) return message.reply('❌ Nu iti poti da singur vouch!');

        const comment = args.slice(2).join(' ') || 'Fara comentariu';
        const vouchChannel = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        
        if (!vouchChannel) return message.reply('❌ Canalul configurat pentru verificarea vouch-urilor nu a fost găsit!');

        // Trimitem cererea cu butoane în canalul indicat de tine
        const checkEmbed = new EmbedBuilder()
            .setTitle('📩 Verificare Vouch Nou')
            .setColor(0xF1C40F)
            .setDescription(`👤 **De la:** ${message.author} (\`${message.author.username}\`)\n🎯 **Pentru:** ${target}\n💬 **Comentariu:** ${comment}`)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vouch_accept').setLabel('Vouch Acceptat').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('vouch_reject').setLabel('Vouch Respins').setStyle(ButtonStyle.Danger).setEmoji('❌')
        );

        const sentMsg = await vouchChannel.send({ embeds: [checkEmbed], components: [row] }).catch(console.error);
        
        if (sentMsg) {
            pendingVouches.set(sentMsg.id, {
                targetId: target.id,
                authorName: message.author.username,
                comment: comment
            });
        }

        return message.reply(`📩 Vouch-ul tău pentru **${target.username}** a fost trimis spre confirmare în <#${CONFIG.VOUCH_CHANNEL_ID}>!`);
    }

    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author;
        const userVouches = vouches.get(target.id) || [];

        // Filtram vouch-urile stocate in functie de decizia luata prin butoane
        const acceptate = userVouches.filter(v => v.status === 'accepted').length;
        const refuzate = userVouches.filter(v => v.status === 'rejected').length;
        const ultimele7Zile = userVouches.filter(v => v.status === 'accepted' && Date.now() - v.date < 7 * 24 * 60 * 60 * 1000).length;

        const comentarii = userVouches.filter(v => v.status === 'accepted').slice(-3).map(v => `💬 **${v.author}**: *${v.comment}*`).join('\n') || '*Niciun comentariu lăsat.*';

        const profilTemplate = 
`# 👤 (${target.username}) Profil Utilizator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 **User:** ${target}
🆔 **ID:** \`${target.id}\`
🏷️ **Display Name:** **${target.displayName || target.username}**
📅 **Cont creat:** <t:${Math.floor(target.createdTimestamp / 1000)}:F>

## 📊 Informații Vouch
✅ **Vouch-uri acceptate:** \`${acceptate}\`
❌ **Vouch-uri refuzate:** \`${refuzate}\`
📈 **Ultimele 7 zile:** \`${ultimele7Zile}\`

## 🎖️ Badge-uri
⭐ Trusted
<a:14584848207818302481:1512563633610035201> 10+ Vouches

## 💬 Ultimele comentarii:
${comentarii}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        return message.reply({ content: profilTemplate });
    }

    if (cmd === '+leaderboard') {
        return message.reply('📊 **Top Vouch-uri:** Sistemul este activ.');
    }
});

client.login(process.env.TOKEN);
        
