var username, room;
/**
 * Send text message to the room
 */
var sendMessage = function (){
    var textField = $('#chatScreen>input[type=text]')[0];
    var msg = textField.value;
    textField.value = "";
    socket.emit('sendMessage', msg);
};
var socket = io.connect('//' + window.location.host + ':8080');

/**
 * Set initial data on connection.
 */
socket.on('connect', function (){
  socket.emit('setUser', {
    room: 'lobby',
    username: prompt("Username:")
  });
});
/**
 * Set client data
 * @param  {Object} user : username and room is stored
 */
socket.on('setClientData', function (user){
  username = user.username;
  room     = user.room;
  $('#info').html('<b>Username:</b> ' + username + ' <b>Room:</b> ' + room);
});
/**
 * Update chat list for the room
 * @param  {Array} users : Array of the users
 */
socket.on('updateUserList', function (users){
  $('#users>ul').html('');
  $(users).each(function (index, element){
    $('#users>ul').append('<li>' + element + '</li>');
  });
});

socket.on('updateChat', function (message){
  $('#chatScreen>ul').append('<li>' + message + '</li>');
});

// Page load
$(function (){
  // Send message bindings
  $('#chatScreen>input[type=button]').click(sendMessage);
  $('#chatScreen>input[type=text]').bind('keypress', function (e){
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13) {
      sendMessage();
    }
  });
});
