/**
 *   Copyright (C) 2013 Regents of the University of California 
 *   Authors:   Qiuhan Ding <dingqiuhan@gmail.com>, Wentao Shang <wentaoshang@gmail.com>
 *   BSD License, see LICENSE file. 
 *   
 *   Sync interest and sync data processing
 *   Using SyncState and SyncStateMsg Protobuf for Sync Data Packet
 */

function pokeData(data) { face.transport.send(data.wireEncode().buf()); }

//Chronosync with log operation as well as interest and data processing
var ChronoSync = function ChronoSync(sendchatinterest,initialchat,chatroom,session){
    this.digest_tree = new Digest_Tree();
    this.digest_log = new Array();
    this.usrseq = -1;
    this.sendChatInterest = sendchatinterest;
    this.InitialChat = initialchat;
    this.prefix = '/ndn/broadcast/ChronoChat-0.3/';
    this.chatroom = chatroom;
    this.session = session;
    this.chat_prefix;
    this.flag = 0;//The will not display the old chatmsg on the screen if the flag is 1
};

//Search the digest log by digest
ChronoSync.prototype.logfind = function(digest){

    for(var i = 0;i<this.digest_log.length;i++){
    if(digest == this.digest_log[i].digest)
        return i;
    }
    return -1;
};

//Processing Sync Interest
ChronoSync.prototype.onInterest = function(prefix, inst, transport){
    //search if the digest is already exist in the digest log
    console.log('Sync Interest received in callback.');
    console.log(inst.getName().toUri());
    var syncdigest = DataUtils.toString(inst.getName().get(4).getValue().buf());
    if(inst.getName().size() == 6){
        syncdigest = DataUtils.toString(inst.getName().get(5).getValue().buf());
    }
    if(inst.getName().size() == 6 || syncdigest == "00"){
    //Recovery interest or new comer interest
    this.processRecoveryInst(inst,syncdigest, transport);
    }
    else{
    if(syncdigest != this.digest_tree.root){
        var index = this.logfind(syncdigest);
        var content = [];
        if(index == -1){
                var self = this;
        //Wait 2 seconds to see whether there is any data packet coming back
        setTimeout(function(){self.judgeRecovery(syncdigest, transport);},2000);
        console.log("set timer recover");
        }
        else{
        //common interest processing
        this.processSyncInst(index,syncdigest, transport);
        }
    }
    }

};

//Processing Sync Data
ChronoSync.prototype.onData = function(inst,co){
    console.log("Sync ContentObject received in callback");
    console.log('name:'+co.getName().toUri());
    var arr = new Uint8Array(co.getContent().size());
    arr.set(co.getContent().buf());
    var content_t = SyncStateMsg.decode(arr.buffer);
    var content = content_t.ss;
    if(this.digest_tree.root == "00"){
    this.flag = 1;
    //processing initial sync data
    this.initialOndata(content);
    }
    else{
    this.digest_tree.update(content,this);
    if(this.logfind(this.digest_tree.root)==-1){
        var newlog = {digest:this.digest_tree.root, data:content};
            this.digest_log.push(newlog);
    }
    if(inst.getName().size() == 6)
        this.flag = 1;
    else
        this.flag = 0;
    }
    //send Chat Interest to fetch data, this can be changed to other function in other applications
    this.sendChatInterest(content);
    var n = new Name(this.prefix+this.chatroom+'/'+this.digest_tree.root);
    var template = new Interest();
    template.setInterestLifetimeMilliseconds(sync_lifetime);
    face.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
    console.log("Syncinterest expressed:");
    console.log(n.toUri());
};

//Process Recovery Interest, go through digest tree and send data including info of all nodes
ChronoSync.prototype.processRecoveryInst=function(inst,syncdigest, transport){
    if(this.logfind(syncdigest)!=-1){
    var content = [];
    for(var i = 0;i<this.digest_tree.digestnode.length;i++){
        content[i] = new SyncState({name:this.digest_tree.digestnode[i].prefix_name,type:'UPDATE',seqno:{seq:this.digest_tree.digestnode[i].seqno.seq,session:this.digest_tree.digestnode[i].seqno.session}});
    }
    if(content.length!=0){
        var content_t = new SyncStateMsg({ss:content});
        var str = new Uint8Array(content_t.toArrayBuffer());
        var co = new ContentObject(inst.getName(), str);
        co.sign();
        try {
        transport.send(co.wireEncode().buf());
              console.log("send recovery data back");
        console.log(inst.getName().toUri());
        } catch (e) {
        console.log(e.toString());
        }
    }
    }
};

//Common Interest Processing, using digest log to find the difference after syncdigest_t
ChronoSync.prototype.processSyncInst = function(index,syncdigest_t, transport){
    var content = [];
    var data_name = [];
    var data_seq = [];
    var data_ses = [];
    for(var j = index+1;j<this.digest_log.length;j++){
        var temp = this.digest_log[j].data;
        for(var i = 0;i<temp.length;i++){
        if(temp[i].type != 0){
        continue;
        }
        if(this.digest_tree.find(temp[i].name,temp[i].seqno.session)!=-1){
            var n = data_name.indexOf(temp[i].name);
            if(n = -1){
                data_name.push(temp[i].name);
                data_seq.push(temp[i].seqno.seq);
            data_ses.push(temp[i].seqno.session);
            }
            else{
                data_seq[n] = temp[i].seqno.seq;
            data_ses[n] = temp[i].seqno.session;
            }
        }
        }
    }
    for(var i = 0;i<data_name.length;i++){
    content[i] = new SyncState({name:data_name[i],type:'UPDATE',seqno:{seq:data_seq[i],session:data_ses[i]}});
    }
    if(content.length!=0){
        var content_t = new SyncStateMsg({ss:content});
    var str = new Uint8Array(content_t.toArrayBuffer());
        var n = new Name(this.prefix+this.chatroom+'/'+syncdigest_t);
        var co = new ContentObject(n, str);
        co.sign();
        try {
          transport.send(co.wireEncode().buf());
        console.log("Sync Data send");
            console.log(n.toUri());
        } catch (e) {
        console.log(e.toString());
        }
    }
};

