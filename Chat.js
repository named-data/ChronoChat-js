/**
 *   Copyright (C) 2013 Regents of the University of California 
 *   Authors:   Qiuhan Ding <dingqiuhan@gmail.com>, Wentao Shang <wentaoshang@gmail.com>
 *   BSD License, see LICENSE file. 
 *   
 *   Chat Interest and Message (include Chat, Heartbeat and Leave) Processing.
 *   Using Chat Message Protobuf for Chatmsg Data Packet
 */

var Chat = function Chat(){
    this.msgcache = new Array();
    this.roster = new Array();
    this.maxmsgcachelength = 100;
};

//Initialization: push the JOIN message in to the msgcache, update roster and start heartbeat
Chat.prototype.initial = function(seqno){
    var self = this;
    console.log("initial chat");
    var myVar = setInterval(function(){self.heartbeat();},60000);
    if(this.roster.indexOf(usrname) == -1){
	this.roster.push(usrname);
	document.getElementById('menu').innerHTML = '<p><b>Member</b></p>';
	document.getElementById('menu').innerHTML += '<ul><li>'+screen_name+'</li></ul>';
	var d = new Date();
	var t = d.getTime();
	document.getElementById('txt').innerHTML += '<div><b><grey>'+screen_name+'-'+d.toLocaleTimeString()+': Join</grey></b><br /></div>'
	var objDiv = document.getElementById("txt");      
	objDiv.scrollTop = objDiv.scrollHeight;
	this.msgcache.push({seqno:sync.usrseq,msgtype:'JOIN',msg:'xxx',time:t});
	while (this.msgcache.length>this.maxmsgcachelength)
            this.msgcache.shift();
    }
};

//Send Chat Interest to fetch chat messages after get the user get the Sync data packet back but will not send interest 
Chat.prototype.sendInterest = function(content){
    console.log(content);
    var sendlist = [];
    var sessionlist = [];
    var seqlist = [];
    for(var j = 0; j<content.length;j++){
	if(content[j].type == 0){
            var name_component = content[j].name.split('/');
	    var name_t = name_component[name_component.length-1];
            var session = content[j].seqno.session;
            if(name_t!=screen_name){
            	var index_n = sendlist.indexOf(content[j].name);
                if(index_n!=-1){
                    sessionlist[index_n] = session;
		    seqlist[index_n] = content[j].seqno.seq;
                }
   	    	else{
		    sendlist.push(content[j].name);
		    sessionlist.push(session);
                    seqlist.push(content[j].seqno.seq);
		}
 	    }
	} 
    }
    for(var i = 0; i<sendlist.length;i++){
	var n = new Name(sendlist[i]+'/'+sessionlist[i]+'/'+seqlist[i]);///
	var template = new Interest();
	template.interestLifetime = sync_lifetime;
	ndn.expressInterest(n, template, this.onData.bind(this), this.chatTimeout.bind(this));
	console.log(n.to_uri());
	console.log('Chat Interest expressed.');
        
    }
};

//Send back Chat Data Packet which contains the user's message
Chat.prototype.onInterest = function(inst){
    console.log('Chat Interest received in callback.');
    console.log(inst.name.to_uri());
    var content = {};
    var seq = parseInt(DataUtils.toString(inst.name.components[6]));
    for(var i = this.msgcache.length-1;i>=0;i--){
        if(this.msgcache[i].seqno ==seq){
            if(this.msgcache[i].msgtype != 'CHAT')
		content = new ChatMessage({from:screen_name,to:chatroom,type:this.msgcache[i].msgtype,timestamp:this.msgcache[i].time/1000});
	    else
		content = new ChatMessage({from:screen_name,to:chatroom,type:this.msgcache[i].msgtype,data:this.msgcache[i].msg,timestamp:this.msgcache[i].time/1000});
            break;
        }
    }
    if(content.from != null){
	var str = new Uint8Array(content.toArrayBuffer());
        var co = new ContentObject(inst.name,str);
        co.sign(mykey);

        try {
            ndn.send(co);
	    console.log(content);
        } 
        catch (e) {
            console.log(e.toString());
    	}
    }
};

