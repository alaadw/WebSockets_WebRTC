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

  var user = {};

  var updateUsersList = function (){
    // Refresh the users in the chat room.
    var usernames = [];
    io.sockets.clients(user.room).forEach(function (socket){
      socket.get('user', function (err, fetchedUser){
        usernames.push(fetchedUser.username);
      });
    });
    io.sockets.in(user.room).emit('updateUserList', usernames);
  };

  var updateRoomsList = function (){
    var hash = [];
    // get all channel list
    var rooms = socket.manager.rooms;
    for(var channel in rooms) {
      channel = channel + "";
      channel = channel.replace(/^\//,'');
      if (channel){
        hash.push(channel);
      }
    }
    io.sockets.emit('updateRooms', hash);
    console.log(hash);
  };

  /**
   * Update user info.
   * @param  {string} username : Desired username
   */
  socket.on('setUser', function (userConfig){
    userConfig = userConfig || {};
    userConfig.username = filterInput(userConfig.username) || "guest" + socket.id;
    userConfig.room     = filterInput(userConfig.room) || "local";
    /**
     * Set user variable to socket for reaching later.
     */
    socket.set('user', userConfig, function (){
      if (!user.room){
        socket.join(userConfig.room);
      }else if (user.room !== userConfig.room) {
        socket.leave(user.room);
        updateUsersList();
        socket.join(userConfig.room);
      }
      user = userConfig;
      updateUsersList();
      updateRoomsList();
      socket.emit("setClientData", user);
    });
  });

  /**
   * Broadcast message to the group
   * @param  {[type]} message
   */
  socket.on('sendMessage', function (message){
    io.sockets.in(user.room).emit('updateChat', '<b>' + user.username + ':</b> ' + filterInput(message));
  });

  /**
   * Remove user from room in disconnect
   */
  socket.on('disconnect', function (){
    socket.leave(user.room);
    updateUsersList(user.room);
  });
});