//Send Recovery Interest
ChronoSync.prototype.sendRecovery=function(syncdigest_t){
    console.log("unknown digest: ")
    var n = new Name(this.prefix+this.chatroom+'/recovery/'+syncdigest_t);
    var template = new Interest();
    template.setInterestLifetimeMilliseconds(sync_lifetime);
    face.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
    console.log("Recovery Syncinterest expressed:"); 
    console.log(n.toUri());
};

//check if recovery is need
ChronoSync.prototype.judgeRecovery = function(syncdigest_t, transport){
    var index2 = this.logfind(syncdigest_t);
    if(index2 != -1){
        if(syncdigest_t!=this.digest_tree.root){
        this.processSyncInst(index2,syncdigest_t, transport);
    }
    }
    else{
        this.sendRecovery(syncdigest_t);
    }
};

//Sync interest time out, if the interest is the static one send again
ChronoSync.prototype.syncTimeout = function(interest) {
    console.log("Sync Interest time out.");
    console.log('Sync Interest name: ' + interest.getName().toUri());
    var component = DataUtils.toString(interest.getName().get(4).getValue().buf());
    if(component == this.digest_tree.root){
    var n = new Name(interest.getName());
    var template = new Interest();
    template.setInterestLifetimeMilliseconds(sync_lifetime);
    face.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
    console.log("Syncinterest expressed:");
    console.log(n.toUri());
    }                 
};

//Process initial data which usually include all other users' info in the chatroom, and send back the new comer's own info
ChronoSync.prototype.initialOndata = function(content){
    //user is a new comer and receive data of all other people in the group
    this.digest_tree.update(content,this);
    if(this.logfind(this.digest_tree.root)==-1){
        var newlog = {digest:this.digest_tree.root, data:content};
        this.digest_log.push(newlog);
    }
    var digest_t = this.digest_tree.root;
    for(var i = 0;i<content.length;i++){
        if(content[i].name == this.chat_prefix && content[i].seqno.session == this.session){
        //if the user was an olde comer, after add the static log he need to increase his seqno by 1
        var content_t = [new SyncState({name:this.chat_prefix,type:'UPDATE',seqno:{seq:content[i].seqno.seq+1,session:this.session}})];
        this.digest_tree.update(content_t,this);
        if(this.logfind(this.digest_tree.root)==-1){
            var newlog = {digest:this.digest_tree.root, data:content_t};
            this.digest_log.push(newlog);
         this.InitialChat();
        }
        }
    }
    var content_t =[]
    if(this.usrseq>=0){
    //send the data packet with new seqno back
        content_t[0] = new SyncState({name:this.chat_prefix,type:'UPDATE',seqno:{seq:this.usrseq,session:this.session}});
    }
    else
        content_t[0] = new SyncState({name:this.chat_prefix,type:'UPDATE',seqno:{seq:0,session:this.session}});
    var content_tt = new SyncStateMsg({ss:content_t});
    var str = new Uint8Array(content_tt.toArrayBuffer());
    var n = new Name(this.prefix+this.chatroom+'/'+digest_t);
    var co = new ContentObject(n, str);
    co.sign();
    console.log("initial update data sending back");
    console.log(n.toUri());
    try {
        pokeData(co);
    
    } catch (e) {
        console.log(e.toString());
    }
    if(this.digest_tree.find(this.chat_prefix,this.session)==-1){
    //the user haven't put himself in the digest tree
    console.log("initial state")
    this.usrseq++;
    var content = [new SyncState({name:this.chat_prefix,type:'UPDATE',seqno:{seq:this.usrseq,session:this.session}})];
    this.digest_tree.update(content,this);
    if(this.logfind(this.digest_tree.root)==-1){
        var newlog = {digest:this.digest_tree.root, data:content};
        this.digest_log.push(newlog);
        this.InitialChat();
    }
    }
};

//Initial sync interest timeout, which means there are no other people in the chatroom
ChronoSync.prototype.initialTimeOut = function(interest){
    console.log("initial sync timeout");
    console.log("no other people");
    this.digest_tree.initial(this);
    this.usrseq++;
    this.InitialChat();
    var content = [new SyncState({name:this.chat_prefix,type:'UPDATE',seqno:{seq:this.usrseq,session:this.session}})];
    var newlog = {digest:this.digest_tree.root, data:content};
    this.digest_log.push(newlog);
    var n = new Name(this.prefix+this.chatroom+'/'+this.digest_tree.root);
    var template = new Interest();
    template.setInterestLifetimeMilliseconds(sync_lifetime);
    face.expressInterest(n, template, this.onData.bind(this), this.syncTimeout.bind(this));
    console.log("Syncinterest expressed:");
    console.log(n.toUri());
};
