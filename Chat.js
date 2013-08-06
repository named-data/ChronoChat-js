var Chat = function Chat(){
    this.msgcache = new Array();
    this.roster = new Array();
    this.maxmsgcachelength = 100;
};

Chat.prototype.initial = function(seqno){
    console.log("initial chat");
    var self = this;
    var myVar = setInterval(function(){self.heartbeat();},60000);
    if(this.roster.indexOf(screen_name) == -1){
	this.roster.push(screen_name);
	document.getElementById('menu').innerHTML = '<p><b>Member</b></p>';
	document.getElementById('menu').innerHTML += '<ul><li>'+this.roster[0]+'</li></ul>';
	var d = new Date();
	var t = d.getTime();
	this.msgcache.push({seqno:sync.usrseq,msgtype:"join",msg:"xxx",time:t});
	while (this.msgcache.length>this.maxmsgcachelength)
            this.msgcache.shift();
    }
};

Chat.prototype.sendInterest = function(content){
    for(var i = 0; i<content.length;i++){
        var name_t = content[i].name.substring(0,content[i].name.length-13);
	if(name_t!=screen_name){//won't fetch the data from user that has the same name as me
            var session = content[i].name.substring(content[i].name.length-13,content[i].name.length)
	    var n = new Name(chat_prefix+'/'+name_t+'/'+chatroom+'/'+session+'/'+content[i].seqno);
	    var template = new Interest();
	    template.interestLifetime = 10000;
	    ndn.expressInterest(n, template, this.onData.bind(this), this.chatTimeout.bind(this));
	    console.log(n.to_uri());
	    console.log('Chat Interest expressed.');
        }
    }
};

Chat.prototype.onInterest = function(inst){
//need msgcache
    console.log('Chat Interest received in callback.');
    console.log(inst.name.to_uri());
    var content = {};
    var seq = parseInt(DataUtils.toString(inst.name.components[6]));/////
    //console.log("seq"+seq);
    for(var i = this.msgcache.length-1;i>=0;i--){
//console.log("msgseq:"+msgcache[i].seqno);
        if(this.msgcache[i].seqno ==seq){
            content = {msg:this.msgcache[i].msg,type:this.msgcache[i].msgtype,time:this.msgcache[i].time};
            break;
        }
    }
    if(content.msg != null){
        var str = JSON.stringify(content);
        var co = new ContentObject(inst.name,str);
        co.sign(mykey,{'keyName':mykeyname});

        try {
            ndn.send(co);
        } 
        catch (e) {
            console.log(e.toString());
    	}
    }
};

Chat.prototype.onData = function(inst,co){
    console.log("Chat ContentObject received in callback");
    console.log('name'+co.name.to_uri());
    var content = JSON.parse(DataUtils.toString(co.content));
    var name = DataUtils.toString(co.name.components[3]);
    var seqno = DataUtils.toString(co.name.components[6]);
    if(this.roster.indexOf(name)==-1 &&content.type!="leave"){
    	this.roster.push(name);
	document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
    	for(var i = 0;i<this.roster.length;i++){
	    document.getElementById('menu').innerHTML += '<li>'+this.roster[i]+'</li>';
    	}
    	document.getElementById('menu').innerHTML += '</ul>';
    }
    var name_t = name+DataUtils.toString(co.name.components[5]);
    var self = this;
    setTimeout(function(){self.alive(seqno,name_t);},120000);
    if (content.type =="chat"){
        //display on the screen
        var d = new Date(content.time);
        var t = d.toLocaleTimeString();
        document.getElementById('txt').innerHTML +='<p><grey>'+ name+'-'+t+':</grey><br />'+content.msg+'</p>';
	var objDiv = document.getElementById("txt");      
	objDiv.scrollTop = objDiv.scrollHeight;
    }
    else if(content.type == "leave"){
        var n = this.roster.indexOf(name);
	if(n!=-1 && name!=screen_name){
            this.roster.splice(n,1);
	    document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
	    for(var i = 0;i<this.roster.length;i++){
	        document.getElementById('menu').innerHTML += '<li>'+this.roster[i]+'</li>';
	    }
            document.getElementById('menu').innerHTML += '</ul>';
            console.log(name+" leave");
	}
    }

};

Chat.prototype.chatTimeout = function(interest){
    console.log("no chat data coming back");
};

