/**
 * node modules that are used.
 */
var http = require('http'),
  server = http.createServer(),
  app = server.listen(8080),
  io = require('socket.io').listen(app),
  check = require('validator').check,
  sanitize = require('validator').sanitize;

/**
 * Sanitize the input string
 * @param  {String} inputString : The input from user
 * @return {String} : The sanitezed input
 */
var filterInput = function (inputString){
  if (inputString){
    inputString = sanitize(inputString).xss();
    inputString = sanitize(inputString).entityEncode();
    inputString = sanitize(inputString).trim();
  }
  return inputString;
};

/**
 * Triggered when a user connects
 */
io.sockets.on('connection', function (socket) {

  var user = {
    username: 'guest' + socket.id,
    room:     'lobby' // Default room
  };

  var updateRoomList = function (){
    // Refresh the users in the chat room.
    var usernames = [];
    io.sockets.clients(user.room).forEach(function (socket){
      socket.get('user', function (err, fetchedUser){
        usernames.push(fetchedUser.username);
      });
    });
    io.sockets.in(user.room).emit('updateUserList', usernames);
  };

  /**
   * Add new user to the list. Assign user to the lobby.
   * @param  {string} username : Desired username
   */
  socket.on('setUser', function (userConfig){

    username = filterInput(userConfig.username);
    if (username) {
      user.username = username;
    }
    /**
     * Set user variable to socket for reaching later.
     */
    socket.set('user', user, function (){
      // Add user to chat room
      socket.join(user.room);
      updateRoomList();
      socket.emit('setClientData', user);
    });
  });

  /**
   * Broadcast message to the group
   * @param  {[type]} message
   */
  socket.on('sendMessage', function (message){
    io.sockets.in(user.room).emit('updateChat', '<b>' + user.username + ':</b> ' + filterInput(message));
  });

  socket.on('disconnect', function (){
    socket.leave(user.room);
    updateRoomList(user.room);
  });
});