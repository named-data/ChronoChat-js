//Chronosync with log operation as well as interest and data processing
var Sync = function Sync(){
    this.digest_tree = new Digest_Tree();
    this.digest_log = new Array();
    this.usrseq = -1;
    
};

Sync.prototype.logfind = function(digest){

    for(var i = 0;i<this.digest_log.length;i++){
	if(digest == this.digest_log[i].digest)
	    return i;
    }
    return -1;
};

Sync.prototype.make_onInterest = function(sendInterest,initialchat){
    var self = this;
    return function(inst){
        //search if the digest is already exist in the digest log
        console.log('Sync Interest received in callback.');
        console.log(inst.name.to_uri());
        var syncdigest = DataUtils.toHex(inst.name.components[4])
        if(inst.name.components.length == 6 || syncdigest == "0000"){
        //console.log("send back recovery data");
	    self.processRecoveryInst(inst);
        }
        else{
	//console.log("syncdigest: "+syncdigest);
	//console.log("root: "+digest_tree.root);
	    if(syncdigest != self.digest_tree.root){
                console.log("digest doesn't equal");
	        var index = self.logfind(syncdigest);
	        var content = [];
	        if(index == -1){
		    setTimeout(function(){self.judgeRecovery(syncdigest,sendInterest,initialchat);},2000);
		    console.log("set timer recover");
	        }
	        else{

		    self.processSyncInst(index,syncdigest);
	        }
	    }
        }
    }
};

Sync.prototype.make_onData = function(sendInterest,initialchat){
    var self = this;
    return function(inst,co){
	console.log("Sync ContentObject received in callback");
	console.log('name:'+co.name.to_uri());
	var content = JSON.parse(DataUtils.toString(co.content));
	console.log(DataUtils.toString(co.content));
	console.log(content);
	if(self.digest_tree.root == "0000"){
	    (self.initialOndata())(content,initialchat);
	}
	else{
	    self.digest_tree.update(content,self);
	//console.log(content);
	    if(self.logfind(self.digest_tree.root)==-1){
	        console.log("sync log add");
	        var newlog = {digest:self.digest_tree.root, data:content};
	        self.digest_log.push(newlog);
	    //console.log("addlog:"+this.digest_tree.root);
	    }
	}
	sendInterest(content);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(self.digest_tree.root));
	var template = new Interest();
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, self.make_onData(sendInterest,initialchat), self.make_syncTimeout(sendInterest,initialchat));
	console.log("Syncinterest expressed:");
	console.log(n.to_uri());
    }
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
        var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
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

Sync.prototype.sendRecovery=function(syncdigest_t,sendInterest,initialchat){
    console.log("unknown digest: ")
    console.log(syncdigest_t);
    console.log(this.digest_tree.root);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/recovery/');
    n.append(DataUtils.toNumbers(syncdigest_t));
    var template = new Interest();
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, this.make_onData(sendInterest,initialchat), this.make_syncTimeout(sendInterest,initialchat));
    console.log("Recovery Syncinterest expressed:"); 
    console.log(n.to_uri());
};

Sync.prototype.judgeRecovery = function(syncdigest_t,sendInterest,initialchat){
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
        this.sendRecovery(syncdigest_t,sendInterest,initialchat);
    }
};

Sync.prototype.make_syncTimeout = function(sendInterest,initialchat){
    var self = this;
    return function(interest) {
        console.log("Sync Interest time out.");
        console.log('Sync Interest name: ' + interest.name.to_uri());
        var component = DataUtils.toHex(interest.name.components[4]);
    //console.log(component);
        if(component == self.digest_tree.root){
	    var n = new Name(interest.name);
	    var template = new Interest();
	    template.interestLifetime = 10000;
	    ndn.expressInterest(n, template, self.make_onData(sendInterest,initialchat), self.make_syncTimeout(sendInterest,initialchat));
	    console.log("Syncinterest expressed:");
	    console.log(n.to_uri());
        }
    }                  
};

Sync.prototype.initialOndata = function(){
    var self = this;
    return function(content,initialchat){
    //user is a new comer and receive data of all other people in the group
        self.digest_tree.update(content,self);
        if(self.logfind(self.digest_tree.root)==-1){
            console.log("sync log add");
            var newlog = {digest:self.digest_tree.root, data:content};
            self.digest_log.push(newlog);
        }
        var digest_t = self.digest_tree.root;
        for(var i = 0;i<content.length;i++){
            if(content[i].name == usrname){//if the user was an olde comer, after add the static log he need to increase his seqno by 1
	        var content_t = [{name:usrname,seqno:content[i].seqno+1}];
	        self.digest_tree.update(content_t,self);
	        if(self.logfind(self.digest_tree.root)==-1){
	            var newlog = {digest:self.digest_tree.root, data:content_t};
	            self.digest_log.push(newlog);
 		    initialchat(self.usrseq);
	        }
            }
        }
        var content_t =[]
        if(self.usrseq>=0){//send the data packet with new seqno back
    	    content_t[0] = {name:usrname,seqno:self.usrseq};
        }
        else
    	    content_t[0] = {name:usrname,seqno:0};
        var str = JSON.stringify(content_t);
        var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
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
    	if(self.digest_tree.find(usrname)==-1){//the user haven't put himself in the digest tree which means he is a new comer
	    console.log("initial state")
	    self.usrseq++;
	    var content = [{name:usrname,seqno:self.usrseq}];
	    self.digest_tree.update(content,self);
	    if(self.logfind(self.digest_tree.root)==-1){
	        console.log("initial log add");
	    	var newlog = {digest:self.digest_tree.root, data:content};
	    	self.digest_log.push(newlog);
	    	initialchat(self.usrseq);
	    }
    	}
    }
};


Sync.prototype.make_initialTimeOut = function(sendInterest,initialchat){
    var self = this;
    return function(interest){
        console.log("initial sync timeout");
        console.log("no other people");
        console.log(self);
        self.digest_tree.initial();
        self.usrseq++;
        initialchat(self.usrseq);
	var newlog = {digest:self.digest_tree.root, data:[{name:usrname,seqno:self.usrseq}]};
	self.digest_log.push(newlog);
	//console.log("addlog:"+digest_tree.root);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(self.digest_tree.root));
	var template = new Interest();
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, self.make_onData(sendInterest,initialchat), self.make_syncTimeout(sendInterest,initialchat));
	console.log("Syncinterest expressed:");
	console.log(n.to_uri());
    }
};
