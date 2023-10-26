import { EmbedBuilder, Message } from 'discord.js';
import { MediaTrack, PlayerState } from '../interfaces';
import { createBasicPlayerEmbed, createEmbedDataFromTrack, createPlayerEmbed } from '../utils/embeds';

export default class PlayerEmbedHandler {
	public message: Message;
	public current: EmbedBuilder | null = null;
	constructor(message: Message) {
		this.message = message;
	}

	public updateEmbed(track: MediaTrack, state: PlayerState, next?: MediaTrack): void {
		this.current = createPlayerEmbed(createEmbedDataFromTrack(track, state, next));
		this.message.edit({ embeds: [this.current] });
	}

	public basicEmbed(): void {
		this.current = createBasicPlayerEmbed();
		this.message.edit({ embeds: [this.current] });
	}

	public info(infoText: string): void {
		if (!this.current) return;
		const embed = this.current.setFooter({ text: infoText });
		this.message.edit({ embeds: [embed] });
	}
}
