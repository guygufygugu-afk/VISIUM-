client.on('interactionCreate', async (i) => {
    // 1. Logica pentru Butoane (Aprobare Vouch ȘI Tichete)
    if (i.isButton()) {
        if (i.customId === 'v_accept' || i.customId === 'v_deny') {
            const embedVechi = i.message.embeds[0];
            const embedNou = new EmbedBuilder().setTitle(i.customId === 'v_accept' ? "✅ Vouch Aprobat" : "❌ Vouch Respins").setDescription(`${embedVechi.description}\n\n**Statut:**\nAcceptat de: ${i.user}`).setColor(i.customId === 'v_accept' ? "#00FF00" : "#FF0000");
            await i.update({ embeds: [embedNou], components: [] });
        } 
        // Aici este logica pentru tichete
        else if (i.customId.startsWith('ticket_')) {
            const tipTichet = i.customId.split('_')[1];
            const channel = await i.guild.channels.create({
                name: `${tipTichet}-${i.user.username}`,
                permissionOverwrites: [
                    { id: i.guild.id, deny: ['ViewChannel'] },
                    { id: i.user.id, allow: ['ViewChannel', 'SendMessages'] },
                    { id: STAFF_ROLE_ID, allow: ['ViewChannel', 'SendMessages'] }
                ]
            });
            await i.reply({ content: `✅ Tichet creat: ${channel}`, ephemeral: true });
        }
    } 
    // 2. Logica pentru Comenzi Slash (Moderare)
    else if (i.isChatInputCommand()) {
        await i.deferReply({ ephemeral: true });
        const member = i.options.getMember('user');
        if (i.commandName === 'ban') { await member.ban(); await i.editReply('✅ Ban aplicat.'); }
        if (i.commandName === 'kick') { await member.kick(); await i.editReply('✅ Kick aplicat.'); }
        if (i.commandName === 'timeout') { 
            await member.timeout(i.options.getInteger('minute') * 60 * 1000); 
            await i.editReply('✅ Timeout aplicat.'); 
        }
        if (i.commandName === 'supportpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_purchase').setLabel('Purchase').setStyle(ButtonStyle.Success)
            );
            await i.editReply({ content: "Apasă un buton pentru a deschide un tichet:", components: [row] });
        }
    }
});
