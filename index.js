const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ⚙️ CONFIGURAȚIE GLOBALA (Înlocuiește ID-urile cu cele reale ale serverului tău)
const CONFIG = {
    OWNER_ID: '123456789012345678',       // ID-ul tău de proprietar (fisc/cazinou)
    SCAMMER_ROLE_ID: '123456789012345678', // ID-ul rolului de Scammer
    SUSPECT_ROLE_ID: '123456789012345678',  // ID-ul rolului de Suspect
    VOUCH_CHANNEL_ID: '123456789012345678' // ID-ul canalului unde se trimit vouch-urile în verificare
};

// 💾 BAZE DE DATE ÎN MEMORIE (Maps)
const economy = new Map();
const vouches = new Map();
const pendingVouches = new Map();
const marriages = new Map();
const afkUsers = new Map();
const sanctions = new Map();

// Cooldowns
const lastCrime = new Map();
const lastFish = new Map();
const lastHunt = new Map();
const lastDaily = new Map();
const lastWork = new Map();
const activeBlackjack = new Map();

// 🧮 FUNKȚII AJUTĂTOARE ECONOMIE & JOCURI
function getBalance(userId) {
    return economy.get(userId) || 0;
}

function addBalance(userId, amount) {
    const curent = getBalance(userId);
    economy.set(userId, Math.max(0, curent + amount));
}

function addSanction(userId, type, reason, modTag) {
    if (!sanctions.has(userId)) sanctions.set(userId, []);
    sanctions.get(userId).push({ type, reason, mod: modTag, date: new Date().toLocaleDateString() });
}

function drawCard() {
    const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
    return cards[Math.floor(Math.random() * cards.length)];
}

