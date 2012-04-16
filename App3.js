var io = require('socket.io'),
	express = require('express'),
	fs = require('fs'),
	parseCookie = require('connect').utils.parseCookie;
	app = express.createServer();

app.configure(function(){
	app.use(express.cookieParser());
	app.use(express.session({secret:'secret',key:'dragon.sid'}));
	app.use(function(req,res){
		fs.readFile(__dirname+'/index.html',function(err,data){
			if(err){
				res.writeHead(500);
				return res.end('Error load socket.html');
			}
			res.writeHead(200);
			res.end(data);
		});
	});
});

var text = new Array(10);

function log(str){
	for(var i=0;i<9;i++){
		text[i] = text[i+1];
	}
	text[9] = str;
}

var users = {};
var sessions = {};
var connections = {};
app.listen(2020);
var sio=io.listen(app);

sio.set('authorization',function(data,accept){
	if(data.headers.cookie){
		data.cookie = parseCookie(data.headers.cookie);
		data.sessionID=data.cookie['dragon.sid'];
	}else{
		return accept('No cookie transmitted.',false);
	}
	accept(null,true);
});

sio.sockets.on('connection',function(socket){
	var sessionID = socket.handshake.sessionID;
	
	if(connections[sessionID]){
	  connections[sessionID].emit('news',{msg:'>ERROR: You opened new session. You are no longer use this session.'});
		socket.emit('news',{msg:'>NOTICE: You have duplicated connections. Your old session will be disconnected.'});
		connections[sessionID].disconnect();
	}

  connections[sessionID] = socket;
	console.log(""+sessionID+" connected!");

  if(sessions[sessionID]){
		var username = sessions[sessionID];
		while(users[username]!=undefined){
			username = "중복_"+username;
		}
		sessions[sessionID] = username;
	}else{
		var username = "";
		do{
			username = "손님_"+Math.floor(Math.random()*10000);
		}while(users[username]!=undefined);
		sessions[sessionID] = username;
	}
	sio.sockets.emit('news',{msg:'>NOTICE: '+username+' has joined the chat.'});

  socket.emit('name',{name:username});
	users[username] = socket; 

  if(text[9]!=undefined){
		var logs = "";

    for(var i=0;i<10;i++){
			if(text[i]!=undefined)
				socket.emit('news',{msg:text[i].replace(/</g,'&lt;').replace(/>/g,'&gt;')});
		}
	}

  var userlist = "";

	for(user in users){
	  userlist +='<div>'+user+'</div>';
	};

	sio.sockets.emit('users',{users:userlist});
	
	socket.on('msg',function(data){
		log(username+":"+data.msg);
	  var re = new RegExp(/(\/t)\s([^\s]+)\s(.*)$/);
		if(re.test(data.msg.replace(/\s+$/,''))) {
		  tell = re.exec(data.msg.replace(/</g,'&lt;').replace(/>/g,'&gt;'));
			
			if(tell[2] == username) {
			  socket.emit('news',{msg:">Talking to ourselves, are we?"});
			}else{
			  try {
          users[tell[2]].emit('news',{msg:" tell from "+username+": "+tell[3]});
			    socket.emit('news',{msg:">Tell sent to "+tell[2]+": "+tell[3]});
			  } catch (err) {
				  socket.emit('news',{msg:">ERROR: Invaild username."});
				}
			}
		}else{
		  var re = new RegExp(/(\/t)\s([^\s]+)/);
		  
			if(!re.test(data.msg.replace(/\s+$/,''))) {
			  sio.sockets.emit('news',{msg:username+":"+data.msg});
	    }
		}
	});
	
	socket.on('name',function(data){
		prevName=username;
		delete users[username];
		username = data.name.replace(/^(&lt;|>)+/g,'');
		
		while(users[username]!=undefined){
			username = "중복_"+username;
		}
		
		users[username] = socket;
		sessions[sessionID] = username;
		socket.emit('name',{name:username});
		log(prevName+"->"+username);
		sio.sockets.emit('news',{msg:prevName+"->"+username});
		userlist = "";
		
		for(user in users){
		  userlist +='<div>'+user+'</div>';
		}
		sio.sockets.emit('users',{users:userlist});
	});

	socket.on('disconnect',function(){
		delete users[username];
		connections[sessionID] = false;
		userlist = "";
		for(user in  users){userlist +='<div>'+user+'</div>';}
		sio.sockets.emit('users',{users:userlist});
	});
});
