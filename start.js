/**
 *   Copyright (C) 2013 Regents of the University of California 
 *   Authors:   Qiuhan Ding <dingqiuhan@gmail.com>, Wentao Shang <wentaoshang@gmail.com>
 *   BSD License, see LICENSE file. 
 *   
 *   Start NDN And Initialize Variables. The Prefix for Chat Interest Name is fetched through auto configure
 *   
 */

function ChronoChat () {
    prefix_name = getRandomString();
    chat = new Chat();
    sync = new ChronoSync(chat.sendInterest.bind(chat),chat.initial.bind(chat),chatroom,session);
    sync.digest_log.push({digest:"00",data:[]});
    ndn = new NDN({host:'B.ws.ndn.ucla.edu'});
    mykey = ndn.getDefaultKey();
    mykeyname= new Name('/ndn/'+screen_name+'/'+'ChronoChat-0.3/'+chatroom+'/key/').appendKeyID(mykey).appendVersion().appendSegment(0);

    ndn.onopen = function () {
	//Getting Routable Chat Name Prefix Through Auto Configure
        var n0 = new Name('/local/ndn/prefix');
	var template = new Interest();
        template.interestLifetime = 1000;
        template.childSelector = 1;
        template.answerOriginKind = 0;
        ndn.expressInterest(n0, template, prefixData, prefixTimeOut);

    };
    ndn.connect();
    
    console.log('Started...');
    
}

//Enable sending msg by pressing 'Enter'
function checkkey(event){
    if(event.keyCode==13){
	chat.SendMessage();
    }
}

function prefixData(inst,co){
    console.log("prefix ContentObject received in callback");
    console.log('name'+co.name.to_uri());
    chat_prefix = DataUtils.toString(co.content).trim()+'/'+chatroom+'/'+prefix_name;
    sync.chat_prefix = chat_prefix;
    var n1 = new Name(sync.prefix+chatroom+'/');
    ndn.registerPrefix(n1,sync.onInterest.bind(sync));
    console.log('sync prefix registered.');

    var n2 = new Name(chat_prefix);
    ndn.registerPrefix(n2,chat.onInterest.bind(chat));
    console.log('data prefix registered.');
    var n = new Name(sync.prefix+chatroom+'/00');
    var template = new Interest();
    template.interestLifetime = 1000;
    template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    ndn.expressInterest(n, template, sync.onData.bind(sync), sync.initialTimeOut.bind(sync));
    console.log("initial sync express");
    console.log(n.to_uri());
     
}

function prefixTimeOut(inst){
    console.log("prefix Interest time out");
    console.log('name'+inst.name.to_uri());
};
