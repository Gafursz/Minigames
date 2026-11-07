export interface LeaderboardPlayer {
  rank: number;
  playerName: string;
  gamesPlayed: number;
  totalScore: number;
  streakDays: number;
  favoriteGameSlug: string;
  favoriteGameName: string;
}

export interface LeaderboardData {
  data: LeaderboardPlayer[];
  meta: {
    totalItems: number;
    description: string;
  };
}
