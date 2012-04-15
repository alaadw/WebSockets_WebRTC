/**
 * Decleare HTTP server
 * Listen port 8080
 * Import socket.io
 */
var http = require('http'),
  server = http.createServer(),
  app = server.listen(8080),
  io = require('socket.io').listen(app),
  check = require('validator').check,
  sanitize = require('validator').sanitize;
/**
 * Sanitize the input string
 * @param  {[String]} inputString [The input from user]
 * @return {[String]}             [The normalized input]
 */
var filterInput = function (inputString){
  if (inputString){
    inputString = sanitize(inputString).xss();
    inputString = sanitize(inputString).entityEncode();
    inputString = sanitize(inputString).trim();
  }
  return inputString;
};

io.sockets.on('connection', function (socket) {
  /**
   * Add new user to the list. Assign user to the lobby.
   * @param  {[string]} username [Desired username]
   */
  socket.on('addUser', function (username){
    /**
     * Prepare user variables
     * @type {Object}
     */
    username = filterInput(username);
    var user = {
      username: username ? username : 'guest' + socket.id,
      room:'lobby'
    };
    /**
     * Set user variable
     */
    socket.set('user', user, function (){
      // Add user to chat room
      socket.join(user.room);
      // Refresh the users in the chat room.
      var usernames = [];
      io.sockets.clients(user.room).forEach(function (socket){
        socket.get('user', function (err, fetchedUser){
          usernames.push(fetchedUser.username);
        });
      });
      /**
       * Set user values in client side
       */
      socket.emit('setClientData', user);
      io.sockets.in(user.room).emit('updateUserList', usernames);
    });
  });
  /**
   * Broadcast message to the group
   * @param  {[type]} message
   */
  socket.on('sendMessage', function (message){
    message = filterInput(message);
    socket.get('user', function (err, user){
      console.log(user.room, message);
      io.sockets.in(user.room).emit('updateChat', '<b>' + user.username + ':</b> ' + message);
    });
  });
});