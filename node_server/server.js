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
    var response = [];
    io.sockets.clients(user.room).forEach(function (socket){
      socket.get('user', function (err, fetchedUser){
        response.push(fetchedUser);
      });
    });
    socket.emit('updateUserList', response);
  };
  var updateRoomsList = function (){
    var hash = [];
    // get all channel list
    var rooms = socket.manager.rooms;
    for(var channel in rooms) {
      channel = channel + "";
      name = channel.replace(/^\//, '');
      if (channel){
        hash.push({
          roomName: name,
          totalUsers: rooms[channel].length
        });
      }
    }
    io.sockets.emit('updateRooms', hash);
  };
  var addUserToRoom = function (){
    io.sockets.in(user.room).emit('addUserToRoom', user);
    socket.broadcast.to(user.room).emit('streamInitialize', {starterUser: user});
  };
  var editUser = function (newUser, oldUser){
    io.sockets.in(user.room).emit('editUser', {"newConfig": newUser, "oldConfig": oldUser});
  };
  var exitRoom = function (){
    io.sockets.in(user.room).emit('exitRoom', user);
    socket.broadcast.to(user.room).emit('close', user.id);
  }
  /**
   * Update user info.
   * @param  {string} username : Desired username
   */
  socket.on('setUser', function (userConfig){
    userConfig = userConfig || {};
    userConfig.username = filterInput(userConfig.username) || "guest" +  Math.floor(Math.random()*1000001).toString();
    userConfig.room     = filterInput(userConfig.room) || "local";
    userConfig.typing   = userConfig.typing ? true : false;
    userConfig.id       = socket.id;
    socket.set('user', userConfig, function (){
      switch (true){
        case (!user.username && !user.room): // new logged in user
          user = userConfig;
          updateUsersList();
          socket.join(user.room);
          addUserToRoom();
          updateRoomsList();
          break;
        case (user.username !== userConfig.username): // username changed
        case (user.typing !== userConfig.typing): // typing changed,
          editUser(userConfig, user);
          user = userConfig;
          break;
        case (user.room !== userConfig.room): // room changed
          exitRoom();
          //logout old room
          socket.leave(user.room);
          // login new room
          user = userConfig;
          updateUsersList();
          socket.join(user.room);
          addUserToRoom();
          updateRoomsList();
          break;
        default:
          console.warn("setUser exits without an operation.");
          break;
      }
      socket.emit("setClientData", user);
    });
  });
  /**
   * Broadcast message to the group
   * @param  {type} message
   */
  socket.on('sendMessage', function (message){
    io.sockets.in(user.room).emit('updateChat', {
      username: user.username,
      message: filterInput(message)
    });
  });
  /**
   * Remove user from room in disconnect
   */
  socket.on('disconnect', function (){
    exitRoom();
    socket.leave(user.room);
    updateRoomsList();
  });
  socket.on('triggerStream', function(data){
    io.sockets.socket(data.starterUser.id).emit("streamInitialize", data);
  });
  socket.on('message', function(config){
    var broadcastMessage = config.message;
    var data = config.data;
    var targetUser = config.targetUser;
    io.sockets.socket(targetUser.id).emit("message"+data.streamID, broadcastMessage);
  });
});