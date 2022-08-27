import RankedGame from "../../schemas/RankedGame";
import { BCommand } from "../../structures/Command";
import makeTeams from "../../functions/teamsGenerator";

import Eris from "eris";

export default new BCommand({
	name: "fixed-ranked-game",
	description: "PREMADE RANKED GAME - ADMIN ONLY COMMAND",
	type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT,
	options: [
		{
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			name: "team-a",
			description: "Enter all the players that you want to add to the game.",
			required: true,
		},
		{
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			name: "team-b",
			description: "Enter all the players that you want to add to the game.",
			required: true,
		},
	],

	run: async ({ interaction }) => {
		const teamA = [
			...new Set(
				interaction.data.options
					.find((o) => o.name === "team-a")
					.value.toString()
					.match(/<@!?\d*>/g)
			),
		];

		const teamB = [
			...new Set(
				interaction.data.options
					.find((o) => o.name === "team-b")
					.value.toString()
					.match(/<@!?\d*>/g)
			),
		];

		//* --- THIS MAKES THE TEAMS - MOST IMPORTANT PART! --- !//
		const { gameMap, gameRef, selectedmapimage, bannedAgents } = makeTeams(["a"], true);

		new RankedGame({
			gameMap,
			gameRef,
			teamA,
			teamB,
			scoreSubmitted: false,
		}).save();

		const bannedAgentsString = bannedAgents.length ? bannedAgents.join(", ") : "No banned agents!";

		await interaction.createMessage({
			embeds: [
				{
					title: `A **Ranked** Game Has Been Generated On ${gameMap}!`,
					description: `**This game __will__ affect ELO rating scores.**\nGood luck, and may the best team win!`,
					color: 0x09ff00,
					fields: [
						{
							name: `Team A (T → CT):`,
							value: `${teamA.join("\n")}`,
							inline: true,
						},
						{
							name: `Team B (CT → T):`,
							value: `${teamB.join("\n")}`,
							inline: true,
						},
						{
							name: `Game ID (To submit scores)`,
							value: `${gameRef}`,
							inline: false,
						},
						{
							name: `Banned Agents:`,
							value: `${bannedAgentsString}`,
							inline: false,
						},
					],
					image: {
						url: `${selectedmapimage}`,
					},
				},
			],
		});
	},
});
