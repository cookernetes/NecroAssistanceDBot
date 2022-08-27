import mongoose from "mongoose";

export interface IRankedGame {
	gameRef: string;
	teamA: string[];
	teamB: string[];
	gameMap: string;
	scoreSubmitted: boolean;
}

const rankedGameSchema = new mongoose.Schema<IRankedGame>({
	gameRef: String,
	teamA: [String],
	teamB: [String],
	gameMap: String,
	scoreSubmitted: Boolean,
});

export default mongoose.model<IRankedGame>("RankedGame", rankedGameSchema);
