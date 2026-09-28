/* ============================================================
   MSG 18: ADMIN — Tournament Management
   ============================================================ */

window.adminTourUnsub = null;

// ============================================================
// 1. CREATE TOURNAMENT
// ============================================================

function bindTourCreate() {
  var btn = document.getElementById('tour-create-btn');
  if (!btn || btn.dataset.boundTour === '1') return;
  btn.dataset.boundTour = '1';

  btn.addEventListener('click', async function () {
    var name = document.getElementById('tour-name').value.trim();
    var entryFee = parseFloat(document.getElementById('tour-entry-fee').value) || 0;
    var prizePool = parseFloat(document.getElementById('tour-prize-pool').value) || 100;
    var maxPlayers = parseInt(document.getElementById('tour-max-players').value) || 50;
    var startInMin = parseInt(document.getElementById('tour-start-in').value) || 60;
    var durationMin = parseInt(document.getElementById('tour-duration').value) || 60;
    var status = document.getElementById('tour-status').value;

    if (!name) { alert('Tournament name required'); return; }
    if (entryFee < 0) { alert('Entry fee must be >= 0'); return; }

    var now = Date.now();
    var startTime = now + startInMin * 60 * 1000;
    var endTime = startTime + durationMin * 60 * 1000;

    try {
      var tourId = 'tour_' + now;
      await setDoc(doc(db, "tournaments", tourId), {
        id: tourId,
        name: name,
        entryFee: entryFee,
        prizePool: prizePool,
        maxPlayers: maxPlayers,
        currentPlayers: 0,
        startTime: startTime,
        endTime: endTime,
        status: status,
        createdAt: new Date().toISOString(),
        createdBy: currentAdmin ? currentAdmin.email : 'admin'
      });

      console.log('[Admin] Tournament created:', tourId);
      alert('✅ Tournament "' + name + '" created!');

      // Clear form
      document.getElementById('tour-name').value = '';

    } catch (err) {
      console.error('[Admin] Create error:', err);
      alert('Error: ' + err.message);
    }
  });

  console.log('[Admin] Tournament create button bound');
}

// ============================================================
// 2. LOAD TOURNAMENTS LIST
// ============================================================

function loadAdminTournaments() {
  var list = document.getElementById('admin-tour-list');
  if (!list) return;

  list.innerHTML = '<p class="loading-text">Loading...</p>';

  if (window.adminTourUnsub) {
    try { window.adminTourUnsub(); } catch (e) {}
  }

  try {
    window.adminTourUnsub = onSnapshot(collection(db, "tournaments"), function (snap) {
      list.innerHTML = '';

      if (snap.empty) {
        list.innerHTML = '<p class="loading-text">No tournaments yet</p>';
        return;
      }

      var tours = [];
      snap.forEach(function (d) {
        tours.push({ id: d.id, ...d.data() });
      });

      tours.sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      tours.forEach(function (t) {
        list.appendChild(buildAdminTourItem(t));
      });
    }, function (err) {
      console.error('[Admin] Tour list error:', err.message);
      list.innerHTML = '<p class="loading-text">Error: ' + err.message + '</p>';
    });
  } catch (err) {
    console.error('[Admin] Tour listen error:', err.message);
  }
}

function buildAdminTourItem(t) {
  var div = document.createElement('div');
  div.className = 'tour-admin-item';

  var statusClass = t.status || 'upcoming';
  var entryFee = Number(t.entryFee) || 0;
  var prizePool = Number(t.prizePool) || 0;
  var currentPlayers = Number(t.currentPlayers) || 0;
  var maxPlayers = Number(t.maxPlayers) || 0;

  var startStr = t.startTime ? new Date(t.startTime).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '-';

  div.innerHTML =
    '<div class="tour-admin-header">' +
      '<div class="tour-admin-title">🏆 ' + (t.name || 'Unknown') + '</div>' +
      '<span class="tour-admin-badge ' + statusClass + '">' + statusClass.toUpperCase() + '</span>' +
    '</div>' +
    '<div class="tour-admin-info">' +
      '<span>Entry: <strong>$' + entryFee.toFixed(2) + '</strong></span>' +
      '<span>Prize: <strong>$' + prizePool.toFixed(2) + '</strong></span>' +
      '<span>Players: <strong>' + currentPlayers + ' / ' + maxPlayers + '</strong></span>' +
      '<span>Starts: <strong>' + startStr + '</strong></span>' +
    '</div>' +
    '<div class="tour-admin-actions">' +
      '<button class="btn-action tour-admin-tog" data-tid="' + t.id + '" data-action="toggle">' +
        (t.status === 'live' ? 'End' : (t.status === 'upcoming' ? 'Go Live' : 'Restart')) +
      '</button>' +
      '<button class="btn-action tour-admin-fin" data-tid="' + t.id + '" data-action="finish">Finish</button>' +
      '<button class="btn-action tour-admin-del" data-tid="' + t.id + '" data-action="delete">Delete</button>' +
    '</div>';

  return div;
}

// ============================================================
// 3. TOURNAMENT ACTIONS
// ============================================================

function bindTourListActions() {
  var list = document.getElementById('admin-tour-list');
  if (!list || list.dataset.actionsBound === '1') return;
  list.dataset.actionsBound = '1';

  list.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;

    var tid = btn.dataset.tid;
    var action = btn.dataset.action;

    if (action === 'toggle') {
      await toggleTournamentStatus(tid);
    } else if (action === 'finish') {
      await finishTournament(tid);
    } else if (action === 'delete') {
      await deleteTournament(tid);
    }
  });
}

