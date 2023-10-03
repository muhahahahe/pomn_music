import { APIEmbedField, EmbedAssetData, EmbedBuilder, EmbedData } from 'discord.js';
import { Command, MediaTrack, PlayerState } from '../interfaces';
import { secondsToTime } from './utils';

const BasicPlayerEmbed = {
	title: 'Music Player',
	description: 'Waiting for requests...\n\n/help - for more information',
	color: 0x00dc00,
};

/**
 * Creates a player embed.
 *
 * @param {EmbedData} data - The data for the embed
 * @returns {EmbedBuilder} - Returns the embed.
 */
function createPlayerEmbed(data: EmbedData): EmbedBuilder {
	return new EmbedBuilder(data);
}

/**
 * Creates a basic player embed.
 *
 * @returns {EmbedBuilder} - Returns the embed.
 */
function createBasicPlayerEmbed(): EmbedBuilder {
	return createPlayerEmbed(BasicPlayerEmbed);
}

/**
 * Creates embed data from a MediaTrack.
 *
 * @param {MediaTrack} track - The MediaTrack to create the embed data from.
 * @param {PlayerState} state - The PlayerState of the player manager.
 * @param {MediaTrack} [next] - The next track if available.
 * @returns {EmbedData} - Returns the embed data.
 */
function createEmbedDataFromTrack(track: MediaTrack, state: PlayerState, next?: MediaTrack): EmbedData {
	let color = 0xdc0000;
	let repeat = 'Off';
	if (state.repeat) {
		color = 0x7800b4;
		repeat = 'Single';
	}
	if (state.repeatAll) {
		color = 0x300050;
		repeat = 'All';
	}
	if (state.paused) color = 0x323232;
	const data: EmbedData = {
		title: track.title ? track.title : 'unknown',
		fields: [
			{
				name: 'Requested by:',
				value: `${track.requester}`,
				inline: true,
			},
			{
				name: 'Channel:',
				value: `${track.voiceChannel}`,
				inline: true,
			},
			{
				name: '\u2009',
				value: '\u2009',
				inline: true,
			},
			{
				name: 'Duration:',
				value: `${secondsToTime(track.durationInSec)}`,
				inline: true,
			},
			{
				name: 'Repeat:',
				value: repeat,
				inline: true,
			},
			{
				name: 'Volume:',
				value: `${state.volume}`,
				inline: true,
			},
			{
				name: 'Next:',
				value: next ? next.title : '\u2009',
			},
		],
		color: color,
		thumbnail: { url: track.thumbnail },
	};
	return data;
}

/**
 * Creates an embed for the queue.
 *
 * @param {MediaTrack} current - The current track.
 * @param {MediaTrack[]} tracks - The tracks in the queue.
 * @param {number} page - *Optional* The page to show.
 * @returns {EmbedBuilder} - Returns the embed.
 */
function createQueueEmbed(current: MediaTrack, tracks: MediaTrack[], page?: number): EmbedBuilder {
	const embed = new EmbedBuilder().setColor(0x0066ff).setTitle('Queue');
	if (page === undefined) page = 0;
	const queue = tracks.slice(page * 10, page * 10 + 10);
	let description = `Currently playing: ${current.title}\n\n`;
	for (let i = 0; i < queue.length; i++) {
		description += `${i + 1}. ${queue[i].title}\n`;
	}
	let max = Math.ceil(tracks.length / 10);
	if (max === 0) max = 1;
	embed.setDescription(description);
	embed.setFooter({ text: `Page ${page + 1} of ${max}` });
	return embed;
}

/**
 * Creates an overview of all provided commands.
 *
 * @param {Command[]} commands - Array of commands.
 * @returns {EmbedBuilder} - Returns the embed.
 */
function createCommandOverviewEmbed(commands: Command[]): EmbedBuilder {
	const embed = new EmbedBuilder().setColor(0x0066ff).setTitle('Command Overview');
	let description = 'Music Player\n';
	for (const command of commands) {
		description += `/${command.help.name}\n`;
	}
	embed.setDescription(description);

	return embed;
}

/**
 * Creates an embed for a command help.
 *
 * @param {Command} command - The command to create the help embed for.
 * @returns {EmbedBuilder} - Returns the embed.
 */
function createCommandHelpEmbed(command: Command): EmbedBuilder {
	const embed = new EmbedBuilder().setColor(0x0066ff).setTitle(`Help for /${command.help.name}`);
	let description = '';
	description += `**Description:**\n${command.help.description}\n\n`;
	description += `**Arguments:**\n${command.help.arguments}\n\n`;
	description += `**Usage:**\n${command.help.usage}`;
	embed.setDescription(description);

	return embed;
}

/**
 * Creates an embed for the music player help.
 *
 * @returns {EmbedBuilder} - Returns the embed.
 */
function createMusicPlayerHelpEmbed(): EmbedBuilder {
	const description: string =
		'**Description:**\nThe Music Player is a unique way of giving the Music Bot a visual interface and some controlability via reactions.\nThe Bot wont play any age restricted or private videos/playlists on YouTube\n\n' +
		'**Chat Commands:** *just type in the channel*\n' +
		'v, vol, volume and a number from 1-100\n' +
		'- changes the volume\n' +
		'- example: v50\n\n' +
		'+ and the string to search for\n' +
		'- searches for the given string on youtube\n' +
		'- example: +rick roll\n\n' +
		'just throw in a link\n' +
		'- any link from YouTube or media that contains audio, like a webm, avi, mov ..., can be played via the bot\n' +
		'- example: https://www.youtube.com/watch?v=dQw4w9WgXcQ';
	const fields: APIEmbedField[] = [
		{
			name: '🎶',
			value: 'Sends you the link of the currently playing song via DM. *Wont work if your DMs are closed or friends only*',
		},
		{
			name: '⏯️',
			value: 'Pauses or resumes the current song',
		},
		{
			name: '⏭️',
			value: 'Skips to the next song',
		},
		{
			name: '⏹️',
			value: 'Stops the current song and clears the queue',
		},
		{
			name: '🔂',
			value: 'Toggles repeating the current song',
		},
		{
			name: '🔁',
			value: 'Toggles repeating all songs in the queue',
		},
		{
			name: '⏏️',
			value: 'Stops the playback and leaves the VC',
		},
	];

	const embed = new EmbedBuilder().setTitle('Help for the Music Player').setDescription(description).addFields(fields).setColor(0x0066ff);

	return embed;
}

export {
	createBasicPlayerEmbed,
	createEmbedDataFromTrack,
	createPlayerEmbed,
	createQueueEmbed,
	createCommandOverviewEmbed,
	createCommandHelpEmbed,
	createMusicPlayerHelpEmbed,
};
