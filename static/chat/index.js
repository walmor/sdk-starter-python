$(function() {
  // Get handle to the chat div
  var $chatWindow = $('#messages');

  // Our interface to the Chat service
  var chatClient;

  // A handle to the "general" chat channel - the one and only channel we
  // will have in this sample app
  var generalChannel;

  // The server will assign the client a random username - store that value
  // here
  var username;

  var typingIndicator = $('#typing-indicator').hide();

  // Helper function to print info messages to the chat window
  function print(infoMessage, asHtml) {
    var $msg = $('<div class="info">');
    if (asHtml) {
      $msg.html(infoMessage);
    } else {
      $msg.text(infoMessage);
    }
    $chatWindow.append($msg);
  }

  // Helper function to print chat message to the chat window
  function printMessage(fromUser, message) {
    var $message = $('<span class="message">').text(message);
    var $container = $('<div class="message-container">');

    if (fromUser === username) {
      $container.addClass('me');
    }

    $container.append($message);
    $chatWindow.append($container);
    $chatWindow.scrollTop($chatWindow[0].scrollHeight);
  }

  function setStatus(status) {
    const msg = $('#status-msg');
    const connectionBar = $('#connection-bar');

    msg.removeClass();
    switch (status) {
      case 'connecting':
        msg.text('Connecting...');
        msg.addClass('connecting');
        connectionBar.hide();
        break;
      case 'connected':
        msg.text(`Connected as ${username}`);
        msg.addClass('connected');
        connectionBar.hide();
        break;
      case 'disconnected':
        msg.text('Not connected.');
        msg.addClass('disconnected');
        connectionBar.show();
        break;
      default:
        break;
    }
  }

  // Alert the user they have been assigned a random username
  setStatus('disconnected');

  $('.connection-btn').click(function() {
    const value = $(this).data('value');

    setStatus('connecting');

    // Get an access token for the current user, passing a username (identity)
    // and a device ID - for browser-based apps, we'll always just use the
    // value "browser"
    $.getJSON(
      `/token/${value}`,
      {
        device: 'browser'
      },
      function(data) {
        // Initialize the Chat client
        Twilio.Chat.Client.create(data.token)
          .then(client => {
            console.log('Created chat client');
            chatClient = client;
            chatClient.getSubscribedChannels().then(createOrJoinGeneralChannel);

            // Alert the user they have been assigned a random username
            username = data.identity;
            setStatus('connected');
          })
          .catch(error => {
            console.error(error);
            setStatus('disconnected');
            print('There was an error creating the chat client:<br/>' + error, true);
            print('Please check your .env file.', false);
          });
      }
    );
  });

  function createOrJoinGeneralChannel() {
    // Get the general chat channel, which is where all the messages are
    // sent in this simple application
    // print('Attempting to join "general" chat channel...');
    chatClient
      .getChannelByUniqueName('general')
      .then(function(channel) {
        generalChannel = channel;
        console.log('Found general channel:');
        console.log(generalChannel);
        setupChannel();
      })
      .catch(function() {
        // If it doesn't exist, let's create it
        console.log('Creating general channel');
        chatClient
          .createChannel({
            uniqueName: 'general',
            friendlyName: 'General Chat Channel'
          })
          .then(function(channel) {
            console.log('Created general channel:');
            console.log(channel);
            generalChannel = channel;
            setupChannel();
          })
          .catch(function(channel) {
            console.log('Channel could not be created:');
            console.log(channel);
          });
      });
  }

  // Set up channel after it has been found
  function setupChannel() {
    // Join the general channel
    // generalChannel.getMembers().then(members => {
    //   if (members.)
    // })

    generalChannel.join().then(function(channel) {
      print('Joined channel as ' + '<span class="me">' + username + '</span>.', true);
    });

    // Listen for new messages sent to the channel
    generalChannel.on('messageAdded', function(message) {
      printMessage(message.author, message.body);
    });

    generalChannel.on('typingStarted', function(member) {
      console.log('typingStarted', member);
      typingIndicator.text(`${member.identity} is typing...`);
      typingIndicator.show();
    });

    generalChannel.on('typingEnded', function(member) {
      console.log('typingEnded', member);
      typingIndicator.hide();
    });
  }

  // Send a new message to the general channel
  var $input = $('#chat-input');
  $input.on('keydown', function(e) {
    if (generalChannel === undefined) {
      print('The Chat Service is not configured. Please check your .env file.', false);
      return;
    }

    if (e.keyCode == 13) {
      generalChannel.sendMessage($input.val());
      $input.val('');
    } else {
      generalChannel.typing();
    }
  });
});