async function toggleTournamentStatus(tid) {
  if (!confirm('Change tournament status?')) return;

  try {
    var tDoc = await getDoc(doc(db, "tournaments", tid));
    if (!tDoc.exists()) { alert('Not found'); return; }

    var t = tDoc.data();
    var newStatus = 'upcoming';

    if (t.status === 'upcoming') newStatus = 'live';
    else if (t.status === 'live') newStatus = 'finished';
    else newStatus = 'upcoming';

    await updateDoc(doc(db, "tournaments", tid), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    console.log('[Admin] Tournament status:', tid, '→', newStatus);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function finishTournament(tid) {
  if (!confirm('Finish tournament and distribute prizes?')) return;

  try {
    var entriesSnap = await getDocs(query(
      collection(db, "tournamentEntries"),
      where("tournamentId", "==", tid)
    ));

    var entries = [];
    entriesSnap.forEach(function (d) {
      entries.push({ id: d.id, ...d.data() });
    });

    if (entries.length === 0) {
      await updateDoc(doc(db, "tournaments", tid), {
        status: 'finished',
        finishedAt: new Date().toISOString()
      });
      alert('Tournament finished (no players)');
      return;
    }

    // Sort by profit desc
    entries.sort(function (a, b) {
      return (Number(b.profit) || 0) - (Number(a.profit) || 0);
    });

    var tDoc = await getDoc(doc(db, "tournaments", tid));
    var t = tDoc.data();
    var prizePool = Number(t.prizePool) || 0;

    // Prize split: 1st 50%, 2nd 30%, 3rd 20%
    var splits = [0.5, 0.3, 0.2];

    for (var i = 0; i < Math.min(3, entries.length); i++) {
      var e = entries[i];
      var prize = prizePool * splits[i];

      // Credit user balance
      try {
        var userRef = doc(db, "users", e.userId);
        var userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          var uData = userDoc.data();
          var field = e.accountType === 'real' ? 'realBalance' : 'demoBalance';
          var curBal = uData[field] || 0;
          await updateDoc(userRef, {
            [field]: curBal + prize,
            balance: curBal + prize
          });
        }

        // Update entry with rank + prize
        await updateDoc(doc(db, "tournamentEntries", e.id), {
          rank: i + 1,
          prize: prize,
          completedAt: new Date().toISOString()
        });

        console.log('[Admin] Prize to rank', i + 1, ':', e.userEmail, '$' + prize.toFixed(2));
      } catch (err) {
        console.error('[Admin] Prize error:', err.message);
      }
    }

    await updateDoc(doc(db, "tournaments", tid), {
      status: 'finished',
      finishedAt: new Date().toISOString(),
      winners: entries.slice(0, 3).map(function (e, i) {
        return {
          rank: i + 1,
          userId: e.userId,
          email: e.userEmail,
          profit: Number(e.profit) || 0,
          prize: prizePool * splits[i]
        };
      })
    });

    alert('🏆 Tournament finished!\n\nPrizes distributed to top 3!');
  } catch (err) {
    console.error('[Admin] Finish error:', err);
    alert('Error: ' + err.message);
  }
}

async function deleteTournament(tid) {
  if (!confirm('DELETE tournament and all entries? This cannot be undone!')) return;
  if (!confirm('Are you ABSOLUTELY sure?')) return;

  try {
    // Delete all entries
    var entriesSnap = await getDocs(query(
      collection(db, "tournamentEntries"),
      where("tournamentId", "==", tid)
    ));

    for (var i = 0; i < entriesSnap.docs.length; i++) {
      await deleteDoc(doc(db, "tournamentEntries", entriesSnap.docs[i].id));
    }

    // Delete tournament
    await deleteDoc(doc(db, "tournaments", tid));

    alert('Deleted');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ============================================================
// 4. INIT
// ============================================================

function initAdminTournaments() {
  bindTourCreate();
  bindTourListActions();
  loadAdminTournaments();
  console.log('[Admin] Tournament system initialized');
}

// Re-init on tab click
document.addEventListener('click', function (e) {
  if (e.target.classList && e.target.classList.contains('admin-tab')) {
    if (e.target.dataset.tab === 'tournaments') {
      setTimeout(initAdminTournaments, 100);
    }
  }
});

// Initial
setTimeout(initAdminTournaments, 2000);
setTimeout(initAdminTournaments, 4000);

// ============================================================
// 5. EXPOSE
// ============================================================

window.initAdminTournaments = initAdminTournaments;
window.loadAdminTournaments = loadAdminTournaments;
window.createTournament = async function (data) {
  var tourId = 'tour_' + Date.now();
  var now = Date.now();
  await setDoc(doc(db, "tournaments", tourId), {
    id: tourId,
    name: data.name || 'Tournament',
    entryFee: Number(data.entryFee) || 0,
    prizePool: Number(data.prizePool) || 100,
    maxPlayers: Number(data.maxPlayers) || 50,
    currentPlayers: 0,
    startTime: data.startTime || now + 3600000,
    endTime: data.endTime || now + 7200000,
    status: data.status || 'upcoming',
    createdAt: new Date().toISOString()
  });
  return tourId;
};

console.log('✅ MSG 18 Admin: Tournament Management loaded');
