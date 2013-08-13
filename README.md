ChronoChat-js
=============

ChronoChat-js is a javacript version of ChronoChat based on NDN-js and ChronoSync. It is compatible with desktop version of ChronoChat (https://github.com/named-data/ChronoChat).

Get Started
-----------

ChronoChat-js does not require any installation. Just open the file: chrono.html on a browser, input user name and chatroom name, and then start chatting.


Namespace
---------
Sync Interest:'/ndn/broadcast/ChronoChat-0.3/'+chatroom+/digest

Chat Interest:local-prefix+/chatroom+/random-generated-name+/session-number+/seqno


File Structure
--------------

There are five major parts in the source code package:

1.NDN.JS

* ndn.js: NDN.JS library source code

2.ChronoSync

* Sync.js: sync interest and data processing
* digest_tree.js: digest tree in ChronoSync

3.ChronoChat

* Chat.js: chat interest and data processing as well as other action like leave and heartbeat
* start.js: initialization of the application

4.Protobuf

* sync_state.js: sync data packet format definition
* chatbuf.js: chat data packet format definition
* Protobuf/: the ProtoBuf.js library source code 

5.Webpage

* chrono.html: web chat interface
* page.css: css file of the web page


Dependencies
------------

ChronoChat-js uses NDN.JS library by Wentao Shang (https://github.com/wentaoshang/NDN.JS) and ProtoBuf.js library (https://github.com/dcodeIO/ProtoBuf.js/).

Notice
------

ChronoChat-js currently does not perform any data authentication. The private key used to encrypt user data packets is hard-coded in NDN.JS and shared by all the users on the Web.


ChronoSync API
--------------

TBD.

Contact Info
------------

Qiuhan Ding: dingqiuhan@gmail.com

Wentao Shang: wentaoshang@gmail.com
