export const predictions = [];

export class Prediction {
  constructor(userId, matchId, teamAdvancing, exactResult) {
    this.id = Date.now().toString();
    this.userId = userId;
    this.matchId = matchId;
    this.teamAdvancing = teamAdvancing; // e.g. "USA"
    this.exactResult = exactResult; // e.g. "2-1"
    this.points = 0; // calculated later when match ends
  }
}
