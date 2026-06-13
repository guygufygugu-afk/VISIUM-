const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const VOUCH_CHANNEL_ID = '1514651853348929738';
const STAFF_ROLE_ID = '1490701828831052027';

client.on('messageCreate', async (message) => {
    // 1. Ignorăm boții și ne asigurăm că este comanda corectă
    if (message.author.bot || !message.content.startsWith('+vouch')) return;

    const args = message.content.split(' ').slice(1); // Luăm tot după +vouch
    const destinatar = message.mentions.users.first();
    const comentariu = args.slice(1).join(' ');

    // 2. Verificăm dacă utilizatorul a uitat comentariul sau destinatarul
    if (!destinatar || !comentariu) {
        return message.reply({
            content: "↗️ Scrie și comentariul vouch-ului.\nExemplu: `+vouch @user 24€ LTC to MM`"
        });
    }

    // 3. Trimitem mesajul de confirmare în chatul general
    const confirmEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setDescription("🟢 Vouch-ul a fost primit și așteaptă să fie acceptat de un owner/admin.");
    
    await message.reply({ embeds: [confirmEmbed] });

    // 4. Trimitem cererea de aprobare în canalul de loguri (o singură dată)
    const logChannel = message.guild.channels.cache.get(VOUCH_CHANNEL_ID);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setTitle("🔔 Vouch Nou")
            .setDescription(`**Autor:** ${message.author}\n**Destinatar:** ${destinatar}\n**Comentariu:** ${comentariu}`)
            .setColor("#FFD700");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_accept').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_deny').setLabel('Respinge').setStyle(ButtonStyle.Danger)
        );

        await logChannel.send({ embeds: [logEmbed], components: [row] });
    }
});

client.on('interactionCreate', async i => {
    if (!i.isButton()) return;
    
    // 5. Gestionăm aprobarea/respingerea
    if (i.customId === 'v_accept' || i.customId === 'v_deny') {
        if (!i.member.roles.cache.has(STAFF_ROLE_ID)) {
            return i.reply({ content: "Nu ai permisiuni de staff!", ephemeral: true });
        }

        const embedVechi = i.message.embeds[0];
        const esteAcceptat = i.customId === 'v_accept';
        
        const embedNou = new EmbedBuilder()
            .setTitle(esteAcceptat ? "✅ Vouch Aprobat" : "❌ Vouch Respins")
            .setDescription(`${embedVechi.description}\n\n**Statut:**\nAcceptat de: ${i.user}`)
            .setColor(esteAcceptat ? "#00FF00" : "#FF0000");

        await i.update({ embeds: [embedNou], components: [] });
    }
});

client.login(process.env.DISCORD_TOKEN);
