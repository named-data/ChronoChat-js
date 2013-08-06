//Chronosync with log operation as well as interest and data processing
var Sync = function Sync(sendchatinterest,initialchat){
    this.digest_tree = new Digest_Tree();
    this.digest_log = new Array();
    this.usrseq = -1;
    this.sendChatInterest = sendchatinterest;
    this.InitialChat = initialchat;
    this.prefix = '/ndn/broadcast/chronos/';
};

Sync.prototype.logfind = function(digest){

    for(var i = 0;i<this.digest_log.length;i++){
	if(digest == this.digest_log[i].digest)
	    return i;
    }
    return -1;
};

Sync.prototype.onInterest = function(inst){
    //search if the digest is already exist in the digest log
    console.log('Sync Interest received in callback.');
    console.log(inst.name.to_uri());
    var syncdigest = DataUtils.toHex(inst.name.components[4])
    if(inst.name.components.length == 6 || syncdigest == "0000"){
    //console.log("send back recovery data");
	this.processRecoveryInst(inst);
    }
    else{
	if(syncdigest != this.digest_tree.root){
            console.log("digest doesn't equal");
	    var index = this.logfind(syncdigest);
	    var content = [];
	    if(index == -1){
                var self = this;
		setTimeout(function(){self.judgeRecovery(syncdigest);},2000);
		console.log("set timer recover");
	    }
	    else{

		this.processSyncInst(index,syncdigest);
	    }
	}
    }

};

Sync.prototype.onData = function(inst,co){
    console.log("Sync ContentObject received in callback");
    console.log('name:'+co.name.to_uri());
    var content = JSON.parse(DataUtils.toString(co.content));
    console.log(DataUtils.toString(co.content));
    console.log(content);
    if(this.digest_tree.root == "0000"){
	this.initialOndata(content);
    }
    else{
	this.digest_tree.update(content,this);
	//console.log(content);
	if(this.logfind(this.digest_tree.root)==-1){
	    console.log("sync log add");
	    var newlog = {digest:this.digest_tree.root, data:content};
            this.digest_log.push(newlog);
	    //console.log("addlog:"+this.digest_tree.root);
	}
    }
    this.sendChatInterest(content);
    var n = new Name(this.prefix+chatroom+'/');
    n.append(DataUtils.toNumbers(this.digest_tree.root));
    var template = new Interest();
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
    console.log("Syncinterest expressed:");
    console.log(n.to_uri());
};

Sync.prototype.processRecoveryInst=function(inst){
    var content = [];
    for(var i = 0;i<this.digest_tree.digestnode.length;i++){
	content[i] = {name:this.digest_tree.digestnode[i].prefix_name,seqno:this.digest_tree.digestnode[i].seqno};
    }
    if(content.length!=0){
	var str = JSON.stringify(content);
	var co = new ContentObject(inst.name, str);
	co.sign(mykey, {'keyName':mykeyname});
	try {
	    ndn.send(co);
      	    console.log("send recovery data back");
            console.log(content);
            console.log(inst.name.to_uri());
	} catch (e) {
	    console.log(e.toString());
	}
    }
};

Sync.prototype.processSyncInst = function(index,syncdigest_t){
    var content = [];
    var data_name = [];
    var data_seq = [];
    var data_ses = [];
    //console.log(digest_log.length);
    for(var j = index+1;j<this.digest_log.length;j++){
        var temp = this.digest_log[j].data;
        for(var i = 0;i<temp.length;i++){
	    if(this.digest_tree.find(temp[i].name)!=-1){
	        var n = data_name.indexOf(temp[i].name);
	        if(n = -1){
	    	    data_name.push(temp[i].name);
	    	    data_seq.push(temp[i].seqno);
	        }
	        else{
	    	    data_seq[n] = temp[i].seqno;
	        }
	    }
        }
    }
    console.log("search log finished");
    for(var i = 0;i<data_name.length;i++){
        content[i] = { name:data_name[i],seqno:data_seq[i]};
    }
    if(content.length!=0){
        var str = JSON.stringify(content);
        var n = new Name(this.prefix+chatroom+'/');
        n.append(DataUtils.toNumbers(syncdigest_t));
        var co = new ContentObject(n, str);
        co.sign(mykey, {'keyName':mykeyname});
        try {
	    ndn.send(co);
	    console.log("Sync Data send");
            console.log(n.to_uri());
            console.log(content);
        } catch (e) {
	    console.log(e.toString());
        }
    }
};

