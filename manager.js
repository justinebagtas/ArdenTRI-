(function (root) {
  'use strict';

  class TournamentManager {
    constructor() {
      this.tree = null;
      this.history = [];
    }

    // Create a new tournament and register its teams.
    startTournament(size, teamNames) {
      const newTree = new root.TournamentTree(size);
      newTree.addTeams(teamNames);
      this.tree = newTree;
      this.history = [];
    }

    // Return the current tournament tree.
    getTree() {
      if (!this.tree) {
        throw new Error('Create a tournament first.');
      }
      return this.tree;
    }

    // Remove the current tournament and its match history.
    clearTournament() {
      this.tree = null;
      this.history = [];
    }

    // Return a copy of the match history.
    getHistory() {
      return this.history.slice();
    }

    // Record the winner of a match.
    recordWinner(matchIndex, winner) {
      const tree = this.getTree();
      const teams = tree.getCompetingTeams(matchIndex);

      if (!teams) {
        throw new Error('This match is not ready yet.');
      }

      const round = tree.getNode(matchIndex).round;

      // Save the winner in the tree.
      tree.setWinner(matchIndex, winner);

      // Save the match details in the history.
      const record = {
        matchIndex: matchIndex,
        round: round,
        teamOne: teams[0],
        teamTwo: teams[1],
        winner: winner,
        completedAt: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      };

      this.history.push(record);
    }

    // Undo the most recently recorded match.
    undoLastMatch() {
      if (this.history.length === 0) {
        throw new Error('There are no completed matches to undo.');
      }

      const lastIndex = this.history.length - 1;
      const record = this.history[lastIndex];

      // Remove the winner from the tree.
      this.getTree().undoWinner(record.matchIndex);

      // Remove the match from the history.
      this.history.pop();

      return record;
    }

    // Search for a team and check its current tournament status.
    searchTeam(query) {
      const searchName = String(query ?? '').trim();

      if (!searchName) {
        return this._notFound('Enter a team name to search.');
      }

      if (!this.tree) {
        return this._notFound('Create a tournament first.');
      }

      // Find the registered team without considering letter case.
      const allTeams = this.tree.getAllTeams();
      let actualName = null;

      for (let i = 0; i < allTeams.length; i++) {
        const teamName = allTeams[i];
        if (teamName && teamName.toLocaleLowerCase() === searchName.toLocaleLowerCase()) {
          actualName = teamName;
          break;
        }
      }

      if (!actualName) {
        return this._notFound('No team found with that name.');
      }

      const lowerName = actualName.toLocaleLowerCase();

      // Check whether the team won the entire tournament.
      if (this.tree.isTournamentComplete()) {
        const champion = this.tree.getChampion();
        if (lowerName === champion.toLocaleLowerCase()) {
          return {
            found: true,
            teamName: actualName,
            status: 'Champion',
            details: 'Won the final and the tournament.'
          };
        }
      }

      // Check whether the team has lost a completed match.
      for (let i = 0; i < this.history.length; i++) {
        const record = this.history[i];
        const teamOne = record.teamOne.toLocaleLowerCase();
        const teamTwo = record.teamTwo.toLocaleLowerCase();
        const winner = record.winner.toLocaleLowerCase();

        const playedMatch = lowerName === teamOne || lowerName === teamTwo;

        if (playedMatch && lowerName !== winner) {
          return {
            found: true,
            teamName: actualName,
            status: 'Eliminated',
            details: 'The team has lost a completed match.'
          };
        }
      }

      // Check whether the team has a match ready to play.
      for (let index = 1; index < this.tree.size; index++) {
        if (!this.tree.isMatchReady(index) || this.tree.isMatchCompleted(index)) {
          continue;
        }

        const teams = this.tree.getCompetingTeams(index);

        if (actualName === teams[0]) {
          return this._foundTeam(actualName, `Next opponent: ${teams[1]}`);
        }

        if (actualName === teams[1]) {
          return this._foundTeam(actualName, `Next opponent: ${teams[0]}`);
        }
      }

      // The team is still in the tournament but has no ready match.
      return this._foundTeam(actualName, 'Waiting for the other result(s) in its next match.');
    }

    // Return a result when a team cannot be found.
    _notFound(message) {
      return {
        found: false,
        teamName: '',
        status: 'Not found',
        details: message
      };
    }

    // Return a result for a team that is still competing.
    _foundTeam(teamName, details) {
      return {
        found: true,
        teamName: teamName,
        status: 'Still competing',
        details: details
      };
    }
  }

  root.TournamentManager = TournamentManager;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TournamentManager;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);