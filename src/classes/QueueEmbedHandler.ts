import {
	APIActionRowComponent,
	APIMessageActionRowComponent,
	ChatInputCommandInteraction,
	EmbedBuilder,
	InteractionResponse,
} from 'discord.js';
import { createQueueEmbed } from '../utils/embeds';
import { getActionRow, page_components } from '../utils/components';
import PlayerManager from './PlayerManager';

export default class QueueEmbedHandler {
	public playerManager: PlayerManager;
	public interaction: ChatInputCommandInteraction;
	public page: number;
	public lastEmbed: EmbedBuilder | null = null;
	constructor(playerManager: PlayerManager, interaction: ChatInputCommandInteraction, page: number) {
		this.playerManager = playerManager;
		this.interaction = interaction;
		this.page = page;
	}

	public async createEmbed(): Promise<void> {
		this.lastEmbed = createQueueEmbed(this.playerManager.current!, this.playerManager.queue, this.page);
		const pageComponents = getActionRow(page_components());
		const reply = await this.interaction.reply({
			embeds: [this.lastEmbed],
			components: this.playerManager.queue.length > 10 ? [pageComponents] : [],
		});

		this.listenForNavigation(reply, pageComponents);
	}

	public async listenForNavigation(
		reply: InteractionResponse,
		pageComponents: APIActionRowComponent<APIMessageActionRowComponent>
	): Promise<void> {
		try {
			const navigation = await reply.awaitMessageComponent({
				filter: (i) => i.user.id === this.interaction.user.id,
				time: 300000,
			});
			if (navigation.customId === 'prev') {
				if (this.page > 0) {
					this.page--;
				} else {
					let max = Math.ceil(this.playerManager.queue.length / 10) - 1;
					if (max === -1) max = 0;
					this.page = max;
				}
				this.lastEmbed = createQueueEmbed(this.playerManager.current!, this.playerManager.queue, this.page);
				await navigation.update({ embeds: [this.lastEmbed], components: this.playerManager.queue.length > 10 ? [pageComponents] : [] });
				this.listenForNavigation(reply, pageComponents);
			}
			if (navigation.customId === 'next') {
				if (this.page < Math.ceil(this.playerManager.queue.length / 10) - 1) {
					this.page++;
				} else {
					this.page = 0;
				}
				this.lastEmbed = createQueueEmbed(this.playerManager.current!, this.playerManager.queue, this.page);
				await navigation.update({ embeds: [this.lastEmbed], components: this.playerManager.queue.length > 10 ? [pageComponents] : [] });
				this.listenForNavigation(reply, pageComponents);
			}
		} catch (error) {
			this.interaction.editReply({ embeds: [this.lastEmbed!], components: [] });
		}
	}
}