function getScore(hand) {
    let score = hand.reduce((a, b) => a + b, 0);
    let aces = hand.filter(c => c === 11).length;
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

// 🚀 EVENIMENT: BOT READY
client.once('ready', () => {
    console.log(`[🤖 VISIUM BOT] Conectat ca ${client.user.tag}! Sistemul este gata.`);
});

// 🎛️ INTERACTION CREATE (SLASH COMMANDS & BUTTONS)
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        // MANAGEMENT BLACKJACK (HIT / STAND)
        if (interaction.customId.startsWith('bj_')) {
            const [_, action, userId] = interaction.customId.split('_');
            if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Nu este meciul tău!', ephemeral: true });
            
            const game = activeBlackjack.get(userId);
            if (!game) return interaction.reply({ content: '❌ Meci expirat.', ephemeral: true });

            if (action === 'hit') {
                game.pHand.push(drawCard());
                const pScore = getScore(game.pHand);
                
                if (pScore > 21) {
                    addBalance(userId, -game.bet); addBalance(CONFIG.OWNER_ID, game.bet);
                    activeBlackjack.delete(userId);
                    return interaction.update({ embeds: [new EmbedBuilder().setTitle('🃏 Blackjack - Ai pierdut!').setColor(0xFF0000).setDescription(`Ai depășit 21! Scor: **${pScore}**\nAi pierdut **${game.bet} Coins**.`)], components: [] });
                }
                
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('Hit').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('Stand').setStyle(ButtonStyle.Danger));
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('🃏 Blackjack Măsuță').setColor(0x2ECC71).setDescription(`Miză: **${game.bet}**`).addFields({ name: '🫵 Scor tău', value: `Carduri: [${game.pHand.join(', ')}] (Scor: ${pScore})`, inline: true }, { name: '🤖 Dealer', value: `Card: [${game.dHand[0]}, ?]`, inline: true })], components: [row] });
            }

            if (action === 'stand') {
                let dScore = getScore(game.dHand);
                while (dScore < 17) {
                    game.dHand.push(drawCard());
                    dScore = getScore(game.dHand);
                }
                
                const pScore = getScore(game.pHand);
                activeBlackjack.delete(userId);
                
                let msg = '';
                let win = false;
                let tie = false;

                if (dScore > 21 || pScore > dScore) { win = true; msg = `🎉 Ai câștigat! Dealerul are **${dScore}**, tu ai **${pScore}**. ai primit **${game.bet} Coins**!`; }
                else if (pScore < dScore) { msg = `😭 Ai pierdut! Dealerul are **${dScore}**, tu ai **${pScore}**. Ai pierdut **${game.bet} Coins**.`; }
                else { tie = true; msg = `👔 Egalitate! Ambii aveți **${pScore}**. Banii ți-au fost returnați.`; }

                if (win) addBalance(userId, game.bet);
                else if (!win && !tie) { addBalance(userId, -game.bet); addBalance(CONFIG.OWNER_ID, game.bet); }

                return interaction.update({ embeds: [new EmbedBuilder().setTitle('🃏 Blackjack Finalizat').setColor(win ? 0x2ECC71 : (tie ? 0xF1C40F : 0xFF0000)).setDescription(msg).addFields({ name: '🫵 Mana ta', value: `[${game.pHand.join(', ')}] (Scor: ${pScore})`, inline: true }, { name: '🤖 Dealer', value: `[${game.dHand.join(', ')}] (Scor: ${dScore})`, inline: true })], components: [] });
            }
        }

        // MANAGEMENT VOUCH (STAFF ACCEPT / REJECT)
        if (interaction.customId === 'vouch_accept' || interaction.customId === 'vouch_reject') {
            const data = pendingVouches.get(interaction.message.id);
            if (!data) return interaction.reply({ content: '❌ Datele acestui vouch nu mai există în cache.', ephemeral: true });

            if (interaction.customId === 'vouch_accept') {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ status: 'accepted', comment: data.comment, authorName: data.authorName, timestamp: data.timestamp });
                pendingVouches.delete(interaction.message.id);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('✅ Vouch Aprobat').setColor(0x2ECC71).setDescription(`Vouch-ul oferit de **${data.authorName}** pentru <@${data.targetId}> a fost acceptat de staff.`)], components: [] });
            } else {
                if (!vouches.has(data.targetId)) vouches.set(data.targetId, []);
                vouches.get(data.targetId).push({ status: 'rejected', comment: data.comment, authorName: data.authorName, timestamp: data.timestamp });
                pendingVouches.delete(interaction.message.id);
                return interaction.update({ embeds: [new EmbedBuilder().setTitle('❌ Vouch Respins').setColor(0xFF0000).setDescription(`Vouch-ul oferit de **${data.authorName}** pentru <@${data.targetId}> a fost respins.`)], components: [] });
            }
        }
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // 🎰 ROULETTE
    if (commandName === 'roulette') {
        const suma = options.getInteger('suma'); const alegere = options.getString('culoare');
        if (suma <= 0) return interaction.reply({ content: '❌ Introdu o sumă pozitivă!', ephemeral: true });
        if (getBalance(interaction.user.id) < suma) return interaction.reply({ content: '❌ Bani insuficienți!', ephemeral: true });
        
        const r = Math.random(); let castigatoare = '';
        if (r < 0.47) castigatoare = 'rosu'; else if (r < 0.94) castigatoare = 'negru'; else castigatoare = 'verde';

        if (alegere === castigatoare) {
            let mult = castigatoare === 'verde' ? 14 : 2; const profit = suma * (mult - 1); addBalance(interaction.user.id, profit);
            return interaction.reply(`🎰 **[RULETĂ]** Bila s-a oprit pe **${castigatoare.toUpperCase()}**! 🎉 Felicitări! Ai câștigat **${suma * mult} Coins**.`);
        } else {
            addBalance(interaction.user.id, -suma); addBalance(CONFIG.OWNER_ID, suma);
            return interaction.reply(`🎰 **[RULETĂ]** Bila s-a oprit pe **${castigatoare.toUpperCase()}**... 😭 Ai pierdut **${suma} Coins**. Banii au fost colectați de cazinou.`);
        }
    }

    // 🥷 CRIME
    if (commandName === 'crime') {
        const cd = 45 * 60 * 1000; const last = lastCrime.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Ești căutat de poliție! Poți comite o nouă crimă în <t:${Math.floor((last + cd)/1000)}:R>.`, ephemeral: true });
        lastCrime.set(interaction.user.id, Date.now());

        const succes = Math.random() < 0.35; 
        if (succes) {
            const prf = Math.floor(Math.random() * 800) + 300; addBalance(interaction.user.id, prf);
            return interaction.reply(`🥷 **[CRIMĂ REUȘITĂ]** Ai spart un seif securizat și ai strâns **${prf} Visium Coins** fără să fii văzut!`);
        } else {
            const amenda = Math.floor(Math.random() * 400) + 200; addBalance(interaction.user.id, -amenda); addBalance(CONFIG.OWNER_ID, amenda);
            return interaction.reply(`🚨 **[PRINS DE POLIȚIE]** Planul tău a eșuat mizerabil! Ai fost reținut și amendat cu **${amenda} Visium Coins**. Suma a fost retrasă automat de fisc.`);
        }
    }

    // 🎣 FISH
    if (commandName === 'fish') {
        const cd = 5 * 60 * 1000; const last = lastFish.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Peștii s-au speriat. Încearcă din nou în <t:${Math.floor((last + cd)/1000)}:R>.`, ephemeral: true });
        lastFish.set(interaction.user.id, Date.now());
        const pesti = ['🐟 Pește mic', '🐠 Pește tropical', '🐡 Pește balon', '🦈 Rechin de Aur!'];
        const r = Math.random(); let idx = r < 0.5 ? 0 : (r < 0.8 ? 1 : (r < 0.97 ? 2 : 3));
        const sume = [60, 120, 250, 800]; addBalance(interaction.user.id, sume[idx]);
        return interaction.reply(`🎣 ${interaction.user} a aruncat undița în lac și a prins un **${pesti[idx]}** vândut instant cu **${sume[idx]} Coins**!`);
    }

    // 🏹 HUNT
    if (commandName === 'hunt') {
        const cd = 7 * 60 * 1000; const last = lastHunt.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Nu ai muniție! Mergi la vânătoare din nou în <t:${Math.floor((last + cd)/1000)}:R>.`, ephemeral: true });
        lastHunt.set(interaction.user.id, Date.now());
        const animale = ['⚰️ Nimic (ai ratat)', '🐇 Iepure sălbatic', '🐗 Porc mistreț', '🐻 Urs Brun Carpatin'];
        const r = Math.random(); let idx = r < 0.3 ? 0 : (r < 0.65 ? 1 : (r < 0.92 ? 2 : 3));
        const sume = [0, 90, 200, 650]; if (sume[idx] > 0) addBalance(interaction.user.id, sume[idx]);
        return interaction.reply(`🏹 ${interaction.user} a mers în pădure cu arcul și a vânat un **${animale[idx]}** aducându-i profit de **${sume[idx]} Coins**!`);
    }

    // 🏆 RICHEST
    if (commandName === 'richest') {
        const arr = []; for (const [uid, bal] of economy.entries()) { if (bal > 0) arr.push({ uid, bal }); }
        arr.sort((a, b) => b.bal - a.bal);
        let txt = `# 👛 Top 10 Cei Mai Bogați Membri\n\n`;
        if (arr.length === 0) txt += `*Sărăcie totală, nimeni nu are monede.*`;
        else arr.slice(0, 10).forEach((u, i) => { txt += `**#${i+1}** <@${u.uid}> — \`${u.bal} Coins\`\n`; });
        return interaction.reply({ content: txt });
    }

    if (commandName === 'avatar') {
        const user = options.getUser('utilizator') || interaction.user;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ Avatarul lui ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(0x3498DB)] });
    }
    if (commandName === 'serverinfo') {
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🏰 ${interaction.guild.name}`).setThumbnail(interaction.guild.iconURL({ dynamic: true })).setColor(0x9B59B6).addFields({ name: '👑 Proprietar', value: `<@${interaction.guild.ownerId}>`, inline: true }, { name: '👥 Membri', value: `\`${interaction.guild.memberCount}\``, inline: true })] });
    }
    if (commandName === 'userinfo') {
        const user = options.getUser('utilizator') || interaction.user; const member = options.getMember('utilizator') || interaction.member;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`👤 Detalii Membru - ${user.username}`).setColor(0x2ECC71).addFields({ name: '🆔 ID Utilizator', value: `\`${user.id}\``, inline: true }, { name: '📆 Alăturat', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true })] });
    }
    if (commandName === 'pay') {
        const user = options.getUser('utilizator'); const suma = options.getInteger('suma');
        if (user.id === interaction.user.id || suma <= 0 || getBalance(interaction.user.id) < suma) return interaction.reply({ content: '❌ Eroare tranzacție!', ephemeral: true });
        addBalance(interaction.user.id, -suma); addBalance(user.id, suma); return interaction.reply(`💸 ${interaction.user} i-a trimis **${suma} Coins** lui ${user}!`);
    }
    if (commandName === 'rob') {
        const user = options.getUser('utilizator'); if (user.id === interaction.user.id || getBalance(user.id) < 200) return interaction.reply({ content: '❌ Imposibil de jefuit!', ephemeral: true });
        if (Math.random() < 0.45) {
            const furat = Math.floor(Math.random() * (getBalance(user.id) * 0.25)) + 50; addBalance(interaction.user.id, furat); addBalance(user.id, -furat);
            return interaction.reply(`🥷 **Jaf reușit!** ${interaction.user} a fugit cu **${furat} Coins** de la ${user}!`);
        } else {
            addBalance(interaction.user.id, -150); addBalance(CONFIG.OWNER_ID, 150); 
            return interaction.reply(`🚨 **Prins în fapt!** ${interaction.user} a fost reținut. Amenda de **150 Coins** pleacă la fisc.`);
        }
    }
    if (commandName === 'dice') {
        return interaction.reply(`🎲 Zaruri: **${Math.floor(Math.random() * 6) + 1}** și **${Math.floor(Math.random() * 6) + 1}**.`);
    }
    if (commandName === 'clear') {
        const amount = options.getInteger('cantitate'); await interaction.channel.bulkDelete(amount, true); return interaction.reply({ content: `🧹 Am șters ${amount} mesaje.`, ephemeral: true });
    }
    if (commandName === 'lock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }); return interaction.reply('🔒 Canal blocat.'); }
    if (commandName === 'unlock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }); return interaction.reply('🔓 Canal deblocat.'); }
    if (commandName === 'timeout') {
        const member = options.getMember('membru'); const minutes = options.getInteger('minute'); const reason = options.getString('motiv') || 'Fara motiv';
        await member.timeout(minutes * 60 * 1000, reason); addSanction(member.id, 'TIMEOUT', `${minutes}m - ${reason}`, interaction.user.tag); return interaction.reply({ content: `⏱️ ${member.user.tag} a primit timeout.` });
    }
    if (commandName === 'untimeout') { const member = options.getMember('membru'); await member.timeout(null); return interaction.reply({ content: `✅ Timeout scos.` }); }
    if (commandName === 'warn') { const member = options.getMember('membru'); addSanction(member.id, 'WARN', options.getString('motiv') || 'Fara motiv', interaction.user.tag); return interaction.reply({ content: `⚠️ Utilizator avertizat.` }); }
    if (commandName === 'kick') { const member = options.getMember('membru'); await member.kick(); return interaction.reply({ content: `👢 Membru dat afară.` }); }
    if (commandName === 'ban') { const user = options.getUser('membru'); await interaction.guild.members.ban(user); return interaction.reply({ content: `🛑 Ban permanent aplicat.` }); }
    
    if (commandName === 'mark') {
        const user = options.getUser('utilizator'); const member = interaction.guild.members.cache.get(user.id); if (member) await member.roles.add(CONFIG.SCAMMER_ROLE_ID).catch(() => {});
        addSanction(user.id, 'MARK SCAMMER', options.getString('motiv'), interaction.user.tag); return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`# 🚨 Scammer Marcat: ${user}`)] });
    }
    if (commandName === 'suspect') {
        const user = options.getUser('utilizator'); const member = interaction.guild.members.cache.get(user.id); if (member) await member.roles.add(CONFIG.SUSPECT_ROLE_ID).catch(() => {});
        addSanction(user.id, 'SUSPECT HACK', options.getString('motiv'), interaction.user.tag); return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE67E22).setDescription(`# 🚨 Suspect Marcat: ${user}`)] });
    }
    if (commandName === 'supportpanel') {
        const embed = new EmbedBuilder().setTitle('⚔️ Visium Panel').setColor(0x1ABC9C).setDescription('Alege tipul ticketului din meniul de mai jos:');
        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Alege >').addOptions([{ label: 'Support', value: 'support', emoji: '🎒' }, { label: 'Purchase', value: 'purchase', emoji: '💸' }]));
        await interaction.channel.send({ embeds: [embed], components: [row] }); return interaction.reply({ content: '✅ Panou generat!', ephemeral: true });
    }
    if (commandName === 'check') {
        const targetUser = options.getUser('utilizator'); const totalVouches = (vouches.get(targetUser.id) || []).filter(v => v.status === 'accepted').length;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ Verificare Securitate`).setColor(0x2ECC71).addFields({ name: '👤 Cont', value: `${targetUser}`, inline: true }, { name: '📈 Vouch-uri aprobate', value: `\`${totalVouches}\``, inline: true })] });
    }
    if (commandName === 'daily') {
        const cd = 24 * 60 * 60 * 1000; const last = lastDaily.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Cooldown activ!`, ephemeral: true });
        lastDaily.set(interaction.user.id, Date.now()); addBalance(interaction.user.id, 500); return interaction.reply(`🪙 Ai primit **500 Visium Coins**!`);
    }
    if (commandName === 'work') {
        const cd = 30 * 60 * 1000; const last = lastWork.get(interaction.user.id) || 0;
        if (Date.now() - last < cd) return interaction.reply({ content: `❌ Cooldown active!`, ephemeral: true });
        lastWork.set(interaction.user.id, Date.now()); const c = Math.floor(Math.random() * 200) + 50; addBalance(interaction.user.id, c); return interaction.reply(`💼 Ai muncit și ai primit **${c} Coins**!`);
    }
    if (commandName === 'balance') {
        const target = options.getUser('utilizator') || interaction.user; return interaction.reply(`👛 ${target} deține: **${getBalance(target.id)} Visium Coins**.`);
    }
    if (commandName === 'coinflip') {
                if (alegere === sause) { addBalance(interaction.user.id, suma); return interaction.reply(`🎰 A picat **${sause.toUpperCase()}**! Ai câștigat \`${suma * 2}\` monede!`); }
        else { addBalance(interaction.user.id, -suma); addBalance(CONFIG.OWNER_ID, suma); return interaction.reply(`🎰 A picat **${sause.toUpperCase()}**... Ai pierdut \`${suma}\` monede.`); }
    }
});

