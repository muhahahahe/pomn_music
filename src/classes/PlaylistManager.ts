import {
	APIActionRowComponent,
	APIInteractionGuildMember,
	APIMessageActionRowComponent,
	ButtonInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
	InteractionResponse,
	StringSelectMenuInteraction,
} from 'discord.js';
import {
	add_component,
	back_component,
	getActionRow,
	page_components,
	removetrack_components,
	selectplaylist_components,
} from '../utils/components';
import { createPlaylistListEmbed, createPlaylistManageEmbed, createPlaylistViewEmbed } from '../utils/embeds';
import { MediaTrack, Playlist } from '../interfaces';
import { checkURL, getMediaFile, getMusicChannelMessage, getPlayerManager, getYoutube, writePlaylists } from '../utils/utils';
import Main from './Main';
import { createAddTrackModal } from '../utils/modals';

export default class PlaylistManager {
	private interaction: ChatInputCommandInteraction;
	private playlists: Playlist[] = require('../data/playlists.json');
	private guildPlaylists: Playlist[];
	private currentEmbed: EmbedBuilder = new EmbedBuilder();
	private currentActionRow: APIActionRowComponent<APIMessageActionRowComponent>[] = [];
	private currentPlaylists: Playlist[] = [];
	private currentPlaylist: Playlist | null = null;
	private currentTracks: MediaTrack[] = [];
	private currentPage: number = 1;
	public main: Main;

	constructor(main: Main, interaction: ChatInputCommandInteraction) {
		this.main = main;
		this.interaction = interaction;
		this.guildPlaylists = this.playlists.filter((playlist) => playlist.guildId === interaction.guildId);
	}

	private listenForList(reply: InteractionResponse): void {
		const collector = reply.createMessageComponentCollector({
			filter: (interaction) => interaction.user.id === this.interaction.user.id,
			time: 1_800_000 /* 30 minutes */,
		});

		collector.on('collect', (interaction) => {
			if (interaction.isButton()) {
				const i = interaction as ButtonInteraction;
				if (i.customId === 'prev') {
					if (this.currentPage === 1) {
						const max = Math.ceil(this.guildPlaylists.length / 10);
						this.currentPage = max;
					} else {
						this.currentPage--;
					}
				}

				if (i.customId === 'next') {
					if (this.currentPage === Math.ceil(this.guildPlaylists.length / 10)) {
						this.currentPage = 1;
					} else {
						this.currentPage++;
					}
				}

				if (i.customId === 'back') {
					this.currentPage = 1;
				}

				this.getPlaylistPage();
				i.update({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});
				return;
			}

			if (interaction.isStringSelectMenu()) {
				const i = interaction as StringSelectMenuInteraction;
				const playlist = this.currentPlaylists[Number(i.values[0])];
				if (!playlist) return;
				this.currentPage = 1;
				this.currentPlaylist = playlist;

				this.getTracksPage();
				i.update({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});
				return;
			}
		});
	}

