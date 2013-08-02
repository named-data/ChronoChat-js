var sync_timeout = function(interest) {
        console.log("Sync Interest time out.");
        console.log('Sync Interest name: ' + interest.name.to_uri());
	var component;
	if(interest.name.components.length<5){
		component = "";
	}
	else{
		component = DataUtils.toHex(interest.name.components[4]);
	}
	console.log(component);
	if(component == digest_tree.root){
	  	var n = new Name(interest.name);
	  	var template = new Interest();
	  	//template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
	  	template.interestLifetime = 10000;
	  	ndn.expressInterest(n, template, onSyncData, sync_timeout);
		console.log("Syncinterest expressed:");
	        //console.log(template.name.to_uri());
	}                  
};

var chat_timeout = function(interest){
    console.log("no chat data coming back");
};

var initial_timeout = function(interest){
    console.log("initial timeout");
    console.log("no other people");
    digest_tree.initial();
    var newlog = {digest:digest_tree.root, data:[{name:usrname,seqno:usrseq}]};
    digest_log.push(newlog);
    console.log("addlog:"+digest_tree.root);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var template = new Interest();
    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, onSyncData, sync_timeout);
    console.log("Syncinterest expressed:");
    //console.log(template.name.to_uri());
    var myVar = setInterval(function(){heartbeat();},60000);
};