Sync.prototype.sendRecovery=function(syncdigest_t){
    console.log("unknown digest: ")
    console.log(syncdigest_t);
    console.log(this.digest_tree.root);
    var n = new Name(this.prefix+chatroom+'/recovery/');
    n.append(DataUtils.toNumbers(syncdigest_t));
    var template = new Interest();
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
    console.log("Recovery Syncinterest expressed:"); 
    console.log(n.to_uri());
};

Sync.prototype.judgeRecovery = function(syncdigest_t){
    console.log("timer end");
    var index2 = this.logfind(syncdigest_t);
    //console.log(index2);
    //console.log(this.digest_log);
    if(index2 != -1){
        if(syncdigest_t!=this.digest_tree.root){
	    this.processSyncInst(index2,syncdigest_t);
	}
    }
    else{
        this.sendRecovery(syncdigest_t);
    }
};

Sync.prototype.syncTimeout = function(interest) {
    console.log("Sync Interest time out.");
    console.log('Sync Interest name: ' + interest.name.to_uri());
    var component = DataUtils.toHex(interest.name.components[4]);
    //console.log(component);
    if(component == this.digest_tree.root){
	var n = new Name(interest.name);
	var template = new Interest();
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
	console.log("Syncinterest expressed:");
	console.log(n.to_uri());
    }                 
};

Sync.prototype.initialOndata = function(content){
    //user is a new comer and receive data of all other people in the group
        this.digest_tree.update(content,this);
        if(this.logfind(this.digest_tree.root)==-1){
            console.log("sync log add");
            var newlog = {digest:this.digest_tree.root, data:content};
            this.digest_log.push(newlog);
        }
        var digest_t = this.digest_tree.root;
        for(var i = 0;i<content.length;i++){
            if(content[i].name == usrname){//if the user was an olde comer, after add the static log he need to increase his seqno by 1
	        var content_t = [{name:usrname,seqno:content[i].seqno+1}];
	        this.digest_tree.update(content_t,this);
	        if(this.logfind(this.digest_tree.root)==-1){
	            var newlog = {digest:this.digest_tree.root, data:content_t};
	            this.digest_log.push(newlog);
 		    this.InitialChat(this.usrseq);
	        }
            }
        }
        var content_t =[]
        if(this.usrseq>=0){//send the data packet with new seqno back
    	    content_t[0] = {name:usrname,seqno:this.usrseq};
        }
        else
    	    content_t[0] = {name:usrname,seqno:0};
        var str = JSON.stringify(content_t);
        var n = new Name(this.prefix+chatroom+'/');
        n.append(DataUtils.toNumbers(digest_t));
        var co = new ContentObject(n, str);
        co.sign(mykey, {'keyName':mykeyname});
        console.log("initial update data sending back");
        console.log(content_t);
        console.log(n.to_uri());
        try {
    	    ndn.send(co);
    
        } catch (e) {
    	    console.log(e.toString());
        }
    	if(this.digest_tree.find(usrname)==-1){//the user haven't put himself in the digest tree which means he is a new comer
	    console.log("initial state")
	    this.usrseq++;
	    var content = [{name:usrname,seqno:this.usrseq}];
	    this.digest_tree.update(content,this);
	    if(this.logfind(this.digest_tree.root)==-1){
	        console.log("initial log add");
	    	var newlog = {digest:this.digest_tree.root, data:content};
	    	this.digest_log.push(newlog);
	    	this.InitialChat(this.usrseq);
	    }
    	}
};


Sync.prototype.initialTimeOut = function(interest){
        console.log("initial sync timeout");
        console.log("no other people");
        console.log(this);
        this.digest_tree.initial();
        this.usrseq++;
        this.InitialChat(this.usrseq);
	var newlog = {digest:this.digest_tree.root, data:[{name:usrname,seqno:this.usrseq}]};
	this.digest_log.push(newlog);
	//console.log("addlog:"+digest_tree.root);
	var n = new Name(this.prefix+chatroom+'/');
	n.append(DataUtils.toNumbers(this.digest_tree.root));
	var template = new Interest();
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
	console.log("Syncinterest expressed:");
	console.log(n.to_uri());
};
