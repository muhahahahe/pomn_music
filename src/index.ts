import { ActivityType, Client, Events, GatewayIntentBits, Partials, PresenceUpdateStatus } from 'discord.js';
import Main from './classes/Main';
import 'dotenv/config';

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.User],
	presence: {
		status: PresenceUpdateStatus.Online,
		activities: [
			{
				name: 'Music',
				type: ActivityType.Playing,
			},
		],
	},
});

client.once(Events.ClientReady, (c) => {
	console.log('Logged in as ' + c.user.tag);
	const main = new Main(c);
	main.init();
});

if (process.env.TOKEN?.length === 0) {
	throw new Error('No token provided');
}

client.login(process.env.TOKEN);
