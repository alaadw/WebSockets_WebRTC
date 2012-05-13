(function (){
  /**
   * Hold user properties. It is filled from server
   * @type {Object}
   */
  var user    = null;
  
  var localStream;
  var localVideo;
  /**
   * Socket.io
   * @type {Object}
   */
  var socket  = io.connect('//' + window.location.host + ':8080');
  /**
   * Set client data
   * @param  {Object} u : user object from server
   */
  var setUserInfo = function (u){
    user = u;
    $('#username').html(user.username);
    $('#room').html(user.room);
  };
  /**
   * Update chat list for the room
   * @param  {Array} users : Array of the users
   */
  var updateUserList = function (users){
    $('.users>ul').html('');
    $(users).each(function (index, element){
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
  var resMsg = function (resMsg){
    $('.chatScreen>ul').append('<li><b>' + resMsg.username + '</b>: ' + resMsg.message + '</li>');
  };
  /**
   * Send text message to the room
   */
  var sendMessage = function (){
      var textField = $('.chatScreen>input[type=text]')[0];
      var msg = textField.value;
      if (msg){
        textField.value = "";
        stopTyping();
        socket.emit('sendMessage', msg);
      }
  };
  var changeUsername = function (){
    user.username = prompt("Username:");
    socket.emit('setUser', user);
  };
  var changeRoom = function (){
    user.room = prompt("Room name");
    socket.emit('setUser', user);
  };
  var updateRooms = function (rooms){
    $('.rooms>ul').html('');
    $(rooms).each(function (index, element){
      $('.rooms>ul').append('<li id="room_' + element.roomName + '">' + element.roomName + ' (' + element.totalUsers + ')</li>');
    });
  };
  var startTyping = function (){
    user.typing = true;
    socket.emit('setUser', user);
  };
  var stopTyping = function (){
    user.typing = false;
    socket.emit('setUser', user);
  };
  var addUserToRoom = function (newUser){
    $('.users>ul').append('<li id="user_' + newUser.username + '">' + newUser.username + '</li>');
  };
  var exitRoom = function (data){
    $('#user_'+data.username).remove();
  };
  var editUser = function (data){
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
  var setUserMedia = function (){

    var onUserMediaSuccess = function (stream){
      var url = webkitURL.createObjectURL(stream);
      localVideo.attr("src", url);
      localStream = stream;
    };
    var onUserMediaError = function (error){
      alert("Failed to get access to local media. Error code was " + error.code + ".");
    };

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

  };
  var initialize = function (){
    $('.chatScreen>input[type=button]').click(sendMessage);
    $('.chatScreen>input[type=text]').bind('keyup', function (e){
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
    // start media
    localVideo = $('#localVideo')
    setUserMedia();
    // initialize user
    socket.emit('setUser', user);
  };
  /**
   * Wait page to load
   */
  $(function (){
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