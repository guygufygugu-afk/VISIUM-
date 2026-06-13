const http = require('http');
http.createServer((req, res) => res.end("Bot activ!")).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => { console.log('Botul e ONLINE!'); });

client.login(process.env.DISCORD_TOKEN);
