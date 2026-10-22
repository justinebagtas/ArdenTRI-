(() => {
  'use strict';

  // Shortcuts for selecting HTML elements.
  const $ = (selector) => document.querySelector(selector); const $$ = (selector) => [...document.querySelectorAll(selector)];

  // Get the screens used by the application.
  const screens = {
    welcome: $('#welcomeScreen'),
    setup: $('#setupScreen'),
    teams: $('#teamsScreen'),
    tournament: $('#tournamentScreen')
  };

  // Create the tournament manager.
  const manager = new TournamentManager();

  // Store information about the current tournament and interface.
  const state = {
    tournamentName: '',
    sportName: 'Basketball',
    teamSize: 4,
    teamNames: [],
    activeTab: 'bracket',
    pendingAction: null,
    toastTimer: null
  };

  const teamFields = $('#teamFields');
  const teamMessage = $('#teamMessage');

  // Show one screen and hide the others.
  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => {
      const isActive = key === name;
      element.hidden = !isActive;
      element.classList.toggle('active', isActive);
    });

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Get the selected number of teams.
  function selectedSize() {
    const selected = $('input[name="teamSize"]:checked');
    return Number(selected?.value || 4);
  }

  // Get the selected sport or custom sport name.
  function selectedSport() {
    const selected = $('input[name="sport"]:checked');
    const sport = selected?.value || 'Basketball';

    if (sport !== 'Other') {
      return sport;
    }

    return $('#customSportName').value.trim();
  }

  // Show or hide the custom sport input.
  function updateCustomSportField() {
    const selected = $('input[name="sport"]:checked');
    const isOther = selected?.value === 'Other';

    $('#customSportField').hidden = !isOther;
    $('#customSportName').required = isOther;

    if (isOther) {
      $('#customSportName').focus();
    }
  }

  // Create the input fields for team names.
  function renderTeamFields(names = []) {
    teamFields.replaceChildren();

    for (let i = 0; i < state.teamSize; i++) {
      const wrapper = document.createElement('label');
      wrapper.className = 'team-field';

      const number = document.createElement('span');
      number.className = 'team-index';
      number.textContent = String(i + 1).padStart(2, '0');

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 50;
      input.autocomplete = 'off';
      input.placeholder = `Enter team ${i + 1} name`;
      input.setAttribute('aria-label', `Team ${i + 1} name`);
      input.value = names[i] || '';

      // Save changes whenever a team name is edited.
      input.addEventListener('input', () => {
        state.teamNames[i] = input.value;
        teamMessage.textContent = '';
      });

      wrapper.append(number, input);
      teamFields.append(wrapper);
    }

    $('#teamCountBadge').textContent = `${String(state.teamSize).padStart(2, '0')} TEAMS`;
    $('#teamCountLabel').textContent = `${state.teamSize} TEAM NAMES`;
  }

  // Display a message below the team input fields.
  function showTeamMessage(message, tone = 'muted') {
    teamMessage.textContent = message;
    teamMessage.dataset.tone = tone;
  }

  // Fill all fields with default team names.
  function quickFillNames() {
    state.teamNames = [];

    for (let i = 0; i < state.teamSize; i++) {
      state.teamNames.push(`Team ${i + 1}`);
    }

    renderTeamFields(state.teamNames);
    showTeamMessage('Default team names added. You can still edit each one.', 'green');
  }

  // Clear all team names.
  function clearNames() {
    state.teamNames = Array(state.teamSize).fill('');
    renderTeamFields(state.teamNames);
    showTeamMessage('All team names cleared.', 'muted');
    teamFields.querySelector('input')?.focus();
  }

  // Check that every team has a unique, nonempty name.
  function validateNames() {
    const inputs = [...teamFields.querySelectorAll('input')];
    const names = inputs.map((input) => input.value.trim());

    // Check for missing team names.
    const emptyIndex = names.findIndex((name) => !name);

    if (emptyIndex !== -1) {
      showTeamMessage(`Please enter a name for Team ${emptyIndex + 1}.`, 'rust');
      inputs[emptyIndex].focus();
      return null;
    }

    // Check for duplicate team names.
    const seenNames = new Set();

    for (let i = 0; i < names.length; i++) {
      const name = names[i].toLocaleLowerCase();

      if (seenNames.has(name)) {
        showTeamMessage(`Team names must be unique. Check “${names[i]}”.`, 'rust');
        inputs[i].focus();
        return null;
      }

      seenNames.add(name);
    }

    return names;
  }

  // Show a temporary notification.
  function showToast(message) {
    const toast = $('#toast');

    toast.textContent = message;
    toast.classList.add('visible');

    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
    }

    state.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }

  // Ask the user to confirm an important action.
  function askConfirmation(title, message, action, confirmLabel = 'Confirm') {
    const dialog = $('#confirmDialog');

    $('#dialogTitle').textContent = title;
    $('#dialogMessage').textContent = message;
    $('#dialogConfirm').textContent = confirmLabel;

    state.pendingAction = action;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else if (window.confirm(`${title}\n\n${message}`)) {
      const callback = state.pendingAction;
      state.pendingAction = null;
      callback?.();
    }
  }

  // Run the confirmed action when the dialog closes.
  $('#confirmDialog').addEventListener('close', () => {
    if ($('#confirmDialog').returnValue === 'confirm') {
      const callback = state.pendingAction;
      state.pendingAction = null;
      callback?.();
    } else {
      state.pendingAction = null;
    }
  });

  // Validate the input and create a new tournament.
  function startTournament() {
    const names = validateNames();

    if (!names) {
      return;
    }

    const sportName = selectedSport();

    if (!sportName) {
      showScreen('setup');
      $('#customSportName').focus();
      showToast('Please enter your custom sport name.');
      return;
    }

    try {
      manager.startTournament(state.teamSize, names);

      state.teamNames = names;
      state.tournamentName = $('#tournamentName').value.trim() || 'Ardentri Tournament';
      state.sportName = sportName;
      state.activeTab = 'bracket';

      renderTournament();
      showScreen('tournament');
      showTab('bracket');
    } catch (error) {
      showTeamMessage(error.message, 'rust');
    }
  }

  // Switch between the tournament tabs.
  function showTab(name) {
    state.activeTab = name;

    $$('.tab').forEach((tab) => { const isActive = tab.dataset.tab === name; tab.classList.toggle('active', isActive); tab.setAttribute('aria-selected', String(isActive)); });      $$
('.tab-panel').forEach((panel) => {
      const isActive = panel.id === `${name}Panel`;
      panel.hidden = !isActive;
      panel.classList.toggle('active', isActive);
    });

    if (name === 'bracket') {
      renderBracket();
    }

    if (name === 'history') {
      renderHistory();
    }
  }

  // Update the tournament heading, progress, and match information.
  function renderTournament() {
    const tree = manager.getTree();

    $('#tournamentHeading').textContent = state.tournamentName;
    $('#tournamentSubtitle').textContent = `${state.sportName} · ${tree.size}-team single-elimination tournament`;
    $('#progressLabel').textContent = tree.getProgress();

    const completedMatches = tree.getCompletedMatches();
    const totalMatches = tree.getTotalMatches();

    $('#progressFill').style.width = `${(completedMatches / totalMatches) * 100}%`;
    $('#undoButton').disabled = manager.history.length === 0;
    $('#historyCount').textContent = String(manager.history.length);

    renderBracket();
    renderHistory();
  }

  // Get the name of a round from its tree depth.
  function roundTitle(index, tree) {
    const depth = Math.floor(Math.log2(index));

    if (depth === 0) return 'FINAL';
    if (depth === 1) return 'SEMIFINALS';
    if (depth === 2) return 'QUARTERFINALS';
    if (depth === 3) return 'ROUND OF 16';

    return `ROUND OF ${tree.size / (2 ** (depth - 1))}`;
  }

  // Calculate a node's depth in the binary tree.
  function nodeDepth(index) {
    return Math.floor(Math.log2(index));
  }

  // Calculate the horizontal position of a node.
  function nodeX(index, tree) {
    return 22 + (tree.getHeight() - nodeDepth(index)) * 250;
  }

  // Get the width of a team card or match card.
  function nodeWidth(index, tree) {
    if (tree.isLeaf(index)) {
      return 184;
    }
    return 216;
  }

  // Calculate the vertical center of a node.
  function nodeCenterY(index, tree) {
    const depth = nodeDepth(index);
    const nodesAtDepth = 2 ** depth;
    const leavesPerNode = tree.size / nodesAtDepth;
    const firstLeafOffset = (index - nodesAtDepth) * leavesPerNode;

    return 54 + (firstLeafOffset + leavesPerNode / 2) * 80;
  }

  // Check whether a connection belongs to the winner's path.
  function edgeIsWinnerPath(tree, childIndex, parentIndex) {
    if (tree.isLeaf(childIndex)) {
      return (
        tree.isMatchCompleted(parentIndex) &&
        tree.getWinner(parentIndex) === tree.getNode(childIndex).value
      );
    }

    return tree.isMatchCompleted(childIndex);
  }

  // Draw the tournament bracket and its match cards.
  function renderBracket() {
    if (!manager.tree) {
      return;
    }

    const tree = manager.getTree();
    const canvas = $('#bracketCanvas');

    canvas.replaceChildren();

    const rounds = tree.getHeight() + 1;
    const completed = tree.isTournamentComplete();

    const canvasWidth = 42 + rounds * 250 + (completed ? 250 : 0);
    const canvasHeight = 92 + tree.size * 80;

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Create the headings for each round.
    const headings = [{ x: 22, text: 'TEAMS' }];

    for (let depth = tree.getHeight() - 1; depth >= 0; depth--) {
      const index = 2 ** depth;
      headings.push({
        x: nodeX(index, tree),
        text: roundTitle(index, tree)
      });
    }

    if (completed) {
      headings.push({
        x: nodeX(1, tree) + 250,
        text: 'CHAMPION'
      });
    }

    headings.forEach((item) => {
      const label = document.createElement('div');
      label.className = 'round-heading';
      label.style.left = `${item.x}px`;
      label.textContent = item.text;
      canvas.append(label);
    });

    // Create the SVG used to draw the bracket connections.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bracket-lines');
    svg.setAttribute('width', String(canvasWidth));
    svg.setAttribute('height', String(canvasHeight));
    svg.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
    svg.setAttribute('aria-hidden', 'true');

    // Connect each parent node to its two child nodes.
    for (let parent = 1; parent < tree.size; parent++) {
      const children = [parent * 2, parent * 2 + 1];

      children.forEach((child) => {
        const childX = nodeX(child, tree) + nodeWidth(child, tree);
        const parentX = nodeX(parent, tree);
        const childY = nodeCenterY(child, tree);
        const parentY = nodeCenterY(parent, tree);
        const middleX = childX + (parentX - childX) / 2;
        const highlighted = edgeIsWinnerPath(tree, child, parent);

        const lines = [
          [childX, childY, middleX, childY],
          [middleX, childY, middleX, parentY],
          [middleX, parentY, parentX, parentY]
        ];

        lines.forEach(([x1, y1, x2, y2]) => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);
          line.setAttribute('class', highlighted ? 'tree-edge winner-path-edge' : 'tree-edge');
          svg.append(line);
        });
      });
    }

    canvas.append(svg);

    // Display the team leaves at indices N through 2N - 1.
    for (let index = tree.size; index <= tree.getNumNodes(); index++) {
      const node = tree.getNode(index);
      const card = document.createElement('article');
      card.className = 'team-leaf-card';

      card.style.left = `${nodeX(index, tree)}px`;
      card.style.top = `${nodeCenterY(index, tree) - 31}px`;

      const label = document.createElement('span');
      label.className = 'team-leaf-label';
      label.textContent = `TEAM ${String(index - tree.size + 1).padStart(2, '0')}`;

      const name = document.createElement('strong');
      name.className = 'team-leaf-name';
      name.textContent = node.value;

      card.append(label, name);
      canvas.append(card);
    }

    // Create the match cards for all internal tree nodes.
    for (let index = 1; index < tree.size; index++) {
      const node = tree.getNode(index);
      const card = document.createElement('article');
      card.className = 'match-card';

      if (node.completed) {
        card.classList.add('completed-card');
      }

      card.style.left = `${nodeX(index, tree)}px`;
      card.style.top = `${nodeCenterY(index, tree) - 77}px`;

      const heading = document.createElement('div');
      heading.className = 'match-heading';
      heading.textContent = `${roundTitle(index, tree).replace(/S$/, '')} · Match ${index}`;

      const status = document.createElement('span');
      status.className = 'status-pill';

      if (node.completed) {
        status.classList.add('status-completed');
        status.textContent = 'COMPLETED';
      } else if (tree.isMatchReady(index)) {
        status.classList.add('status-ready');
        status.textContent = 'READY TO PLAY';
      } else {
        status.classList.add('status-waiting');
        status.textContent = 'WAITING';
      }

      card.append(heading, status);

      const teams = tree.getCompetingTeams(index);

      if (node.completed) {
        const matchup = document.createElement('p');
        matchup.className = 'matchup-text';
        matchup.textContent = `${teams ? teams[0] : '—'} vs ${teams ? teams[1] : '—'}`;

        const winner = document.createElement('p');
        winner.className = 'winner-label';
        winner.textContent = `Winner: ${node.value}`;

        card.append(matchup, winner);
      } else if (!teams) {
        const waiting = document.createElement('p');
        waiting.className = 'waiting-copy';
        waiting.textContent = 'Waiting for the previous round to finish.';
        card.append(waiting);
      } else {
        const matchup = document.createElement('p');
        matchup.className = 'matchup-text';
        matchup.textContent = `${teams[0]} vs ${teams[1]}`;

        const buttons = document.createElement('div');
        buttons.className = 'winner-actions';

        teams.forEach((team) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'winner-button';
          button.textContent = `Select ${team}`;
          button.title = `Advance ${team} from this match`;

          button.addEventListener('click', () => {
            askConfirmation(
              'Confirm match winner',
              `Select ${team} as the winner? This result advances the team to its parent match.`,
              () => {
                try {
                  manager.recordWinner(index, team);
                  renderTournament();
                  showTab('bracket');
                  showToast(`${team} advances to the next round.`);

                  const currentTree = manager.getTree();
                  if (currentTree.isTournamentComplete()) {
                    showToast(`Tournament champion: ${currentTree.getChampion()}!`);
                  }
                } catch (error) {
                  showToast(error.message);
                }
              },
              'Select winner'
            );
          });

          buttons.append(button);
        });

        card.append(matchup, buttons);
      }

      canvas.append(card);
    }

    // Display the champion when every match is complete.
    const championResult = $('#championResult');
    championResult.hidden = !completed;
    championResult.replaceChildren();

    if (completed) {
      const championCard = document.createElement('div');
      championCard.className = 'champion-card';
      championCard.style.left = `${nodeX(1, tree) + 250}px`;
      championCard.style.top = `${nodeCenterY(1, tree) - 88}px`;

      const icon = document.createElement('div');
      icon.className = 'champion-icon';

      const trophy = document.createElement('img');
      trophy.src = 'ardentri-trophy.png';
      trophy.alt = 'Tournament Trophy';
      trophy.className = 'champion-trophy';
      icon.appendChild(trophy);

      const label = document.createElement('span');
      label.className = 'champion-heading';
      label.textContent = 'TOURNAMENT CHAMPION';

      const name = document.createElement('strong');
      name.className = 'champion-name';
      name.textContent = tree.getChampion();

      const tournament = document.createElement('span');
      tournament.className = 'champion-tournament-name';
      tournament.textContent = state.tournamentName;

      championCard.append(icon, label, name, tournament);
      canvas.append(championCard);

      const result = document.createElement('div');
      result.className = 'champion-summary';
      result.textContent = `${tree.getChampion()} has won ${state.tournamentName}!`;
      championResult.append(result);
    }
  }

  // Display completed matches, starting with the most recent.
  function renderHistory() {
    const list = $('#historyList');
    list.replaceChildren();

    const records = [...manager.getHistory()].reverse();

    if (records.length === 0) {
      list.append(
        makeEmpty(
          'No matches completed yet',
          'Select a winner in the Bracket tab to add the first result.'
        )
      );
      return;
    }

    records.forEach((record) => {
      const row = document.createElement('article');
      row.className = 'history-card';

      const top = document.createElement('div');
      top.className = 'history-card-top';

      const round = document.createElement('span');
      round.className = 'eyebrow';
      round.textContent = record.round;

      const matchNumber = document.createElement('span');
      matchNumber.className = 'history-match-number';
      matchNumber.textContent = `Match ${record.matchIndex}`;

      top.append(round, matchNumber);

      const matchup = document.createElement('h3');
      matchup.className = 'history-matchup';
      matchup.textContent = `${record.teamOne} vs ${record.teamTwo}`;

      const bottom = document.createElement('div');
      bottom.className = 'history-card-bottom';

      const winner = document.createElement('strong');
      winner.className = 'winner-label';
      winner.textContent = `Winner: ${record.winner}`;

      const time = document.createElement('span');
      time.className = 'muted-label';
      time.textContent = record.completedAt;

      bottom.append(winner, time);
      row.append(top, matchup, bottom);
      list.append(row);
    });
  }

  // Create a message for sections without any content.
  function makeEmpty(title, description) {
    const box = document.createElement('div');
    box.className = 'empty-state';

    const heading = document.createElement('h3');
    heading.textContent = title;

    const paragraph = document.createElement('p');
    paragraph.textContent = description;

    box.append(heading, paragraph);
    return box;
  }

  // Display the result of a team search.
  function renderSearchResult(query) {
    const result = manager.searchTeam(query);
    const panel = $('#searchResult');

    panel.replaceChildren();
    panel.hidden = false;

    const title = document.createElement('h3');
    title.textContent = result.found ? result.teamName : 'Team not found';

    const status = document.createElement('span');
    status.className = 'status-pill';

    if (result.status === 'Champion') {
      status.classList.add('status-completed');
    } else if (result.status === 'Eliminated') {
      status.classList.add('status-waiting');
    } else if (result.found) {
      status.classList.add('status-ready');
    } else {
      status.classList.add('status-waiting');
    }

    status.textContent = result.status;

    const details = document.createElement('p');
    details.textContent = result.details;

    panel.append(title, status, details);
  }

  // Event Listeners
  $('#beginButton').addEventListener('click', () => {
    showScreen('setup');
  });

  $('#brandHome').addEventListener('click', (event) => {
    event.preventDefault();

    if (manager.tree) {
      askConfirmation(
        'Return to welcome?',
        'Your current tournament remains in memory until you start a new one or reload the page.',
        () => showScreen('welcome'),
        'Go to welcome'
      );
    } else {
      showScreen('welcome');
    }
  });

  $('#setupBackButton').addEventListener('click', () => { showScreen('welcome'); });    $$('input[name="sport"]').forEach((input) => {
    input.addEventListener('change', updateCustomSportField);
  });

  $('#printBracketButton').addEventListener('click', () => {
    showTab('bracket');
    window.setTimeout(() => {
      window.print();
    }, 60);
  });

  $('#setupForm').addEventListener('submit', (event) => {
    event.preventDefault();

    state.teamSize = selectedSize();
    state.teamNames = Array(state.teamSize).fill('');

    renderTeamFields(state.teamNames);
    showTeamMessage('', 'muted');
    showScreen('teams');
  });

  $('#quickFillButton').addEventListener('click', quickFillNames);
  $('#clearNamesButton').addEventListener('click', clearNames);

  $('#teamsBackButton').addEventListener('click', () => {
    showScreen('setup');
  });

  $('#generateButton').addEventListener('click', startTournament);    $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
    });
  });

  $('#undoButton').addEventListener('click', () => {
    askConfirmation(
      'Undo the last match?',
      'The most recently recorded result will be removed. Earlier matches will remain unchanged.',
      () => {
        try {
          const record = manager.undoLastMatch();
          renderTournament();
          showTab('bracket');
          showToast(`Undid ${record.round.toLowerCase()}: ${record.winner} was removed as the winner.`);
        } catch (error) {
          showToast(error.message);
        }
      },
      'Undo match'
    );
  });

  $('#newTournamentButton').addEventListener('click', () => {
    askConfirmation(
      'Start a new tournament?',
      'This will clear the current bracket and match history.',
      () => {
        manager.clearTournament();

        state.tournamentName = '';
        state.sportName = 'Basketball';
        state.teamNames = [];
        state.teamSize = 4;

        $('#tournamentName').value = '';
        $('#customSportName').value = '';
        $('input[name="sport"][value="Basketball"]').checked = true;
        updateCustomSportField();
        $('input[name="teamSize"][value="4"]').checked = true;

        showScreen('setup');
      },
      'Start new tournament'
    );
  });

    $('#searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    renderSearchResult($('#teamSearchInput').value);
  });

  $('#exitButton').addEventListener('click', () => {
    askConfirmation(
      'Exit Ardentri?',
      'Are you sure you want to exit? You can close this browser tab after confirming.',
      () => {
        showToast('Thank you for using Ardentri! You can now close this browser tab.');
      },
      'Exit'
    );
  });
})();