	private listenForManage(reply: InteractionResponse): void {
		const collector = reply.createMessageComponentCollector({
			filter: (interaction) => interaction.user.id === this.interaction.user.id,
			time: 3_600_000 /* 1 hour */,
			dispose: true,
		});

		collector.on('collect', async (interaction) => {
			if (interaction.isButton()) {
				const i = interaction as ButtonInteraction;
				if (i.customId === 'prev') {
					if (this.currentPage === 1) {
						const max = Math.ceil(this.currentTracks.length / 25);
						this.currentPage = max;
					} else {
						this.currentPage--;
					}
					this.getPlaylistManage();
					i.update({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});
					return;
				}

				if (i.customId === 'next') {
					if (this.currentPage === Math.ceil(this.currentTracks.length / 25)) {
						this.currentPage = 1;
					} else {
						this.currentPage++;
					}
					this.getPlaylistManage();
					i.update({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});
					return;
				}

				if (i.customId === 'add') {
					const modal = createAddTrackModal();
					await i.showModal(modal);
					await i
						.awaitModalSubmit({ time: 300_000 /* 5 minutes */ })
						.then(async (mod) => {
							const url = mod.fields.getTextInputValue('url').trim();
							const check = await checkURL(url);
							let track: MediaTrack | string = 'Could not resolve url!';
							if (check === 'youtube') {
								track = await getYoutube(url, this.interaction.user);
							}
							if (check === 'media') {
								track = await getMediaFile(url, this.interaction.user);
							}
							if (typeof track === 'string') {
								mod.reply({ content: track, ephemeral: true });
								return;
							}

							this.currentPlaylist!.tracks.push(track);
							this.currentPage = Math.ceil(this.currentPlaylist!.tracks.length / 25);
							this.currentTracks = this.currentPlaylist!.tracks.slice((this.currentPage - 1) * 25, this.currentPage * 25 - 1);
							this.getPlaylistManage();
							mod.reply({ content: `Added *${track.title}* to the playlist!`, ephemeral: true });
							this.interaction.editReply({ embeds: [this.currentEmbed], components: this.currentActionRow });
						})
						.catch(() => {});
					this.playlists = this.playlists.filter((p) => p.name === this.currentPlaylist!.name);
					this.playlists.push(this.currentPlaylist!);
					writePlaylists(this.playlists);
					return;
				}
			}

			if (interaction.isStringSelectMenu()) {
				const i = interaction as StringSelectMenuInteraction;
				const track = this.currentTracks[Number(i.values[0])];
				if (!track) return;
				this.currentPlaylist!.tracks = this.currentPlaylist!.tracks.filter((t) => t.title !== track.title);
				this.currentPage = this.currentPage > Math.ceil(this.currentPlaylist!.tracks.length / 25) ? this.currentPage-- : this.currentPage;
				this.currentTracks = this.currentPlaylist!.tracks.slice((this.currentPage - 1) * 25, this.currentPage * 25 - 1);
				this.getPlaylistManage();
				i.update({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});
				this.playlists = this.playlists.filter((p) => p.name === this.currentPlaylist!.name);
				this.playlists.push(this.currentPlaylist!);
				writePlaylists(this.playlists);
				return;
			}
		});
	}

	private getPlaylistPage(): void {
		this.currentActionRow = [];
		this.currentPlaylist = null;
		this.currentPlaylists = this.guildPlaylists.slice((this.currentPage - 1) * 10, this.currentPage * 10 - 1);
		this.currentEmbed = createPlaylistListEmbed(this.currentPlaylists);
		if (this.currentPlaylists.length > 10) this.currentActionRow.push(getActionRow(page_components()));
		this.currentActionRow.push(getActionRow([selectplaylist_components(this.currentPlaylists.map((p) => p.name))]));
	}

	private getTracksPage(): void {
		this.currentPlaylists = [];
		this.currentActionRow = [];
		this.currentTracks = this.currentPlaylist!.tracks.slice((this.currentPage - 1) * 25, this.currentPage * 25 - 1);
		this.currentEmbed = createPlaylistViewEmbed(this.currentPlaylist!.name, this.currentTracks, (this.currentPage - 1) * 25);
		if (this.currentTracks.length > 25) {
			this.currentActionRow.push(getActionRow([...page_components(), ...back_component()]));
		} else {
			this.currentActionRow.push(getActionRow(back_component()));
		}
	}

	private getPlaylistManage(): void {
		this.currentActionRow = [];
		this.currentTracks = this.currentPlaylist!.tracks.slice((this.currentPage - 1) * 25, this.currentPage * 25 - 1);
		this.currentEmbed = createPlaylistManageEmbed(this.currentPlaylist!.name, this.currentTracks, (this.currentPage - 1) * 25);
		if (this.currentTracks.length > 25) {
			this.currentActionRow.push(getActionRow([...add_component(), ...page_components()]));
		} else {
			this.currentActionRow.push(getActionRow(add_component()));
		}
		if (this.currentTracks.length > 0) {
			this.currentActionRow.push(getActionRow([removetrack_components(this.currentTracks.map((t) => t.title))]));
		}
	}

