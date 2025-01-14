var activeRoom;
var previewTracks;
var identity;
var roomName;

function attachTracks(tracks, container) {
  tracks.forEach(function(track) {
    container.appendChild(track.attach());
  });
}

function attachParticipantTracks(participant, container) {
  var tracks = Array.from(participant.tracks.values());
  attachTracks(tracks, container);
}

function detachTracks(tracks) {
  tracks.forEach(function(track) {
    track.detach().forEach(function(detachedElement) {
      detachedElement.remove();
    });
  });
}

function detachParticipantTracks(participant) {
  var tracks = Array.from(participant.tracks.values());
  detachTracks(tracks);
}

// Check for WebRTC
if (!navigator.webkitGetUserMedia && !navigator.mozGetUserMedia) {
  alert('WebRTC is not available in your browser.');
}

// When we are about to transition away from this page, disconnect
// from the room, if joined.
window.addEventListener('beforeunload', leaveRoomIfJoined);

$('#btn-disconnect').hide();

$('.btn-connect').click(function() {
  identity = $(this).data('value');

  $.getJSON(`/token/${identity}`, function(data) {
    const connectOptions = { name: 'Video Stem2Win PoC', logLevel: 'debug' };
    if (previewTracks) {
      connectOptions.tracks = previewTracks;
    }

    Twilio.Video.connect(data.token, connectOptions).then(roomJoined, function(error) {
      console.log('Could not connect to Twilio: ' + error.message);
    });
  });
});

$('#btn-disconnect').click(function() {
  activeRoom.disconnect();
});

// Successfully connected!
function roomJoined(room) {
  activeRoom = room;

  log("Joined as '" + identity + "'");
  $('#local-media-title').text(`Local (${identity})`);
  $('.btn-connect').hide();
  $('#btn-disconnect').show();
  $('#connection-status')
    .text(`Connected as ${identity}.`)
    .show();

  // Draw local video, if not already previewing
  var previewContainer = document.getElementById('local-media');
  if (!previewContainer.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer);
  }

  room.participants.forEach(function(participant) {
    log("Already in Room: '" + participant.identity + "'");
    var previewContainer = document.getElementById('remote-media');
    attachParticipantTracks(participant, previewContainer);
  });

  // When a participant joins, draw their video on screen
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
  });

  room.on('trackAdded', function(track, participant) {
    log(participant.identity + ' added track: ' + track.kind);
    $('#remote-media-title').text(`Remote (${participant.identity})`);
    var previewContainer = document.getElementById('remote-media');
    attachTracks([track], previewContainer);
  });

  room.on('trackRemoved', function(track, participant) {
    log(participant.identity + ' removed track: ' + track.kind);
    $('#remote-media-title').text('Remote');
    detachTracks([track]);
  });

  // When a participant disconnects, note in log
  room.on('participantDisconnected', function(participant) {
    log("Participant '" + participant.identity + "' left the room");
    detachParticipantTracks(participant);
  });

  // When we are disconnected, stop capturing local video
  // Also remove media for all remote participants
  room.on('disconnected', function() {
    log('Left');
    detachParticipantTracks(room.localParticipant);
    room.participants.forEach(detachParticipantTracks);
    activeRoom = null;
    $('#local-media-title').text('Local');
    $('#remote-media-title').text('Remote');
    $('#connection-status').hide();
    $('.btn-connect').show();
    $('#btn-disconnect').hide();
  });
}

// Activity log
function log(message) {
  console.log(message);
  // var logDiv = document.getElementById('log');
  // logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
  // logDiv.scrollTop = logDiv.scrollHeight;
}

function leaveRoomIfJoined() {
  if (activeRoom) {
    activeRoom.disconnect();
  }
}
