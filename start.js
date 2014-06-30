/**
 *   Copyright (C) 2013 Regents of the University of California 
 *   Authors:   Qiuhan Ding <dingqiuhan@gmail.com>, Wentao Shang <wentaoshang@gmail.com>
 *   BSD License, see LICENSE file. 
 *   
 *   Start NDN And Initialize Variables. 
 *   The prefix for chat interest name is fetched through auto configure by sending interest to '/local/ndn/prefix'
 *   
 */

function ChronoChat () {
    prefix_name = getRandomString();
    chat = new Chat();
    sync = new ChronoSync(chat.sendInterest.bind(chat),chat.initial.bind(chat),chatroom,session);
    sync.digest_log.push({digest:"00",data:[]});
    face = new Face({host:hub});

    //Getting Routable Chat Name Prefix Through Auto Configure
        var n0 = new Name('/local/ndn/prefix');
    var template = new Interest();
        template.interestLifetime = 1000;
        template.childSelector = 1;
        template.answerOriginKind = 0;
        face.expressInterest(n0, template, prefixData, prefixTimeOut);

    
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
    console.log('name'+co.getName().toUri());
    chat_prefix = DataUtils.toString(co.getContent().buf()).trim()+'/'+chatroom+'/'+prefix_name;
    sync.chat_prefix = chat_prefix;
    var n1 = new Name(sync.prefix+chatroom+'/');
    face.registerPrefix(n1,sync.onInterest.bind(sync));
    console.log('sync prefix registered.');

    var n2 = new Name(chat_prefix);
    face.registerPrefix(n2,chat.onInterest.bind(chat));
    console.log('data prefix registered.');
    var n = new Name(sync.prefix+chatroom+'/00');
    var template = new Interest();
    template.interestLifetime = 1000;
    template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    face.expressInterest(n, template, sync.onData.bind(sync), sync.initialTimeOut.bind(sync));
    console.log("initial sync express");
    console.log(n.toUri());
     
}

function prefixTimeOut(inst){
    console.log("prefix Interest time out");
    console.log('name'+inst.getName().toUri());
};
