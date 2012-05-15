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
   * @param  {Object} u : user object from server
   */
  var setUserInfo = function(u){
    user = u;
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
      $('.users>ul').append('<li id="user_' + element.username + '">' + element.username + typingText + '</li>');
    });
  };
  /**
   * Message received function.
   */
  var resMsg = function(resMsg){
    $('.chatScreen>ul').append('<li><b>' + resMsg.username + '</b>: ' + resMsg.message + '</li>');
  };
  /**
   * Send text message to the room
   */
  var sendMessage = function(){
      var textField = $('.chatScreen>input[type=text]')[0];
      var msg = textField.value;
      if (msg){
        textField.value = "";
        stopTyping();
        socket.emit('sendMessage', msg);
      }
  };
  var changeUsername = function(){
    user.username = prompt("Username:");
    socket.emit('setUser', user);
  };
  var changeRoom = function(){
    user.room = prompt("Room name");
    socket.emit('setUser', user);
  };
  var updateRooms = function(rooms){
    $('.rooms>ul').html('');
    $(rooms).each(function(index, element){
      $('.rooms>ul').append('<li id="room_' + element.roomName + '">' + element.roomName + ' (' + element.totalUsers + ')</li>');
    });
  };
  var startTyping = function(){
    user.typing = true;
    socket.emit('setUser', user);
  };
  var stopTyping = function(){
    user.typing = false;
    socket.emit('setUser', user);
  };
  var addUserToRoom = function(newUser){
    $('.users>ul').append('<li id="user_' + newUser.username + '">' + newUser.username + '</li>');
  };
  var exitRoom = function(data){
    $('#user_'+data.username).remove();
  };
  var editUser = function(data){
    if (data.newConfig.username !== data.oldConfig.username){
      $('#user_'+data.oldConfig.username).attr('id', 'user_' + data.newConfig.username);
      $('#user_'+data.newConfig.username).html(data.newConfig.username);
    }
    if (data.newConfig.typing !== data.oldConfig.typing){
      var typingText = "";
      if (data.newConfig.typing){
        typingText = " (typing)";
      }
      $('#user_'+data.newConfig.username).html(data.newConfig.username + typingText);
    }
  };

  var setUserMedia = function(){
    var localURL;
    var localStream;
    var localVideo = $('#localVideo');
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
      data.streamID = data.streamID || data.starterUser.id + "_" + user.id;
      var start = function(){
        if (!started && localStream){
          $(".videos").append('<video width="100%" height="100%" id="' + data.streamID + '" autoplay="autoplay"></video>');
          remoteVideo = $("#"+data.streamID);
          remoteVideo.attr("class", "remoteVideos");
          createPeerConnection();
          pc.addStream(localStream);
          started = true;
          clearInterval(interval);
        }
      };
      var onSignalingMessage = function(message){
        console.log("onSignalingMessage");
        socket.emit("message", {message: message, targetUser: targetUser, data: data});
      };
      var onSessionConnecting = function(message){
        console.log("onSessionConnecting");
      }
      var onSessionOpened = function(message){
        console.log("onSessionOpened");
      };
      var onRemoteStreamAdded = function(event){
        console.log("onRemoteStreamAdded");
        remoteURL = webkitURL.createObjectURL(event.stream);
        remoteVideo.attr("src",remoteURL);
      }
      var onRemoteStreamRemoved = function(event) {
        console.log("onRemoteStreamRemoved");
      }
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
          console.log("I am going");
          pc.close();
        }
      };
      if (typeof data.targetUser === "undefined"){
        console.log("streamInitializer1", data);
        data.targetUser = user;
        targetUser = data.starterUser;
        socket.emit('triggerStream', data);
      }else{
        console.log("streamInitializer2", data);
        targetUser = data.targetUser;
        interval = setInterval(start, 1000);
      }
      socket.on('message'+data.streamID, onChannelMessage);
      socket.on('exitRoom', closeConnection);
    }; // end of stream initializer.
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
    $('.chatScreen>input[type=button]').click(sendMessage);
    $('.chatScreen>input[type=text]').bind('keyup', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if(code == 13) {
        sendMessage();
      }
      if (this.value.length === 0){
        stopTyping();
      }else{
        if (user.typing === false){
          startTyping();
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
      .on('updateChat', resMsg)
      .on('updateRooms', updateRooms)
      .on('addUserToRoom', addUserToRoom)
      .on('editUser', editUser)
      .on('exitRoom', exitRoom);
  });
}()); // end of encapsulation