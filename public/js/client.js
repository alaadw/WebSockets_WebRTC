(function(){
  /**
   * Hold user properties. It is filled from server
   * @type {Object}
   */
  var user    = null;
  /**
   * Socket.io
   * @type {Object}
   */
  var socket  = io.connect('//' + window.location.host + ':8080');
  /**
   * Set client data
   * @param  {Object} rUser : user object received from server
   */
  var setUserInfo = function(rUser){
    user = rUser;
    $('#username').html(user.username);
    $('#room').html(user.room);
  };
  /**
   * Update chat list for the room
   * @param  {Array} users : Array of the users
   */
  var updateUserList = function(users){
    $('.users>ul').html('');
    $(users).each(function(index, element){
      var typingText = "";
      if (element.typing){
        typingText = " (typing)";
      }
      $('.users>ul').append('<li id="user_' + element.id + '">' + element.username + typingText + '</li>');
    });
  };
  /**
   * Update rooms list from server
   * @param {Array} rooms : Array of the rooms
   */
  var updateRooms = function(rooms){
    $('.rooms>ul').html('');
    $(rooms).each(function(index, element){
      $('.rooms>ul').append('<li id="room_' + element.roomName + '">' + element.roomName + ' (' + element.totalUsers + ')</li>');
    });
  };
  /**
   * Text message receive function
   * @param {Object} messageInfo
   */
  var resTextMessage = function(messageInfo){
    $('#chatScreen .messages').append('<div><b>' + messageInfo.username + '</b>: ' + messageInfo.message + '</div>')
      .scrollTop(100000000000000000);
  };
  /**
   * Send text message to the room
   */
  var sendTextMessage = function(){
      var textField = $('#chatScreen input[type=text]')[0];
      var msg = textField.value;
      if (msg){
        textField.value = "";
        changeTyping(false);
        socket.emit('sendTextMessage', msg);
      }
  };
  /**
   * Change username 
   */
  var changeUsername = function(){
    user.username = prompt("Username:");
    socket.emit('setUser', user);
  };
  /**
   * Change room 
   */
  var changeRoom = function(){
    user.room = prompt("Room name");
    socket.emit('setUser', user);
  };
  /**
   * Change typing status
   * @param {boolean} isTyping 
   */
  var changeTyping = function(isTyping){
    user.typing = isTyping;
    socket.emit('setUser', user);
  };
  /**
   * Add new user to the room
   * @param {Object} newUser 
   */
  var addUserToRoom = function(newUser){
    $('.users>ul').append('<li id="user_' + newUser.id + '">' + newUser.username + '</li>');
  };
  /**
   * Remove user from the room list
   * @param {Object} qUser 
   */
  var exitRoom = function(qUser){
    $('#user_'+qUser.id).remove();
  };
  /**
   * Update user with the user object received from server
   * @param {object} eUser
   */
  var editUser = function(eUser){
    $('#user_'+eUser.id).html(eUser.username);
    var typingText = "";
    if (eUser.typing){
      typingText = " (typing)";
    }
    $('#user_'+eUser.id).html(eUser.username + typingText);
  };
  /**
   * Initialize the user media for the user. 
   */
  var setUserMedia = function(){
    /**
     * @type {string} 
     */
    var localURL;
    /**
     * @type {stream} 
     */
    var localStream;
    /**
     * @type {DOMElement} 
     */
    var localVideo = $('#localVideo');
    /**
     * Initialize local stream 
     * @param {stream} stream
     */
    var onUserMediaSuccess = function(stream){
      localURL = webkitURL.createObjectURL(stream);
      localVideo.attr("src", localURL);
      localStream = stream;
    };
    var onUserMediaError = function(error){
      alert("Failed to get access to local media. Error code was " + error.code + ".");
    };
    var streamInitialize = function(data){
      var pc;
      var remoteVideo;
      var started = false;
      var targetUser;
      var interval;
      var start = function(){
        if (!started && localStream){
          createPeerConnection();
          pc.addStream(localStream);
          started = true;
          clearInterval(interval);
        }
      };
      var onSignalingMessage = function(message){
        socket.emit("message", {message: message, targetUser: targetUser, data: data});
      };
      var onSessionConnecting = function(message){
      };
      var onSessionOpened = function(message){
      };
      var onRemoteStreamAdded = function(event){
        remoteURL = webkitURL.createObjectURL(event.stream);
        remoteVideo.attr("src",remoteURL).fadeTo(2000, 1);
      };
      var onRemoteStreamRemoved = function(event) {
        console.log("onRemoteStreamRemoved");
      };
      var createPeerConnection = function(){
        if(typeof webkitPeerConnection === 'function'){
          pc = new webkitPeerConnection("STUN stun.l.google.com:19302", onSignalingMessage);
        }
        else{
          pc = new webkitDeprecatedPeerConnection("STUN stun.l.google.com:19302", onSignalingMessage);
        }
        pc.onconnecting = onSessionConnecting;
        pc.onopen = onSessionOpened;
        pc.onaddstream = onRemoteStreamAdded;
        pc.onremovestream = onRemoteStreamRemoved;
      };
      var onChannelMessage = function(message){
        if (message.indexOf("\"ERROR\"", 0) == -1) {
            if (!started) start();
            pc.processSignalingMessage(message);
        }
      };
      var closeConnection = function(tUser){
        if(remoteVideo && data.streamID.indexOf(tUser.id)!==-1){
          remoteVideo.fadeTo(2000, 0, function(){
            remoteVideo.attr("src", "");
            remoteVideo.remove();
          });
        }
        if(pc && tUser.id === user.id){
          pc.close();
        }
      };
      /**
       * Set properties 
       */
      data.streamID = data.streamID || data.starterUser.id + "_" + user.id;
      if (typeof data.targetUser === "undefined"){
        data.targetUser = user;
        targetUser = data.starterUser;
        socket.emit('triggerStream', data);
      }else{
        targetUser = data.targetUser;
        interval = setInterval(start, 1000);
      }
      remoteVideo = $('<video width="100%" height="100%" id="' + data.streamID + '" autoplay="autoplay"></video>')
        .css("opacity", 0)
        .attr("class", "remoteVideos");
      $(".videos").append(remoteVideo);
      socket.on('message'+data.streamID, onChannelMessage);
      socket.on('exitRoom', closeConnection);
    }; // end of streamInitialize
    try {
      navigator.webkitGetUserMedia({audio:true, video:true}, onUserMediaSuccess, onUserMediaError);
      console.log("Requested access to local media with new syntax.");
    } catch (e) {
      try {
        navigator.webkitGetUserMedia("video,audio", onUserMediaSuccess, onUserMediaError);
        console.log("Requested access to local media with old syntax.");
      }catch (e){
        alert("webkitGetUserMedia() failed. Is the MediaStream flag enabled in about:flags?");
        console.log("webkitGetUserMedia failed with exception: " + e.message);
      }
    }
    socket.on('streamInitialize', streamInitialize);
  };

  var initialize = function(){
    $('#chatScreen input[type=button]').click(sendTextMessage);
    $('#chatScreen input[type=text]').bind('keyup', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if(code == 13) {
        sendTextMessage();
      }
      if (this.value.length === 0){
        changeTyping(false);
      }else{
        if (user.typing === false){
          changeTyping(true);
        }
      }
    });
    /**
     * Bind change username
     */
    $('#changeUsername').click(changeUsername);
    $('#changeRoom').click(changeRoom);
    // initialize user
    setUserMedia();
    socket.emit('setUser', user);
  };
  /**
   * Wait page to load
   */
  $(function(){
    socket
      .on('connect', initialize)
      .on('setClientData', setUserInfo)
      .on('updateUserList', updateUserList)
      .on('updateChat', resTextMessage)
      .on('updateRooms', updateRooms)
      .on('addUserToRoom', addUserToRoom)
      .on('editUser', editUser)
      .on('exitRoom', exitRoom);
  });
}()); // end of encapsulation