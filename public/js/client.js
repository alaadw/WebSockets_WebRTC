var testData;
(function (){
  /**
   * Wait page to load
   */
  $(function (){
    /**
     * Trigger with successfull connection
     */
    var socket = io.connect('//' + window.location.host + ':8080').on('connect', function (){
      /**
       * User object
       * @type {Object}
       */
      var user = null;
      /**
       * Set client data
       * @param  {Object} u : user object from server
       */
      var setUserInfo = function (u){
        user = u;
        $('#info').html('<b>Username:</b> ' + user.username + ' <b>Room:</b> ' + user.room);
      };
      /**
       * Update chat list for the room
       * @param  {Array} users : Array of the users
       */
      var updateUserList = function (users){
        $('#users>ul').html('');
        $(users).each(function (index, element){
          $('#users>ul').append('<li>' + element + '</li>');
        });
      };
      /**
       * Message received function.
       */
      var resMsg = function (msg){
        $('#chatScreen>ul').append('<li>' + msg + '</li>');
      };
      /**
       * Send text message to the room
       */
      var sendMessage = function (){
          var textField = $('#chatScreen>input[type=text]')[0];
          var msg = textField.value;
          textField.value = "";
          socket.emit('sendMessage', msg);
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
        $('#rooms>ul').html('');
        $(rooms).each(function (index, element){
          $('#rooms>ul').append('<li>' + element + '</li>');
        });
      };
      socket.on('setClientData', setUserInfo);
      socket.on('updateUserList', updateUserList);
      socket.on('updateChat', resMsg);
      socket.on('updateRooms', updateRooms);
      socket.emit('setUser', user);
      /**
       * Bind send message
       * @type {[type]}
       */
      $('#chatScreen>input[type=button]').click(sendMessage);
      $('#chatScreen>input[type=text]').bind('keypress', function (e){
        var code = (e.keyCode ? e.keyCode : e.which);
        if(code == 13) {
          sendMessage();
        }
      });
      /**
       * Bind change username
       */
      $('#changeUsername').click(changeUsername);
      $('#changeRoom').click(changeRoom);
    });
  });
}());