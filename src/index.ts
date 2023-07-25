import { Client, Events, GatewayIntentBits } from "discord.js";
import { token } from "./config.json";

const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.once(Events.ClientReady, c => {
    console.log("Ready!\nLogged in as " + c.user.tag);
});

client.login(token);