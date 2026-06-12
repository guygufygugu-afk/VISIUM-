const http = require('http');
http.createServer((req, res) => res.end("Botul este online!")).listen(process.env.PORT || 3000);
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites] });
const STAFF_ROLE_ID = "1490701828831052027"; 
const SUGESTII_CHANNEL_ID = "1514651853348929738"; // ID-ul canalului tău salvat corect
const WARNS_FILE = path.join('/tmp', 'warns.json');
const INVITES_FILE = path.join('/tmp', 'invites.json');

if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, JSON.stringify({}));
const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} este online și stabil!`);
    for (const [_, guild] of client.guilds.cache) {
        try { const gi = await guild.invites.fetch(); invitesCache.set(guild.id, new Map(gi.map(i => [i.code, i.uses]))); } catch {}
    }
    const commands = [
        new SlashCommandBuilder().setName('setup-ticket').setDescription('Panou tichete VISIUM').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('setup-sugestii').setDescription('Panou Sugestii cu Formular').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('ban').setDescription('Ban').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder().setName('kick').setDescription('Kick').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder().setName('mute').setDescription('Mute').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Minute').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('unmute').setDescription('Unmute').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warn').setDescription('Warn').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Motiv')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('unwarn').setDescription('Scoate warn-uri').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).addIntegerOption(o => o.setName('cantitate').setDescription('Câte (implicit 1)')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('clearwarns').setDescription('Șterge toate warn-urile').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warns').setDescription('Vezi warn-uri').addUserOption(o => o.setName('user').setDescription('Membru').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('invites').setDescription('Vezi invitații').addUserOption(o => o.setName('user').setDescription('Membru')),
        new SlashCommandBuilder().setName('invites-leaderboard').setDescription('Top invitații'),
        new SlashCommandBuilder().setName('invites-reset').setDescription('Reset invitații').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());
    try { await new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands }); console.log('✅ Comenzi sincronizate!'); } catch (e) { console.error(e); }
});

client.on('inviteCreate', async (inv) => { const c = invitesCache.get(inv.guild.id) || new Map(); c.set(inv.code, inv.uses); invitesCache.set(inv.guild.id, c); });
client.on('guildMemberAdd', async (m) => {
    try {
        const ni = await m.guild.invites.fetch(), oi = invitesCache.get(m.guild.id); let inviter = null;
        if (oi) { const u = ni.find(i => oi.has(i.code) && i.uses > oi.get(i.code)); if (u) inviter = u.inviter; }
        invitesCache.set(m.guild.id, new Map(ni.map(i => [i.code, i.uses])));
        if (inviter) { let d = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf-8')); d[inviter.id] = d[inviter.id] || { regular: 0 }; d[inviter.id].regular++; fs.writeFileSync(INVITES_FILE, JSON.stringify(d, null, 2)); }
    } catch {}
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        const { commandName: cmd, options: opts, guild, user } = i;
        if (cmd === 'unwarn') {
            const u = opts.getUser('user'); let c = opts.getInteger('cantitate') ?? 1; let d = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
            if (!d[u.id] || d[u.id].length === 0) return i.reply({ content: `ℹ️ ${u.tag} nu are warn-uri.`, ephemeral: true });
            let el = 0; for (let j = 0; j < (c < 1 ? 1 : c); j++) { if (d[u.id] && d[u.id].length > 0) { d[u.id].pop(); el++; } }
            const ramase = d[u.id].length; if (ramase === 0) delete d[u.id]; fs.writeFileSync(WARNS_FILE, JSON.stringify(d, null, 2));
            return i.reply({ content: `✅ S-au eliminat \`${el}\` warn-uri pentru ${u}.\n📉 Rămase: \`${ramase}\`` });
        }
        if (cmd === 'clearwarns') {
            const u = opts.getUser('user'); let d = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
            if (!d[u.id]) return i.reply({ content: `ℹ️ ${u.tag} are deja cazierul curat.`, ephemeral: true });
            delete d[u.id]; fs.writeFileSync(WARNS_FILE, JSON.stringify(d, null, 2));
            return i.reply({ content: `🧹 Toate avertismentele lui ${u} au fost șterse de ${user}!` });
        }
        if (cmd === 'setup-sugestii') {
            await i.deferReply({ ephemeral: true });
            const emb = new EmbedBuilder().setTitle('💡 Trimite o Sugestie').setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n**💭 Ai o idee? Trimite-o apăsând butonul de mai jos.**\n\n* Completează formularul.\n* Comunitatea va putea vota ideea ta.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━').setColor('#7289da');
            await i.channel.send({ embeds: [emb], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_sug').setLabel('📝 Trimite Sugestie').setStyle(ButtonStyle.Primary))] });
            return i.editReply({ content: '✅ Panou generat!' });
        }
        if (cmd === 'setup-ticket') {
            await i.deferReply({ ephemeral: true });
            const emb = new EmbedBuilder().setTitle('VISIUM Support Panel').setDescription('━━━━━━━\n**👷 Support**\n**🏦 Purchase**\n**🎁 Claim Reward**\n━━━━━━━').setColor('#0099ff');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('tk_support').setLabel('Support').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('tk_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('tk_claim').setLabel('Claim Reward').setStyle(ButtonStyle.Secondary));
            await i.channel.send({ embeds: [emb], components: [row] }); return i.editReply({ content: '✅ Panou generat!' });
        }
        if (cmd === 'ban') {
            const u = opts.getUser('user'), r = opts.getString('reason') || 'Fără motiv', m = guild.members.cache.get(u.id);
            if (!m || !m.bannable) return i.reply({ content: '❌ Imposibil!', ephemeral: true }); await m.ban({ reason: r });
            return i.reply({ embeds: [new EmbedBuilder().setTitle('🔨 Ban').setDescription(`**Membru:** ${u.tag}\n**Staff:** ${user}\n**Motiv:** ${r}`).setColor('#ff0000')] });
        }
        if (cmd === 'kick') {
            const u = opts.getUser('user'), r = opts.getString('reason') || 'Fără motiv', m = guild.members.cache.get(u.id);
            if (!m || !m.kickable) return i.reply({ content: '❌ Imposibil!', ephemeral: true }); await m.kick(r);
            return i.reply({ embeds: [new EmbedBuilder().setTitle('👢 Kick').setDescription(`**Membru:** ${u.tag}\n**Staff:** ${user}\n**Motiv:** ${r}`).setColor('#ffaa00')] });
        }
        if (cmd === 'mute') {
            const u = opts.getUser('user'), min = opts.getInteger('minutes'), r = opts.getString('reason') || 'Fără motiv', m = guild.members.cache.get(u.id);
            if (!m) return i.reply({ content: '❌ Nu e pe server!', ephemeral: true }); await m.timeout(min * 60 * 1000, r);
            return i.reply({ embeds: [new EmbedBuilder().setTitle('🤫 Mute').setDescription(`**Membru:** ${u.tag}\n**Durată:** ${min} min\n**Staff:** ${user}`).setColor('#333333')] });
        }
        if (cmd === 'unmute') {
            const m = guild.members.cache.get(opts.getUser('user').id); if (!m) return i.reply({ content: '❌ Nu e pe server!' }); await m.timeout(null);
            return i.reply({ content: `🔊 Mutul a fost scos!` });
        }
        if (cmd === 'warn') {
            const u = opts.getUser('user'), r = opts.getString('reason') || 'Fără motiv'; let d = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
            d[u.id] = d[u.id] || []; d[u.id].push({ staff: user.tag, reason: r, date: new Date().toLocaleDateString() }); fs.writeFileSync(WARNS_FILE, JSON.stringify(d, null, 2));
            return i.reply({ embeds: [new EmbedBuilder().setTitle('⚠️ Warn').setDescription(`**Membru:** ${u}\n**Staff:** ${user}\n**Motiv:** ${r}\n**Total:** \`${d[u.id].length}\``).setColor('#ffff00')] });
        }
        if (cmd === 'warns') {
            const u = opts.getUser('user'); let d = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
            if (!d[u.id] || d[u.id].length === 0) return i.reply({ content: `ℹ️ ${u.tag} nu are avertismente.` });
            return i.reply({ embeds: [new EmbedBuilder().setTitle(`📋 Warn-uri: ${u.tag}`).setDescription(d[u.id].map((w, idx) => `**${idx + 1}.** Staff: \`${w.staff}\` | Motiv: \`${w.reason}\` (${w.date})`).join('\n')).setColor('#ffff00')] });
        }
        if (cmd === 'invites') {
            const t = opts.getUser('user') || user; let d = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf-8'));
            return i.reply({ embeds: [new EmbedBuilder().setTitle(`📊 Invites`).setDescription(`${t} are **${d[t.id] ? d[t.id].regular : 0}** invitații.`).setColor('#00ffcc')] });
        }
        if (cmd === 'invites-leaderboard') {
            let d = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf-8'));
            const s = Object.entries(d).map(([id, info]) => ({ id, regular: info.regular })).sort((a, b) => b.regular - a.regular).slice(0, 10);
            if (s.length === 0) return i.reply({ content: 'ℹ️ Fără date.' }); let txt = '';
            s.forEach((u, idx) => { txt += `${idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'🔹'} <@${u.id}> — \`${u.regular}\` invitații\n`; });
            return i.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription(txt).setColor('#ffcc00')] });
        }
        if (cmd === 'invites-reset') { fs.writeFileSync(INVITES_FILE, JSON.stringify({})); return i.reply({ content: '✅ Resetat!' }); }
    }

    if (i.isButton()) {
        const { customId: cid, guild, user, message: msg } = i;
        if (cid === 'btn_sug') {
            const modal = new ModalBuilder().setCustomId('md_sug').setTitle('Trimite o sugestie');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_id').setLabel('Ce sugestie ai?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_aj').setLabel('Cu ce va ajuta serverul?').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return await i.showModal(modal);
        }
        if (cid === 's_da' || cid === 's_nu') {
            await i.deferUpdate(); const emb = msg.embeds[0], comp = msg.components[0].components;
            let da = parseInt(comp[0].label.match(/\d+/)[0]), nu = parseInt(comp[1].label.match(/\d+/)[0]);
            if (cid === 's_da') da++; else nu++;
            const nEmb = EmbedBuilder.from(emb).setFields(
                { name: emb.fields[0].name, value: emb.fields[0].value },
                { name: emb.fields[1].name, value: emb.fields[1].value },
                { name: '📊 Status Voturi:', value: `✅ Aprobări: \`${da}\` | ❌ Respingeri: \`${nu}\`` }
            );
            return msg.edit({ embeds: [nEmb], components: [new ActionRowBuilder().addComponents(ButtonBuilder.from(comp[0]).setLabel(`Aprobă (${da})`), ButtonBuilder.from(comp[1]).setLabel(`Respinge (${nu})`))] });
        }
        if (['tk_support', 'tk_purchase', 'tk_claim'].includes(cid)) {
            await i.deferReply({ ephemeral: true }); let lbl = cid === 'tk_purchase' ? 'purchase' : (cid === 'tk_claim' ? 'claim' : 'support');
            const ch = await guild.channels.create({
                name: `${lbl}-${user.username}`, type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            });
            await ch.send({ content: `${user} | <@&${STAFF_ROLE_ID}>`, embeds: [new EmbedBuilder().setTitle(`🎫 Ticket ${lbl.toUpperCase()}`).setDescription(`Salut ${user}!\n\nStaff-ul te va ajuta imediat.`).setColor('#ffcc00')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('tk_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger))] });
            return i.editReply({ content: `Creat în ${ch}!` });
        }
        if (cid === 'tk_close') { await i.reply({ content: 'Șterg în 5 secunde...' }); setTimeout(async () => { await i.channel.delete().catch(() => {}); }, 5000); }
    }

    if (i.isModalSubmit() && i.customId === 'md_sug') {
        const id = i.fields.getTextInputValue('s_id'), aj = i.fields.getTextInputValue('s_aj');
        const targetChannel = i.guild.channels.cache.get(SUGESTII_CHANNEL_ID);
        
        if (!targetChannel) return i.reply({ content: '❌ Canalul de sugestii configurat nu a fost găsit pe server!', ephemeral: true });
        await i.reply({ content: '✅ Formular trimis cu succes în canalul dedicat!', ephemeral: true });
        
        return targetChannel.send({ 
            embeds: [new EmbedBuilder().setTitle('💡 Sugestie Nouă').setThumbnail(i.user.displayAvatarURL({ dynamic: true })).setColor('#ffff00').addFields({ name: '📝 Sugestia mea:', value: `\`\`\`\n${id}\n\`\`\`` }, { name: '❓ Ajutor:', value: `\`\`\`\n${aj}\n\`\`\`` }, { name: '📊 Status Voturi:', value: '✅ Aprobări: `0` | ❌ Respingeri: `0`' }).setFooter({ text: `Trimis de: ${i.user.tag}` }).setTimestamp()], 
            components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('s_da').setLabel('Aprobă (0)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('s_nu').setLabel('Respinge (0)').setStyle(ButtonStyle.Danger))] 
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
    
