import { MessageReaction, SlashCommandBuilder, User, VoiceChannel } from 'discord.js';
import Main from './classes/Main';
import { AxiosResponse } from 'axios';

interface Config {
	player_embed: boolean;
	reg_commands: boolean;
	music_channels: MusicChannelData[];
	volume: VolumeData[];
}

interface MusicChannelData {
	guildId: string;
	channelId: string;
	messageId: string;
}

interface VolumeData {
	guildId: string;
	volume: number;
}

interface ResolvedReaction {
	reaction: MessageReaction;
	user: User;
}

interface MediaTrack {
	requester: User;
	voiceChannel: VoiceChannel;
	title: string;
	url: string;
	type: 'youtube' | 'soundcloud' | 'spotify' | 'media';
	durationInSec: number;
	thumbnail: string;
}

interface YoutubeApiItem {
	snippet: {
		title: string;
		resourceId: {
			videoId: string;
		};
		thumbnails: {
			default: {
				url: string;
			};
		};
	};
	contentDetails: {
		duration: string;
	};
}

interface PlayerState {
	connected: boolean;
	playing: boolean;
	paused: boolean;
	stopped: boolean;
	repeat: boolean;
	repeatAll: boolean;
	volume: number;
	idletime: number;
}

interface CommandHelp {
	name: string;
	description: string;
	arguments: string;
	usage: string;
}

interface Command {
	data: SlashCommandBuilder;
	help: CommandHelp;
	execute: (interaction: any, main: Main) => {};
}

export { Config, MusicChannelData, VolumeData, ResolvedReaction, MediaTrack, YoutubeApiItem, PlayerState, CommandHelp, Command };