	public create(name: string, description: string): void {
		if (this.playlists.find((playlist) => playlist.name === name)) {
			this.interaction.reply({ content: `A playlist with the name: ${name}, already exists!`, ephemeral: true }).catch(() => {});
			return;
		}
		const data: Playlist = {
			guildId: this.interaction.guildId!,
			userId: this.interaction.user.id,
			name: name,
			description: description,
			tracks: [],
		};
		this.playlists.push(data);
		writePlaylists(this.playlists);

		this.interaction.reply({ content: `Playlist *${name}* created!`, ephemeral: this.main.config.silent_mode }).catch(() => {});
	}

	public remove(name: string): void {
		const playlist = this.playlists.find((playlist) => playlist.name === name && playlist.guildId === this.interaction.guildId!);
		if (!playlist) {
			this.interaction.reply({ content: 'A playlist with that name does not exist!', ephemeral: true }).catch(() => {});
			return;
		}
		if (playlist.userId !== this.interaction.user.id) {
			if (!this.interaction.memberPermissions?.has('Administrator', true)) {
				this.interaction.reply({ content: 'You do not have permission to remove this playlist!', ephemeral: true }).catch(() => {});
				return;
			}
		}

		this.playlists = this.playlists.filter((p) => p !== playlist);
		writePlaylists(this.playlists);

		this.interaction.reply({ content: `Playlist *${playlist.name}* removed!`, ephemeral: this.main.config.silent_mode }).catch(() => {});
	}

	public async list(): Promise<void> {
		this.currentPlaylists = this.playlists.filter((playlist) => playlist.guildId === this.interaction.guildId);
		if (this.currentPlaylists && this.currentPlaylists.length === 0) {
			this.interaction.reply({ content: 'No playlists created yet!', ephemeral: true }).catch(() => {});
			return;
		}
		if (this.currentPlaylists.length > 10) {
			this.currentActionRow.push(getActionRow(page_components()));
		}
		this.getPlaylistPage();

		const reply = await this.interaction.reply({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});

		if (!reply) return;
		this.listenForList(reply);
	}

	public async manage(name: string): Promise<void> {
		const playlist = this.playlists.find((playlist) => playlist.name === name && playlist.guildId === this.interaction.guildId!);
		if (!playlist) {
			this.interaction.reply({ content: 'A playlist with that name does not exist!', ephemeral: true }).catch(() => {});
			return;
		}
		if (playlist.userId !== this.interaction.user.id) {
			if (!this.interaction.memberPermissions?.has('Administrator', true)) {
				this.interaction.reply({ content: 'You do not have permission to manage this playlist!', ephemeral: true }).catch(() => {});
				return;
			}
		}
		this.currentPlaylist = playlist;
		this.getPlaylistManage();

		const reply = await this.interaction.reply({ embeds: [this.currentEmbed], components: this.currentActionRow }).catch(() => {});
		if (!reply) return;
		this.listenForManage(reply);
	}

	public async play(name: string): Promise<void> {
		const playlist = this.playlists.find((playlist) => playlist.name === name && playlist.guildId === this.interaction.guildId!);
		if (!playlist) {
			this.interaction.reply({ content: 'A playlist with that name does not exist!', ephemeral: true }).catch(() => {});
			return;
		}
		if (playlist.tracks.length === 0) {
			this.interaction.reply({ content: 'This playlist is empty!', ephemeral: true }).catch(() => {});
			return;
		}
		const musicMessage = await getMusicChannelMessage(this.interaction.guildId!, this.main);
		let member: GuildMember | APIInteractionGuildMember = this.interaction.member!;
		try {
			member = await this.interaction.guild!.members.fetch(member.user.id)!;
		} catch (error) {
			return;
		}
		const playerManager = getPlayerManager(member, this.main, musicMessage);
		if (typeof playerManager === 'string') {
			this.interaction.reply({ content: playerManager, ephemeral: true });
			return;
		}
		playlist.tracks.forEach((track) => {
			playerManager.addTrack(track);
		});
		if (playerManager.isStopped()) playerManager.play();
		this.interaction.reply({ content: `Playing playlist *${playlist.name}*!`, ephemeral: this.main.config.silent_mode });
	}
}
