function onChatInterest(inst){
//need msgcache
    console.log('Chat Interest received in callback.');
    console.log(inst.name.to_uri());
    var content;
    var seq = parseInt(DataUtils.toString(inst.name.components[5]));/////
    console.log("seq");
    console.log(seq)
    for(var i = msgcache.length-1;i>=0;i--){
	//console.log("msgseq:"+msgcache[i].seqno);
        if(msgcache[i].seqno ==seq){
            content = {msg:msgcache[i].msg,type:msgcache[i].msgtype};
            JSON.stringify(content);
            break;
        }
    }
    console.log("msg find:");
    console.log(content);
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

function onChatData(inst,co){
    console.log("Chat ContentObject received in callback");
    console.log('name'+co.name.to_uri());

    var content = JSON.parse(DataUtils.toString(co.content));
    var name = DataUtils.toString(co.name.components[3]);
    if (content.type =="chat"){
        //display on the screen
        var d = new Date();//get time
        var t = d.toLocaleTimeString();
        document.getElementById('txt').innerHTML +='<p>'+ name+'-'+t+':'+content.msg+'</p>';
	var objDiv = document.getElementById("txt");      
	objDiv.scrollTop = objDiv.scrollHeight;
    }
    else if(content.type == "leave"){
        var n = rosterfind(name);
        roster.splice(n,1);
        console.log(name+" leave");
    }
    else{
	var temp_seq = parseInt(DataUtils.toString(inst.name.components[5]));
	setTimeout(function(){alive(temp_seq,name);},120000);
	console.log("set timer");//functions only after the another user anounce his arrival
    }
}

var rosterfind = function (name) {
    for (var i = 0;i<roster.length;i++){
        if(roster[i].name == name){
            return i;
        }
    }
};

/*var heart_timeout = function(interest) {
        console.log("Hearbeat Interest time out.");
        console.log('Hearbeat Interest name: ' + interest.name.to_uri());
                                  
    };
    */
function heartbeat(){
    usrseq++;
    console.log("heartbeat:"+usrseq);//////
    var content = [{name:usrname,seqno:usrseq}];
    //console.log(content);
    msgcache.push({seqno:usrseq,msgtype:"heartbeat",msg:"xxx"});
    while (msgcache.length>maxmsgcachelength)
        msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
    try {
	    ndn.send(co);
	    if(digest_tree.root == "unavailable")
		leaveflag = 1;
    } catch (e) {
	    console.log(e.toString());
    }
    digest_tree.update(content);
    console.log("heartbeat log add");
    addlog(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var template = new Interest();
    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, onSyncData, sync_timeout);                
    console.log('Heartbeat Interest expressed.');          
}

function SendMessage(){
    var chatmsg = document.getElementById('fname').value;
    document.getElementById('fname').value = "";
    usrseq++;
    console.log("sendmessage:"+usrseq);
    var content = [{name:usrname,seqno:usrseq}];
    msgcache.push({seqno:usrseq,msgtype:"chat",msg:chatmsg});
    while (msgcache.length>maxmsgcachelength)
        msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
    try {
	    ndn.send(co);
    } catch (e) {
	    console.log(e.toString());
    }
    digest_tree.update(content);
    console.log("message log add");
    addlog(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var template = new Interest();
    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, onSyncData, sync_timeout);              
    console.log('Sync Interest expressed.');
    //console.log(template.name.to_uri());
    var d = new Date();//get time
    var t = d.toLocaleTimeString();
    document.getElementById('txt').innerHTML += '<p>'+ usrname+'-'+t+':'+chatmsg + '</p>';          
    var objDiv = document.getElementById("txt");      
    objDiv.scrollTop = objDiv.scrollHeight;
}

function Leave(){
    alert("Leaving the Chatroom...");
    var i = 0;
    usrseq++;
    var content = [{name:usrname,seqno:usrseq}];
    msgcache.push({seqno:usrseq,msgtype:"leave",msg:"xxx"});
    while (msgcache.length>maxmsgcachelength)
        msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
    try {
	ndn.send(co);
    } catch (e) {
	console.log(e.toString());
    }
    digest_tree.update(content);
    console.log("leave log add");
    addlog(content);
    setTimeout(function(){window.close();},2000);	
    //window.close();
}

function alive(temp_seq,name){
    var index_n = digest_tree.find(name);
    var n = roster.indexOf(name);
    //console.log("name:"+name);
    //console.log("seqno"+temp_seq);
    if (index_n != -1){
	var seq = digest_tree.digestnode[index_n].seqno;
	if(temp_seq == seq){
	    roster.splice(n,1);
	    console.log(name+" leave");
	}
    }
}