Chat.prototype.heartbeat=function(){
    if(this.msgcache.length == 0){
	var d = new Date();
	var t = d.getTime();
 	this.msgcache.push({seqno:sync.usrseq,msgtype:"join",msg:"xxx",time:t});
    }
    sync.usrseq++;
    //console.log("heartbeat:"+usrseq);
    var content = [{name:usrname,seqno:sync.usrseq}];
    //console.log(content);
    var d = new Date();
    var t = d.getTime();
    this.msgcache.push({seqno:sync.usrseq,msgtype:"heartbeat",msg:"xxx",time:t});
    while (this.msgcache.length>this.maxmsgcachelength)
        this.msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name(sync.prefix+chatroom+'/');
    n.append(DataUtils.toNumbers(sync.digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
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
	//console.log("addlog:"+digest_tree.root);
	var n = new Name(sync.prefix+chatroom+'/');
	n.append(DataUtils.toNumbers(sync.digest_tree.root));
	var template = new Interest();
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, sync.onData.bind(sync), sync.syncTimeout.bind(sync));                
	console.log('Heartbeat Interest expressed.');
        console.log(n.to_uri());
    }        
}

Chat.prototype.SendMessage=function(){
    if(this.msgcache.length == 0){
	var d = new Date();
	var t = d.getTime();
 	this.msgcache.push({seqno:sync.usrseq,msgtype:"join",msg:"xxx",time:t});
    }
    var msg = document.getElementById('fname').value;
    var chatmsg = msg.trim();
    if(chatmsg != ""){
	document.getElementById('fname').value = "";
	sync.usrseq++;
	console.log("sendmessage:"+sync.usrseq);//////
	var content = [{name:usrname,seqno:sync.usrseq}];
	var d = new Date();
	var t = d.getTime();
	this.msgcache.push({seqno:sync.usrseq,msgtype:"chat",msg:chatmsg,time:t});
	while (this.msgcache.length>this.maxmsgcachelength)
            this.msgcache.shift();
	var str = JSON.stringify(content);
	var n = new Name(sync.prefix+chatroom+'/');
	n.append(DataUtils.toNumbers(sync.digest_tree.root));
	var co = new ContentObject(n, str);
	co.sign(mykey, {'keyName':mykeyname});
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
	    //console.log("addlog:"+digest_tree.root);
	    var n = new Name(sync.prefix+chatroom+'/');
	    n.append(DataUtils.toNumbers(sync.digest_tree.root));
	    var template = new Interest();
	    template.interestLifetime = 10000;
	    ndn.expressInterest(n, template, sync.onData.bind(sync), sync.syncTimeout.bind(sync));           
	    console.log('Sync Interest expressed.');
            console.log(n.to_uri());
	    var tt = d.toLocaleTimeString();
	    document.getElementById('txt').innerHTML += '<p><grey>'+ screen_name+'-'+tt+':</grey><br />'+chatmsg + '</p>';          
	    var objDiv = document.getElementById("txt");      
	    objDiv.scrollTop = objDiv.scrollHeight;
	}
    }
    else
	alert("message cannot be empty");
}

Chat.prototype.Leave=function(){
    alert("Leaving the Chatroom...");
    var i = 0;
    sync.usrseq++;
    var content = [{name:usrname,seqno:sync.usrseq}];
    var d = new Date();
    var t = d.getTime();
    this.msgcache.push({seqno:sync.usrseq,msgtype:"leave",msg:"xxx",time:t});
    while (this.msgcache.length>this.maxmsgcachelength)
        this.msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name(sync.prefix+chatroom+'/');
    n.append(DataUtils.toNumbers(sync.digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
    try {
	ndn.send(co);
    } catch (e) {
	console.log(e.toString());
    }
    sync.digest_tree.update(content,sync);
    console.log("leave log add");
    var newlog = {digest:sync.digest_tree.root, data:content};
    sync.digest_log.push(newlog);
    //console.log("addlog:"+digest_tree.root);
    setTimeout(function(){window.close();},2000);	
    //window.close();
}

Chat.prototype.alive=function(temp_seq,name){
    console.log("check alive");
    var index_n = sync.digest_tree.find(name);
    var name_t = name.substring(0,name.length-13);
    var n = this.roster.indexOf(name_t);
    console.log(n);
    console.log(index_n);
    //console.log("name:"+name);
    //console.log("seqno"+temp_seq);
    if (index_n != -1 && n != -1){
	var seq = sync.digest_tree.digestnode[index_n].seqno;
	if(temp_seq == seq){
	    this.roster.splice(n,1);
	    console.log(name+" leave");
	    document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
	    for(var i = 0;i<this.roster.length;i++){
		document.getElementById('menu').innerHTML += '<li>'+this.roster[i]+'</li>';
	    }
            document.getElementById('menu').innerHTML += '</ul>';
	}
    }
}