//Processing the incoming Chat data
Chat.prototype.onData = function(inst,co){
    console.log("Chat ContentObject received in callback");
    console.log('name'+co.name.to_uri());
    var arr = new Uint8Array(co.content.length);
    arr.set(co.content);
    var content = ChatMessage.decode(arr.buffer);
    var name = content.from;
    var name_t = co.name.to_uri().split('/');
    var prefix = '/'+name_t[1]+'/'+name_t[2]+'/'+name_t[3]+'/'+name_t[4]+'/'+name_t[5];
    var session = DataUtils.toString(co.name.components[5]);
    var seqno = DataUtils.toString(co.name.components[6]);
    var l = 0;
    //update roster
    while(l<this.roster.length){
	var name_t = this.roster[l].substring(0,this.roster[l].length-10);
	var session_t = this.roster[l].substring(this.roster[l].length-10,this.roster[l].length);
	if(name != name_t && content.type!=2)
	    l++;
        else{
	    if(name == name_t && session>session_t){
		this.roster[l] = name+session;
	    }
	    break;
	}
    }
    if(l==this.roster.length){
        this.roster.push(name+session);
        var d = new Date(content.timestamp*1000);
        var t = d.toLocaleTimeString();
        document.getElementById('txt').innerHTML += '<div><b><grey>'+name+'-'+t+': Join'+'</grey></b><br /></div>';
	var objDiv = document.getElementById("txt");      
	objDiv.scrollTop = objDiv.scrollHeight;
	document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
        for(var i = 0;i<this.roster.length;i++){
	    var name_t = this.roster[i].substring(0,this.roster[i].length-10);
	    document.getElementById('menu').innerHTML += '<li>'+name_t+'</li>';
        }
        document.getElementById('menu').innerHTML += '</ul>';
    }
    var self = this;
    setTimeout(function(){self.alive(seqno,name,session,prefix);},120000);
    if (content.type ==0 && sync.flag == 0 && content.from != screen_name){
        //display on the screen will not display old data
        var d = new Date(content.timestamp*1000);
        var t = d.toLocaleTimeString();
	var escaped_msg = $('<div/>').text(content.data).html();  // encode special html characters to avoid script injection
        document.getElementById('txt').innerHTML +='<p><grey>'+ content.from+'-'+t+':</grey><br />'+escaped_msg+'</p>';
	var objDiv = document.getElementById("txt");      
	objDiv.scrollTop = objDiv.scrollHeight;
    }
    else if(content.type == 2){
        //leave message
        var n = this.roster.indexOf(name+session);
	if(n!=-1 && name!=screen_name){
            this.roster.splice(n,1);
	    document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
	    for(var i = 0;i<this.roster.length;i++){
		var name_t = this.roster[i].substring(0,this.roster[i].length-10);
	        document.getElementById('menu').innerHTML += '<li>'+name_t+'</li>';
	    }
            document.getElementById('menu').innerHTML += '</ul>';
            console.log(name+" leave");
	    var d = new Date(content.timestamp*1000);
            var t = d.toLocaleTimeString();
            document.getElementById('txt').innerHTML += '<div><b><grey>'+name+'-'+t+': Leave</grey></b><br /></div>'
	    var objDiv = document.getElementById("txt");      
	    objDiv.scrollTop = objDiv.scrollHeight;
	}
    }

};

Chat.prototype.chatTimeout = function(interest){
    console.log("no chat data coming back");
};

//Send a hearbeat message
Chat.prototype.heartbeat=function(){
    if(this.msgcache.length == 0){
	var d = new Date();
	var t = d.getTime();
 	this.msgcache.push({seqno:sync.usrseq,msgtype:"JOIN",msg:"xxx",time:t});
    }
    sync.usrseq++;
    var content = [new SyncState({name:chat_prefix,type:'UPDATE',seqno:{seq:sync.usrseq,session:session}})];
    var d = new Date();
    var t = d.getTime();
    this.msgcache.push({seqno:sync.usrseq,msgtype:"HELLO",msg:"xxx",time:t});
    while (this.msgcache.length>this.maxmsgcachelength)
        this.msgcache.shift();
    var content_t = new SyncStateMsg({ss:content});
    var str = new Uint8Array(content_t.toArrayBuffer());
    var n = new Name(sync.prefix+chatroom+'/'+sync.digest_tree.root);
    var co = new ContentObject(n, str);
    co.sign(mykey);
    try {
	ndn.send(co);
    } catch (e) {
	console.log(e.toString());
    }
    sync.digest_tree.update(content,sync);
    if(sync.logfind(sync.digest_tree.root)==-1){
	console.log("heartbeat log add");
	var newlog = {digest:sync.digest_tree.root, data:content};
	sync.digest_log.push(newlog);
	var n = new Name(sync.prefix+chatroom+'/'+sync.digest_tree.root);
	var template = new Interest();
	template.interestLifetime = sync_lifetime;
	ndn.expressInterest(n, template, sync.onData.bind(sync), sync.syncTimeout.bind(sync));                
	console.log('Heartbeat Interest expressed.');
        console.log(n.to_uri());
    }        
}

