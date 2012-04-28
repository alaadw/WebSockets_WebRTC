(function (){
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
      if (element.isTyping){
        typingText = " (typing)";
      }
      $('.users>ul').append('<li>' + element.username + typingText + '</li>');
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
      $('.rooms>ul').append('<li>' + element.roomName + ' (' + element.totalUsers + ')</li>');
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
  var bindEvents = function (){
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
  };
  /**
   * Wait page to load
   */
  $(function (){
    /**
     * Trigger with successfull connection
     */
    socket.on('connect', function (){
      bindEvents();
      // listeners
      socket.on('setClientData', setUserInfo);
      socket.on('updateUserList', updateUserList);
      socket.on('updateChat', resMsg);
      socket.on('updateRooms', updateRooms);
      // initialize user
      socket.emit('setUser', user);
    });
  });
}());