// 💬 MESSAGE CREATE (TAG RESPONSES & PREFIX COMMANDS)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;

    // 🎯 RĂSPUNS INSTANT LA TAG (PING)
    if (message.mentions.has(client.user) && !message.mentions.everyone) {
        if (!message.content.startsWith('+')) {
            return message.reply('hei, cu ce te pot ajuta?');
        }
    }

    // LOGICA AFK
    if (afkUsers.has(message.author.id)) { afkUsers.delete(message.author.id); message.reply('👋 Bine ai revenit! Starea AFK oprită.').then(m => setTimeout(() => m.delete().catch(() => {}), 4000)); }
    if (message.mentions.users.size > 0) { message.mentions.users.forEach(user => { if (afkUsers.has(user.id)) message.reply(`💤 **${user.username}** este AFK: *${afkUsers.get(user.id)}*`); }); }

    const args = message.content.split(' '); const cmd = args[0].toLowerCase();

    // 📚 COMANDA +HELP
    if (cmd === '+help') {
        const embed = new EmbedBuilder()
            .setTitle('📚 Meniu Ajutor - Comenzi Visium Ultra')
            .setColor(0x1ABC9C)
            .setDescription('Iată comenzile pe care le poți folosi direct în chat cu prefixul `+`: Entries active.')
            .addFields(
                { name: '🎭 Social', value: '`+hug @user`, `+kiss @user`, `+slap @user`', inline: false },
                { name: '❤️ Relații', value: '`+marry @user`, `+divorce`', inline: false },
                { name: '🎰 Cazino Prefix', value: '`+v slots [sumă]`, `+v bj [sumă]`', inline: false },
                { name: '🛡️ Utilitare & Profil', value: '`+vouch @user [comentariu]`, `+p @user` (sau `+profile`), `+leaderboard` (sau `+lb`)', inline: false }
            );
        return message.reply({ embeds: [embed] });
    }

    // 🎭 COMÊNZI SOCIALE
    if (cmd === '+hug') {
        const target = message.mentions.users.first(); if (!target) return message.reply('❌ Menționează pe cineva pentru îmbrățișare!');
        return message.reply(`🤗 **${message.author.username}** l-a strâns puternic în brațe pe **${target.username}**! ❤️`);
    }
    if (cmd === '+kiss') {
        const target = message.mentions.users.first(); if (!target) return message.reply('❌ Menționează persoana pe care vrei să o săruți!');
        return message.reply(`💋 **${message.author.username}** i-a oferit un sărut dulce lui **${target.username}**! 💖`);
    }
    if (cmd === '+slap') {
        const target = message.mentions.users.first(); if (!target) return message.reply('❌ Menționează pe cineva pentru a-i da o palmă!');
        return message.reply(`💥 **${message.author.username}** i-a tras o palmă sonoră lui **${target.username}**! 💀`);
    }

    // ❤️ RELAȚII
    if (cmd === '+marry') {
        const target = message.mentions.users.first(); if (!target || target.id === message.author.id || marriages.has(message.author.id) || marriages.has(target.id)) return message.reply('❌ Căsătorie imposibilă sau ești deja ocupat/ă!');
        marriages.set(message.author.id, target.id); marriages.set(target.id, message.author.id); return message.reply(`💍 **Căsătorie oficială!** ${message.author} s-a căsătorit cu ${target}! 🎉`);
    }
    if (cmd === '+divorce') {
        if (!marriages.has(message.author.id)) return message.reply('❌ Nu ești căsătorit/ă!');
        const ex = marriages.get(message.author.id); marriages.delete(message.author.id); marriages.delete(ex); return message.reply(`💔 Relația dintre ${message.author} și <@${ex}> s-a destrămat.`);
    }

    // 🎰 CAZINO PREFIX COMMANDE (+v slots / +v bj)
    if (cmd === '+v') {
        const subcmd = args[1]?.toLowerCase(); const suma = parseInt(args[2]);
        if (!subcmd || isNaN(suma) || suma <= 0 || getBalance(message.author.id) < suma) return message.reply('❌ Parametri invalizi cazinou sau bani insuficienți!');

        if (subcmd === 'slots') {
            const items = ['🍒', '🍋', '🍇', '💎', '🎰'];
            const r1 = items[Math.floor(Math.random() * items.length)]; const r2 = items[Math.floor(Math.random() * items.length)]; const r3 = items[Math.floor(Math.random() * items.length)];
            let mult = 0; if (r1 === r2 && r2 === r3) mult = r1 === '🎰' ? 5 : 3.5; else if (r1 === r2 || r2 === r3 || r1 === r3) mult = 1.5;

            if (mult > 0) { addBalance(message.author.id, Math.floor(suma * mult) - suma); return message.reply(`🎰 **[SLOTS]** | [ ${r1} | ${r2} | ${r3} ]\n🎉 Câștig! Ai primit **${Math.floor(suma * mult)} Coins**!`); }
            else { addBalance(message.author.id, -suma); addBalance(CONFIG.OWNER_ID, suma); return message.reply(`🎰 **[SLOTS]** | [ ${r1} | ${r2} | ${r3} ]\n😭 Pierdere! Ai pierdut **${suma} Coins**.`); }
        }

        if (subcmd === 'bj' || subcmd === 'blackjack') {
            if (activeBlackjack.has(message.author.id)) return message.reply('❌ Ai deja un meci activ!');
            const pHand = [drawCard(), drawCard()]; const dHand = [drawCard(), drawCard()];
            if (getScore(pHand) === 21) { addBalance(message.author.id, Math.floor(suma * 1.5)); return message.reply(`🃏 **[BLACKJACK]** Natural 21! Câștigat instant **${Math.floor(suma * 1.5)} Coins**!`); }
            activeBlackjack.set(message.author.id, { bet: suma, pHand, dHand });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`bj_hit_${message.author.id}`).setLabel('Hit').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`bj_stand_${message.author.id}`).setLabel('Stand').setStyle(ButtonStyle.Danger));
            return message.reply({ embeds: [new EmbedBuilder().setTitle('🃏 Blackjack Măsuță').setColor(0x2ECC71).setDescription(`Miză: **${suma}**`).addFields({ name: '🫵 Scor tău', value: `Carduri: [${pHand.join(', ')}]`, inline: true }, { name: '🤖 Dealer', value: `Card: [${dHand[0]}, ?]`, inline: true })], components: [row] });
        }
    }

    // 📩 SYSTEM DE VOUCH
    if (cmd === '+vouch') {
        const target = message.mentions.users.first(); if (!target || target.id === message.author.id) return message.reply('❌ User greșit!');
        const comment = args.slice(2).join(' ') || 'Fara comentariu'; const vc = message.guild.channels.cache.get(CONFIG.VOUCH_CHANNEL_ID);
        if (!vc) return message.reply('❌ Canalul de verificări vouch nu este configurat corect.');
        
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('vouch_accept').setLabel('Accept').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('vouch_reject').setLabel('Reject').setStyle(ButtonStyle.Danger));
        const m = await vc.send({ embeds: [new EmbedBuilder().setTitle('📩 Vouch Nou').setDescription(`De la: ${message.author}\nPentru: ${target}\nComentariu: ${comment}`)], components: [row] });
        pendingVouches.set(m.id, { targetId: target.id, authorName: message.author.username, comment: comment, timestamp: Date.now() }); return message.reply(`📩 Trimis spre verificare staff.`);
    }

    // 👤 DESIGN PREMIUM PROFIL (TEXT)
    if (cmd === '+p' || cmd === '+profile') {
        const target = message.mentions.users.first() || message.author; 
        const allVouches = vouches.get(target.id) || [];
        
        const acceptate = allVouches.filter(v => v.status === 'accepted').length;
        const refuzate = allVouches.filter(v => v.status === 'rejected' || v.status === 'denied').length;
        const acum7Zile = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const ultimele7Zile = allVouches.filter(v => v.timestamp && v.timestamp > acum7Zile).length;

        const ultimeleComentarii = allVouches
            .filter(v => v.status === 'accepted' && v.comment)
            .slice(-3)
            .reverse()
            .map(v => `💬 "${v.comment}" - *de la ${v.authorName || 'Membru'}*`)
            .join('\n') || '🚫 *Niciun comentariu recent.*';

        const member = message.guild.members.cache.get(target.id);
        const displayName = member ? member.displayName : target.username;

        const profilText = `# 👤 ${target.username} Profil Utilizator\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**👤 User:** ${target}\n` +
            `**🆔 ID:** \`${target.id}\`\n` +
            `**📛 Display Name:** \`${displayName}\`\n` +
            `**📅 Cont creat:** <t:${Math.floor(target.createdTimestamp / 1000)}:F> (<t:${Math.floor(target.createdTimestamp / 1000)}:R>)\n` +
            `**👛 Balanță:** \`${getBalance(target.id)} Coins\`\n` +
            `**💍 Status Relație:** ${marriages.has(target.id) ? `💍 Căsătorit(ă) cu <@${marriages.get(target.id)}>` : 'Un singuratic convingător'}\n\n` +
            `## 📊 Informații Vouch\n` +
            `**✅ Vouch-uri acceptate:** \`${acceptate}\`\n` +
            `**❌ Vouch-uri refuzate:** \`${refuzate}\`\n` +
            `**📈 Ultimele 7 zile:** \`${ultimele7Zile}\`\n\n\n` +
            `## 📝 Ultimele comentarii:\n` +
            `${ultimeleComentarii}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        return message.reply({ content: profilText });
    }

    // 🏆 COMANDA +LEADERBOARD / +LB
    if (cmd === '+leaderboard' || cmd === '+lb') {
        const arr = []; for (const [uid, bal] of economy.entries()) { if (bal > 0) arr.push({ uid, bal }); }
        arr.sort((a, b) => b.bal - a.bal);
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Top 10 Cei Mai Bogați Membri (Visium Economy)')
            .setColor(0xF1C40F);
        
        let txt = '';
        if (arr.length === 0) txt = '*Baza de date este goală. Nimeni nu deține monede momentan.*';
        else arr.slice(0, 10).forEach((u, i) => { txt += `**#${i+1}** <@${u.uid}> — \`${u.bal} Coins\`\n`; });
        
        embed.setDescription(txt);
        return message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
    
