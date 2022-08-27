import User from "../../schemas/User";
import Eris, { Member } from "eris";
import { BCommand } from "../../structures/Command";

import { CanvasTable, CTColumn, CTConfig, CTData, CTOptions } from "canvas-table";
import { createCanvas } from "canvas";
import { bot } from "../..";

export default new BCommand({
	name: "leaderboard-ranked",
	description: "Get all the players from best elo to worst from Ranked Games",
	type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT,

	run: async ({ interaction }) => {
		var users = await User.find().where("suspended").ne(true).select("discordID elorating lbpos gamehistory wins gamesPlayed");

		users = users.filter((user) => user.gamehistory.length > 0);

		if (!(users.length > 0))
			return interaction.createMessage({
				embeds: [
					{
						title: "No Leader-Board Data Found!",
						description:
							"There are currently no people with any games played to show on the leader-board.\nMaybe play some games first?",
						color: 0xfc0303,
					},
				],
			});

		users = users.sort((a, b) => b.elorating - a.elorating);
		users = users.slice(0, 9); // Truncated for LB design reasons.

		const data: CTData = [];

		const usernames: Member[] = await bot.guilds
			.get(interaction.guildID)
			.fetchMembers({ userIDs: users.map((u) => u.discordID) });

		console.log(usernames.length);

		for (let i = 0; i < users.length; i++) {
			const user = users[i];
			const fndUser = usernames.find((u) => u.user.id === user.discordID);
			const username = fndUser.username ?? fndUser.user.username;

			const winrate = `${((user.wins / user.gamesPlayed) * 100).toFixed(0)}%`;
			data.push([user.lbpos.toString(), username, user.elorating.toString(), winrate]);
		}

		const columns: CTColumn[] = [
			{
				title: "#",
				options: { color: "#ffffff", textAlign: "center" },
			},
			{
				title: "Player Username",
				options: { color: "#ffffff", textAlign: "left" },
			},
			{ title: "ELO Rating", options: { color: "#ffffff", textAlign: "right" } },
			{ title: "Win %", options: { color: "#ffffff", textAlign: "center" } },
		];

		const options: CTOptions = {
			background: "#1e2124",
			fit: true,
			title: {
				text: "Team Necro Ranked Leaderboard",
				color: "#ffffff",
			},
			header: {
				color: "#ffffff",
			},
			borders: {
				column: undefined,
				header: { width: 2, color: "#555" }, // set to false to hide the header
				row: { width: 2, color: "#555" },
			},
		};

		const canvas = createCanvas(400, 300);
		const config: CTConfig = { columns, data, options };
		const ct = new CanvasTable(canvas, config);
		await ct.generateTable();

		const fileToSend: Eris.FileContent = {
			name: "Ranked Leaderboard.png",
			file: await ct.renderToBuffer(),
		};

		interaction.createMessage({ content: "Here is the current leaderboard for private ranked games:" }, fileToSend);
	},
});