//Send a chat message
Chat.prototype.SendMessage=function(){
    if(this.msgcache.length == 0){
	var d = new Date();
	var t = d.getTime();
 	this.msgcache.push({seqno:sync.usrseq,msgtype:"JOIN",msg:"xxx",time:t});
    }
    var msg = document.getElementById('fname').value.trim();
    var chatmsg = msg;
    //var chatmsg = $('<div/>').text(msg).html();  // encode special html characters to avoid script injection
    //forming Sync Data Packet
    if(chatmsg != ""){
	document.getElementById('fname').value = "";
	sync.usrseq++;
	var content = [new SyncState({name:chat_prefix,type:'UPDATE',seqno:{seq:sync.usrseq,session:session}})];
	var d = new Date();
	var t = d.getTime();
	this.msgcache.push({seqno:sync.usrseq,msgtype:"CHAT",msg:chatmsg,time:t});
	while (this.msgcache.length>this.maxmsgcachelength)
            this.msgcache.shift();
	var content_t = new SyncStateMsg({ss:content});
        var str = new Uint8Array(content_t.toArrayBuffer());
	var n = new Name(sync.prefix+chatroom+'/'+sync.digest_tree.root);
	var co = new ContentObject(n, str);
	co.sign(mykey);
	try {
	    ndn.send(co);
	} catch (e) {
	    console.log(e.toString());
	}
	sync.digest_tree.update(content,sync);
	if(sync.logfind(sync.digest_tree.root)==-1){
	    console.log("message log add");
	    var newlog = {digest:sync.digest_tree.root, data:content};
	    sync.digest_log.push(newlog);
	    var n = new Name(sync.prefix+chatroom+'/'+sync.digest_tree.root);
	    var template = new Interest();
	    template.interestLifetime = sync_lifetime;
	    ndn.expressInterest(n, template, sync.onData.bind(sync), sync.syncTimeout.bind(sync));           
	    console.log('Sync Interest expressed.');
            console.log(n.to_uri());
	    var tt = d.toLocaleTimeString();
	    var escaped_msg = $('<div/>').text(msg).html();  // encode special html characters to avoid script injection
	    document.getElementById('txt').innerHTML += '<p><grey>'+ screen_name+'-'+tt+':</grey><br />'+ escaped_msg + '</p>';          
	    var objDiv = document.getElementById("txt");      
	    objDiv.scrollTop = objDiv.scrollHeight;
	}
    }
    else
	alert("message cannot be empty");
}

//Send leave message and leave
Chat.prototype.Leave=function(){
    alert("Leaving the Chatroom...");
    $("#chat").hide();
    document.getElementById('room').innerHTML = 'Please close the window. Thank you';
    var i = 0;
    sync.usrseq++;
    /*var specialseq;
    var index_t = sync.digest_tree.find(specialnode,0);
    if(index_t==-1){
	specialseq = 0;
    }
    else{
	specialseq = sync.digest_tree.digestnode[index_t].seqno.seq+1;
    }*/
    var content = [new SyncState({name:chat_prefix,type:'UPDATE',seqno:{seq:sync.usrseq,session:sync.session}})];
    var d = new Date();
    var t = d.getTime();
    this.msgcache.push({seqno:sync.usrseq,msgtype:"LEAVE",msg:"xxx",time:t});
    while (this.msgcache.length>this.maxmsgcachelength)
        this.msgcache.shift();
    var content_t = new SyncStateMsg({ss:content});
    var str = new Uint8Array(content_t.toArrayBuffer());
    var n = new Name(sync.prefix+chatroom+'/'+sync.digest_tree.root);
    console.log(n.to_uri());
    var co = new ContentObject(n, str);
    co.sign(mykey);
    try {
	ndn.send(co);
	
    } catch (e) {
	console.log(e.toString());
    }
    sync.digest_tree.update(content,sync);
    console.log("leave log add");
    var newlog = {digest:sync.digest_tree.root, data:content};
    sync.digest_log.push(newlog);
    setTimeout(function(){ndn.close();},2000);	
}

//Check whether a user is leaving by checking whether his seqno has changed
Chat.prototype.alive=function(temp_seq,name,session,prefix){
    console.log("check alive");
    var index_n = sync.digest_tree.find(prefix,session);
    var n = this.roster.indexOf(name+session);
    if (index_n != -1 && n != -1){
	var seq = sync.digest_tree.digestnode[index_n].seqno.seq;
	if(temp_seq == seq){
	    this.roster.splice(n,1);
	    console.log(name+" leave");
	    var d = new Date();
            var t = d.toLocaleTimeString();
            document.getElementById('txt').innerHTML += '<div><b><grey>'+name+'-'+t+': Leave</grey></b><br /></div>'
	    var objDiv = document.getElementById("txt");      
	    objDiv.scrollTop = objDiv.scrollHeight;
	    document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
	    for(var i = 0;i<this.roster.length;i++){
		var name_t = this.roster[i].substring(0,this.roster[i].length-10);
		document.getElementById('menu').innerHTML += '<li>'+name_t+'</li>';
	    }
            document.getElementById('menu').innerHTML += '</ul>';
	}
    }
}

//Generate a random name for ChronoSync
function getRandomString () {
   var seed = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789';
   var result = '';
   for (var i = 0; i < 10; i++) {
       var pos = Math.floor(Math.random() * seed.length);
       result += seed[pos];
   }
   return result;
}
